#!/usr/bin/env python3
"""Let 「资料更新」 (formerly 「探戈助理答复」) PRs run side by side instead of one at a time (Shiao 2026-11-18).

Before: while one inbox-run-* PR waited for Shiao, every new answer waited behind it.
Now a new run handles only the answers no open PR has taken, safe PRs still go live,
and a PR that waits gets its event JSON brought up to date when main moves on.

  python3 tools/inbox_queue.py claimed BR...            answers (data/inbox/*.md) that open PRs already took
  python3 tools/inbox_queue.py todo BR...               answers still to do (in data/inbox/, not taken)
  python3 tools/inbox_queue.py cards REF                card ids REF changed, against its merge-base with origin/main
  python3 tools/inbox_queue.py refresh BR               merge origin/main into branch BR (checked out); event JSON
                                                        conflicts are solved card by card; exit 3 if something else conflicts

Branch arguments are remote-tracking refs like origin/inbox-run-123.
"""
import json, os, subprocess, sys

FILES = ['asia/events.json', 'asia/events-core.json', 'asia/events-more.json']
DRAFT = 'data/entities-draft/'


def git(*a, check=True):
    r = subprocess.run(['git', *a], capture_output=True, text=True)
    if check and r.returncode != 0:
        raise SystemExit(f'git {" ".join(a)} failed: {r.stderr.strip()}')
    return r.stdout


def inbox_md(ref=None):
    """Answer files in data/inbox/ (not done/, not README) on a ref, or in the work tree."""
    if ref:
        out = git('ls-tree', '--name-only', f'{ref}:data/inbox/', check=False)
        names = out.split()
    else:
        names = os.listdir('data/inbox') if os.path.isdir('data/inbox') else []
    return sorted(n for n in names if n.endswith('.md') and n != 'README.md')


def claimed(branches, main='origin/main'):
    """An open PR has taken an answer when the PR moved it out of data/inbox/ (it was there at the
    PR's merge base and is gone on the PR). Answers that reached main after the PR branched are
    not taken (2026-11-20: the monthly stale-check answer was skipped this way)."""
    on_main = set(inbox_md(main))
    taken = set()
    for br in branches:
        mb = git('merge-base', main, br, check=False).strip()
        before = set(inbox_md(mb)) if mb else on_main
        taken |= (before - set(inbox_md(br))) & on_main
    return sorted(taken)


def load(ref, path):
    r = subprocess.run(['git', 'show', f'{ref}:{path}'], capture_output=True, text=True)
    if r.returncode != 0:
        return None
    return r.stdout


def rows(text):
    d = json.loads(text)
    return d if isinstance(d, list) else d.get('events', [])


def by_id(text):
    return {e.get('id'): e for e in rows(text)} if text else {}


def changed_cards(ref, main='origin/main'):
    mb = git('merge-base', main, ref).strip()
    ids = set()
    for f in FILES:
        a, b = by_id(load(mb, f)), by_id(load(ref, f))
        for k in set(a) | set(b):
            if a.get(k) != b.get(k):
                ids.add(k)
    return sorted(i for i in ids if i)


def dump(data, like):
    out = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    return out + ('\n' if like.endswith('\n') else '')


def apply_cards(main_text, mb_text, br_text):
    """main's file plus the branch's own card changes (added, edited, removed), main's order kept."""
    main_d = json.loads(main_text)
    lst = main_d if isinstance(main_d, list) else main_d['events']
    mine_old, mine_new = by_id(mb_text), by_id(br_text)
    gone = {k for k in mine_old if k not in mine_new}
    edits = {k: v for k, v in mine_new.items() if mine_old.get(k) != v}
    out, seen = [], set()
    for e in lst:
        k = e.get('id')
        if k in gone:
            continue
        out.append(edits.get(k, e))
        seen.add(k)
    for k, v in mine_new.items():          # cards the branch added, in the branch's order
        if k in edits and k not in seen:
            out.append(v)
    if isinstance(main_d, list):
        return dump(out, main_text)
    main_d['events'] = out
    return dump(main_d, main_text)


def refresh(br, main='origin/main'):
    """Run inside a checkout of the PR branch. Leaves a merge commit, or exits 3."""
    mb = git('merge-base', main, 'HEAD').strip()
    r = subprocess.run(['git', 'merge', '--no-ff', '--no-commit', main], capture_output=True, text=True)
    conflicts = git('diff', '--name-only', '--diff-filter=U').split()
    for f in FILES:
        m, b, h = load(main, f), load(mb, f), load('HEAD', f)
        if m is None or h is None:
            continue
        with open(f, 'w', encoding='utf-8') as fh:
            fh.write(apply_cards(m, b or '[]', h))
        git('add', f)
    other = [c for c in conflicts if c not in FILES and not c.startswith(DRAFT)]
    if other:
        git('merge', '--abort', check=False)
        print('cannot solve: ' + ', '.join(other))
        sys.exit(3)
    if any(c.startswith(DRAFT) for c in conflicts):
        # The draft lists are generated from the event files: take main's, then rebuild.
        for c in conflicts:
            if c.startswith(DRAFT):
                git('checkout', '--theirs', '--', c)
        subprocess.run([sys.executable, 'tools/draft_entities.py'], check=True)
        git('add', DRAFT)
    for f in FILES:
        json.load(open(f, encoding='utf-8'))
    git('commit', '-q', '--no-edit', '-m', f'Bring {br} up to date with main (event JSON merged card by card)')
    print('refreshed')


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    cmd, args = sys.argv[1], sys.argv[2:]
    if cmd == 'claimed':
        print('\n'.join(claimed(args)))
    elif cmd == 'todo':
        taken = set(claimed(args))
        print('\n'.join(n for n in inbox_md('origin/main') if n not in taken))
    elif cmd == 'cards':
        print('\n'.join(changed_cards(args[0])))
    elif cmd == 'refresh':
        refresh(args[0])
    else:
        print(__doc__)
        sys.exit(2)


if __name__ == '__main__':
    main()

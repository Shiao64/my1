#!/usr/bin/env python3
"""Tests for tools/inbox_queue.py in a throwaway git repo with a bare 'origin'."""
import json, os, shutil, subprocess, sys, tempfile

TOOL = os.path.abspath(os.path.join(os.path.dirname(__file__), 'inbox_queue.py'))
FILES = ['asia/events.json', 'asia/events-core.json', 'asia/events-more.json']


def sh(*a, cwd, check=True):
    r = subprocess.run(list(a), cwd=cwd, capture_output=True, text=True)
    if check and r.returncode != 0:
        raise AssertionError(f'{a}: {r.stdout}{r.stderr}')
    return r


def write_cards(root, cards):
    for f in FILES:
        text = json.dumps(cards, ensure_ascii=False, separators=(',', ':'))
        if f.endswith('more.json'):
            text += '\n'
        with open(os.path.join(root, f), 'w', encoding='utf-8') as fh:
            fh.write(text)


def read_cards(root, f='asia/events.json'):
    return json.load(open(os.path.join(root, f), encoding='utf-8'))


def commit(root, msg):
    sh('git', 'add', '-A', cwd=root)
    sh('git', 'commit', '-qm', msg, cwd=root)


def q(root, *args, check=True):
    return sh(sys.executable, TOOL, *args, cwd=root, check=check)


def main():
    tmp = tempfile.mkdtemp()
    try:
        origin, w = os.path.join(tmp, 'origin.git'), os.path.join(tmp, 'w')
        sh('git', 'init', '-q', '--bare', '-b', 'main', origin, cwd=tmp)
        sh('git', 'clone', '-q', origin, w, cwd=tmp)
        for k, v in (('user.name', 't'), ('user.email', 't@example.invalid')):
            sh('git', 'config', k, v, cwd=w)
        sh('git', 'checkout', '-q', '-b', 'main', cwd=w)
        os.makedirs(os.path.join(w, 'asia'))
        os.makedirs(os.path.join(w, 'data/inbox/done'))
        open(os.path.join(w, 'data/inbox/README.md'), 'w').write('x')
        for n in ('a.md', 'b.md', 'c.md'):
            open(os.path.join(w, 'data/inbox', n), 'w').write(n)
        write_cards(w, [{'id': 'A', 'v': 1}, {'id': 'B', 'v': 1}, {'id': 'C', 'v': 1}])
        commit(w, 'base')
        sh('git', 'push', '-q', 'origin', 'main', cwd=w)

        # PR 1 took a.md and changed card A (+ added card N).
        sh('git', 'checkout', '-q', '-b', 'inbox-run-1', cwd=w)
        sh('git', 'mv', 'data/inbox/a.md', 'data/inbox/done/a.md', cwd=w)
        write_cards(w, [{'id': 'A', 'v': 2}, {'id': 'B', 'v': 1}, {'id': 'C', 'v': 1}, {'id': 'N', 'v': 1}])
        commit(w, 'pr1')
        sh('git', 'push', '-q', 'origin', 'inbox-run-1', cwd=w)
        sh('git', 'checkout', '-q', 'main', cwd=w)
        sh('git', 'fetch', '-q', 'origin', cwd=w)

        assert q(w, 'claimed', 'origin/inbox-run-1').stdout.split() == ['a.md'], 'claimed'
        assert q(w, 'todo', 'origin/inbox-run-1').stdout.split() == ['b.md', 'c.md'], 'todo'
        assert q(w, 'todo').stdout.split() == ['a.md', 'b.md', 'c.md'], 'todo without open PRs'
        assert q(w, 'cards', 'origin/inbox-run-1').stdout.split() == ['A', 'N'], 'cards'

        # Main moves on: card B changes and card C is removed (another PR went live).
        write_cards(w, [{'id': 'A', 'v': 1}, {'id': 'B', 'v': 9}])
        os.makedirs(os.path.join(w, 'data/inbox/done'), exist_ok=True)
        sh('git', 'mv', 'data/inbox/b.md', 'data/inbox/done/b.md', cwd=w)
        commit(w, 'main moves')
        sh('git', 'push', '-q', 'origin', 'main', cwd=w)
        sh('git', 'fetch', '-q', 'origin', cwd=w)
        assert q(w, 'todo', 'origin/inbox-run-1').stdout.split() == ['c.md'], 'todo after main moved'

        # A new answer reaching main after PR 1 branched is still to do, not taken by PR 1.
        open(os.path.join(w, 'data/inbox/d.md'), 'w').write('d')
        commit(w, 'new answer')
        sh('git', 'push', '-q', 'origin', 'main', cwd=w)
        sh('git', 'fetch', '-q', 'origin', cwd=w)
        assert q(w, 'claimed', 'origin/inbox-run-1').stdout.split() == ['a.md'], 'd.md not claimed by PR 1'
        assert q(w, 'todo', 'origin/inbox-run-1').stdout.split() == ['c.md', 'd.md'], 'new answer is todo'

        # Refresh PR 1: keeps its own A and N, takes main's B, and C stays removed.
        sh('git', 'checkout', '-q', '-B', 'inbox-run-1', 'origin/inbox-run-1', cwd=w)
        r = q(w, 'refresh', 'inbox-run-1')
        assert 'refreshed' in r.stdout, r.stdout + r.stderr
        for f in FILES:
            got = read_cards(w, f)
            assert got == [{'id': 'A', 'v': 2}, {'id': 'B', 'v': 9}, {'id': 'N', 'v': 1}], (f, got)
        assert open(os.path.join(w, 'asia/events-more.json')).read().endswith('\n'), 'trailing newline kept'
        assert not open(os.path.join(w, 'asia/events.json')).read().endswith('\n'), 'no newline added'
        sh('git', 'merge-base', '--is-ancestor', 'origin/main', 'HEAD', cwd=w)

        # A conflict outside the event JSON is left for a person (exit 3, merge aborted).
        sh('git', 'checkout', '-q', 'main', cwd=w)
        open(os.path.join(w, 'note.txt'), 'w').write('main')
        commit(w, 'main note')
        sh('git', 'push', '-q', 'origin', 'main', cwd=w)
        sh('git', 'checkout', '-q', 'inbox-run-1', cwd=w)
        open(os.path.join(w, 'note.txt'), 'w').write('branch')
        commit(w, 'branch note')
        sh('git', 'fetch', '-q', 'origin', cwd=w)
        r = q(w, 'refresh', 'inbox-run-1', check=False)
        assert r.returncode == 3 and 'note.txt' in r.stdout, r.stdout + r.stderr
        st = sh('git', 'status', '--porcelain', cwd=w).stdout
        assert st.strip() == '', 'merge aborted cleanly: ' + st
        print('ok 14 checks')
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == '__main__':
    main()

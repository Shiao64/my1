#!/usr/bin/env python3
"""Repair past posters (posters_past) so every one can be shown. 2026-11-18, Shiao.

For each card's posters_past entry:
  - text posters made by ensure_posters.py (path under /posters/generated/, or a
    file with the same bytes as one) are taken out of posters_past (file kept);
  - an undated entry whose bytes equal another poster of the same card that has a
    date takes that date (poster_dates) and DJ (poster_djs);
  - missing list/card thumbs are made, and ATM_TH gets the size;
  - an entry whose image file is gone is taken out (Shiao 2026-11-18: a past
    poster that cannot be shown is deleted, not kept).
Run daily by .github/workflows/poster-prune.yml after the expiry cleanup.

Usage:
  python3 tools/fix_past_posters.py            # show what would change
  python3 tools/fix_past_posters.py --apply    # write
"""
import hashlib
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import radar_poster_update as rpu  # noqa: E402

FILES = ['asia/events.json', 'asia/events-core.json', 'asia/events-more.json']


def fs(web):
    return os.path.join(ROOT, web.split('?', 1)[0].lstrip('/'))


def digest(web):
    p = fs(web)
    if not os.path.isfile(p):
        return None
    with open(p, 'rb') as fh:
        return hashlib.sha256(fh.read()).hexdigest()


def has_thumbs(web):
    base = os.path.splitext(web.split('?', 1)[0])[0]
    return all(os.path.isfile(os.path.join(ROOT, f + base + '.webp')) for f in ('images/thumb', 'images/thumb800'))


_GEN = None


def generated_hashes():
    global _GEN
    if _GEN is None:
        _GEN = set()
        gen = os.path.join(ROOT, 'images/asia/posters/generated')
        if os.path.isdir(gen):
            for name in os.listdir(gen):
                p = os.path.join(gen, name)
                if os.path.isfile(p):
                    with open(p, 'rb') as fh:
                        _GEN.add(hashlib.sha256(fh.read()).hexdigest())
    return _GEN


def plan_card(e):
    """Return (new_event, notes, thumbs_needed)."""
    past = e.get('posters_past')
    if not isinstance(past, list) or not past:
        return None, [], []
    dates = dict(e.get('poster_dates') or {})
    djs = dict(e.get('poster_djs') or {})
    gen_hashes = generated_hashes()
    others = {}
    for k in list(dates) + [e.get('poster') or '']:
        k = k.split('?', 1)[0]
        h = digest(k) if k else None
        if h:
            others.setdefault(h, []).append(k)
    notes, keep, thumbs = [], [], []
    for p in past:
        key = p.split('?', 1)[0]
        h = digest(key)
        if not h:
            notes.append('drop missing file %s' % key)
            continue
        if rpu.is_generated_poster(key) or (h and h in gen_hashes):
            notes.append('drop text poster %s' % key)
            continue
        if key not in dates and h:
            for twin in others.get(h, []):
                if twin != key and dates.get(twin):
                    dates[key] = dates[twin]
                    notes.append('date %s <- %s (%s)' % (key, twin, dates[twin]))
                    if twin in djs and key not in djs:
                        djs[key] = djs[twin]
                    break
        if not has_thumbs(key) and os.path.isfile(fs(key)):
            thumbs.append(key)
            notes.append('thumbs %s' % key)
        keep.append(p)
    if not notes:
        return None, [], []
    new = dict(e)
    new['posters_past'] = keep
    if dates:
        new['poster_dates'] = dates
    if djs:
        new['poster_djs'] = djs
    return new, notes, thumbs


def main(argv):
    apply = '--apply' in argv
    data = {}
    for f in FILES:
        with open(os.path.join(ROOT, f), encoding='utf-8') as fh:
            raw = fh.read()
        data[f] = (json.loads(raw), raw.endswith('\n'))
    fixed = {}
    for f, (rows, _) in data.items():
        for e in rows:
            if e['id'] in fixed:
                continue
            new, notes, thumbs = plan_card(e)
            if new:
                fixed[e['id']] = (new, notes, thumbs)
    for cid, (_, notes, _) in fixed.items():
        for n in notes:
            print(cid, n)
    if not fixed:
        print('nothing to fix')
        return 0
    if not apply:
        print('(dry run; add --apply to write)')
        return 0
    done = set()
    for cid, (new, _, thumbs) in fixed.items():
        for web in thumbs:
            if web in done:
                continue
            size = rpu.write_thumbs(ROOT, web)
            rpu.update_atm_th(ROOT, web, size)
            done.add(web)
    for f, (rows, nl) in data.items():
        changed = False
        for i, e in enumerate(rows):
            if e['id'] in fixed:
                n = fixed[e['id']][0]
                for k in ('posters_past', 'poster_dates', 'poster_djs'):
                    if k in n:
                        e[k] = n[k]
                changed = True
        if changed:
            with open(os.path.join(ROOT, f), 'w', encoding='utf-8') as fh:
                fh.write(json.dumps(rows, ensure_ascii=False, separators=(',', ':')) + ('\n' if nl else ''))
    print('applied', len(fixed), 'cards')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))

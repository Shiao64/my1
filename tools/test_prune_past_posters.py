#!/usr/bin/env python3
"""Past-poster rule: at most 4, none older than 30 days, undated stay. Run: python3 tools/test_prune_past_posters.py"""
import datetime
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import prune_past_posters as PR
import radar_poster_update as P

TODAY = datetime.date(2026, 11, 17)


def check(name, ok):
    print(('ok  ' if ok else 'FAIL') + ' ' + name)
    if not ok:
        raise SystemExit(1)


def main():
    c = {'id': 'X1', 'poster': '/cur.jpg', 'posters_past': ['/a-2026-11-10.jpg', '/b-2026-10-10.jpg', '/c.jpg']}
    dropped = PR.prune_card(c, TODAY)
    check('old dated dropped', dropped == ['/b-2026-10-10.jpg'])
    check('recent + undated stay', c['posters_past'] == ['/a-2026-11-10.jpg', '/c.jpg'])

    c = {'id': 'X2', 'poster': '/cur.jpg', 'posters_past': ['/a-2026-10-17.jpg']}
    check('31 days old dropped', PR.prune_card(c, TODAY) == ['/a-2026-10-17.jpg'])
    c = {'id': 'X2b', 'poster': '/cur.jpg', 'posters_past': ['/a-2026-10-18.jpg']}
    check('30 days old stays', PR.prune_card(c, TODAY) == [])

    c = {'id': 'X3', 'poster': '/cur.jpg', 'posters_past': ['/a-2026-11-%02d.jpg' % d for d in (1, 5, 8, 10, 12)]}
    dropped = PR.prune_card(c, TODAY)
    check('max 4: oldest dropped', dropped == ['/a-2026-11-01.jpg'] and len(c['posters_past']) == 4)

    c = {'id': 'X4', 'posters_past': ['/a-2026-09-01.jpg', '/b-2026-09-20.jpg']}
    dropped = PR.prune_card(c, TODAY)
    check('no current poster: newest past kept', c['posters_past'] == ['/b-2026-09-20.jpg'] and dropped == ['/a-2026-09-01.jpg'])

    c = {'id': 'X5', 'poster': '/cur.jpg', 'posters_past': ['/p.jpg'], 'poster_dates': {'/p.jpg': '2026-08-01'}}
    check('recorded date counts', PR.prune_card(c, TODAY) == ['/p.jpg'])

    c = {'id': 'X6', 'poster': '/cur.jpg', 'posters_past': ['/R009.jpg', '/x-20261104T012604Z.jpg']}
    check('undated stay', PR.prune_card(c, TODAY) == [] and len(c['posters_past']) == 2)

    kept, dropped = P.trim_past(['/a-2026-01-01.jpg'], 4)
    check('trim_past without max_age unchanged', dropped == [])


if __name__ == '__main__':
    main()

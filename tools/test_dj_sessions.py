#!/usr/bin/env python3
"""Tests for tools/dj_sessions.py (DJ session log)."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dj_sessions as D
bad = 0
def check(name, ok):
    global bad
    print(('ok   ' if ok else 'FAIL ') + name); bad += (not ok)
check('date from name', D.date_in('/x/R202-no42-20261010.jpg') == '2026-10-10')
check('date with dashes', D.date_in('/x/NmkWjMxo_2026-11-08.jpg') == '2026-11-08')
check('upload timestamp is not a date', D.date_in('/x/past/rccbKIYP-20261120T163329Z.jpg') == '')
check('split names', D.split('DJ A & B、C') == ['A', 'B', 'C'])
check('DJ2 prefix dropped', D.clean('DJ2 Sophie (Guangzhou)') == 'Sophie (Guangzhou)')
check('city suffix ignored in key', D.key('Jessie (SH)') == D.key('jessie'))
ev = [{'id': 'X', 'kind': 'weekly', 'name': 'M', 'city': 'Beijing', 'poster': '/p/X.jpg', 'poster_date': '2026-11-03', 'dj': 'Ann',
       'poster_djs': {'/p/X.jpg': 'Ann', '/p/X-20261027.jpg': 'Bob', '/p/X-nodate.jpg': 'Cat'}, 'poster_dates': {'/p/X.jpg': '2026-11-03'}},
      {'id': 'F', 'kind': 'event', 'name': 'Fest', 'city': 'Daegu', 'dj': ['刘峥'], 'dj_en': ['Liu Zheng'],
       'schedule': [{'date': '2027-05-02', 'dj': 'Liu Zheng'}, {'date': '2027-05-02', 'dj': 'Liu Zheng'}]}]
log = []
D.add(log, D.rows_from(ev, 't'))
got = sorted((r['date'], r['dj'], r['event']) for r in log)
check('rows: dated posters + weekly dj + schedule, deduped, undated skipped',
      got == [('2026-10-27', 'Bob', 'X'), ('2026-11-03', 'Ann', 'X'), ('2027-05-02', '刘峥', 'F')])
check('add is idempotent', D.add(log, D.rows_from(ev, 't')) == 0)
check('one night counts once', len(D.nights([{'date': '2026-01-01', 'event': 'A'}, {'date': '2026-01-01', 'event': 'A'}, {'date': '2026-01-08', 'event': 'A'}])) == 2)
one = [{'id': 'O', 'kind': 'event', 'name': 'Halloween', 'city': 'Beijing', 'start': '2026-11-01', 'end': '2026-11-01', 'dj': 'Tayfun'},
       {'id': 'M', 'kind': 'event', 'name': 'Weekend', 'city': 'Beijing', 'start': '2026-12-03', 'end': '2026-12-07', 'dj': ['A', 'B']},
       {'id': 'R', 'kind': 'event', 'name': 'Res', 'city': 'Hong Kong', 'start': '2026-11-02', 'dj': 'Resident DJ（Ken Wong, SC Lee）'},
       {'id': 'P', 'kind': 'event', 'name': 'Posters', 'city': 'Beijing', 'start': '2026-11-08', 'dj': 'Cat', 'poster_djs': {'/p/P-20261108.jpg': 'Cat'}}]
got = sorted((r['date'], r['dj'], r['event'], r['src'].split()[-1]) for r in D.rows_from(one, 't'))
check('one-day one-off dj = one night on its date; multi-day without schedule skipped; poster DJs win',
      got == [('2026-11-01', 'Tayfun', 'O', 'dj'), ('2026-11-08', 'Cat', 'P', 'P-20261108.jpg')])
p = D.People(); p.join(['刘峥', 'Liu Zheng'])
check('aliases joined', p.find(D.key('Liu Zheng')) == p.find(D.key('刘峥')))
print('FAILED %d' % bad if bad else 'all ok'); sys.exit(1 if bad else 0)

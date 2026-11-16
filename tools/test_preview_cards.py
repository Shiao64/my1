#!/usr/bin/env python3
"""Checks for the five 2026-11-16 preview cards. Does not call the network."""
import json, os, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
FILES = {
    'asia/events.json': {'E188', 'E189', 'E190', 'E191', 'E192'},
    'asia/events-core.json': {'E188', 'E189', 'E191', 'E192'},
    'asia/events-more.json': {'E190'},
}
WANT = {
    'E188': dict(name='Alejandra Mantinan Beijing Workshop', city='Beijing', region='China', type='workshop', start='2027-03-02', end='2027-03-09'),
    'E189': dict(name='【Tango Caravan 大篷车】第3站 - 莫干山', city='Moganshan', region='China', start='2027-04-09', end='2027-04-11'),
    'E190': dict(name='Jakarta Championship', city='Jakarta', region='Indonesia', type='festival', start='2027-06-10', end='2027-06-12'),
    'E191': dict(name='Alejandra martinan Workshop', city='Taipei', region='Taiwan', type='workshop', start='2027-03-24', end='2027-03-30'),
    'E192': dict(name='Lucas y Naima Workshop', city='Beijing', region='China', type='workshop', start='2027-05-10', end='2027-05-17'),
}
EMPTY = ('venue', 'venue_en', 'venue_address', 'venue_address_en', 'organizers', 'organizers_en', 'price', 'dj', 'contacts')

def load(rel):
    with open(os.path.join(ROOT, rel), encoding='utf-8') as fh:
        return json.load(fh)

def main():
    bad = []
    by = {}
    for rel, expect in FILES.items():
        rows = load(rel)
        got = {e['id']: e for e in rows if e.get('id') in WANT}
        extra = sorted(set(got) - expect)
        missing = sorted(expect - set(got))
        if extra or missing:
            bad.append(f'{rel} ids extra={extra} missing={missing}')
        for i, e in got.items():
            by.setdefault(i, e)
    for i, spec in WANT.items():
        e = by.get(i)
        if not e:
            bad.append('missing ' + i)
            continue
        if e.get('preview') is not True:
            bad.append(i + ' preview flag')
        if e.get('kind') != 'event' or e.get('hidden') is True:
            bad.append(i + ' kind/hidden')
        if 'type' not in spec and e.get('type'):
            bad.append(i + ' type was guessed: ' + str(e.get('type')))
        for k, v in spec.items():
            if e.get(k) != v:
                bad.append(f'{i} {k}={e.get(k)!r} want {v!r}')
        for k in EMPTY:
            if e.get(k):
                bad.append(f'{i} filled {k}')
        poster = e.get('poster') or ''
        if not poster.startswith('/images/asia/posters/generated/' + i):
            bad.append(i + ' poster ' + poster)
        path = os.path.join(ROOT, poster.lstrip('/').split('?')[0])
        if not os.path.isfile(path):
            bad.append(i + ' poster file missing')
    e188 = by.get('E188') or {}
    if '北京 AS' not in (e188.get('note_zh') or '') or e188.get('organizers'):
        bad.append('E188 AS note/organizer')
    e191 = by.get('E191') or {}
    if 'martinan' not in e191.get('name', '') or 'Mantinan' in e191.get('name', ''):
        bad.append('E191 spelling')
    e192 = by.get('E192') or {}
    if '北京 AS' in json.dumps({k: e192.get(k) for k in ('name', 'venue', 'organizers')}, ensure_ascii=False):
        bad.append('E192 reused 北京 AS')
    road = next((e for e in load('asia/events.json') if e.get('id') == 'R0E9XeyL'), None)
    if not road or road.get('city') != 'Shanghai' or '莫干山路' not in (road.get('venue_address') or ''):
        bad.append('R0E9XeyL changed or missing')
    if bad:
        print('\n'.join(bad))
        return 1
    print('preview cards ok', ' '.join(WANT))
    return 0

if __name__ == '__main__':
    sys.exit(main())

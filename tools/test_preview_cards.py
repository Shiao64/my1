#!/usr/bin/env python3
"""Checks for the five 2026-11-16 preview cards. Does not call the network."""
import json, os, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
FILES = {
    'asia/events.json': {'E188', 'E189', 'E190', 'E191', 'E192'},
    'asia/events-core.json': {'E188', 'E189', 'E190', 'E191', 'E192'},
    'asia/events-more.json': set(),
}
WANT = {
    'E188': dict(name='Alejandra Mantinan Beijing Workshop', city='Beijing', region='China', type='workshop', start='2027-03-02', end='2027-03-09'),
    'E189': dict(name='【Tango Caravan 大篷车】第3站 - 莫干山', city='Moganshan', region='China', start='2027-04-09', end='2027-04-11'),
    'E190': dict(name='Jakarta Championship', city='Jakarta', region='Indonesia', type='festival', start='2027-06-10', end='2027-06-12'),
    'E191': dict(name='Alejandra martinan Workshop', city='Taipei', region='Taiwan', type='workshop', start='2027-03-24', end='2027-03-30'),
    'E192': dict(name='Lucas y Naima Workshop', city='Beijing', region='China', type='workshop', start='2027-05-10', end='2027-05-17'),
}
EMPTY = ('venue', 'venue_en', 'venue_address', 'venue_address_en', 'price', 'dj', 'contacts')

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
        given = {'E188': ['AS Tango阿根廷探戈学校'], 'E192': ['王萌']}
        if i in given:
            if e.get('organizers') != given[i]:
                bad.append(i + ' organizer ' + repr(e.get('organizers')))
        elif e.get('organizers'):
            bad.append(i + ' organizer was not given')
        if e.get('organizers_en'):
            bad.append(i + ' invented organizers_en')
        poster = e.get('poster') or ''
        if not poster.startswith('/images/asia/posters/generated/' + i):
            bad.append(i + ' poster ' + poster)
        path = os.path.join(ROOT, poster.lstrip('/').split('?')[0])
        if not os.path.isfile(path):
            bad.append(i + ' poster file missing')
    e188 = by.get('E188') or {}
    PUBLIC = '活动预告，详情待公布。'
    PUBLIC_EN = 'Preview. Details to be announced.'
    PUBLIC_KO = '예고. 자세한 내용은 추후 공개.'
    PUBLIC_ES = 'Anuncio. Los detalles se anunciarán más adelante.'
    leak = ('北京 AS', 'R0E9XeyL', '未提供', '尚未', '不要套用', '不是主办海报', '原拼写', '未找到原卡')
    for i, e in by.items():
        if e.get('note_zh') != PUBLIC or e.get('note') != PUBLIC_EN or e.get('note_ko') != PUBLIC_KO or e.get('note_es') != PUBLIC_ES:
            bad.append(i + ' public note is not the short preview')
        blob = (e.get('note_zh') or '') + (e.get('note') or '')
        if any(s in blob for s in leak):
            bad.append(i + ' leaked internal note')
    e191 = by.get('E191') or {}
    if e191.get('name') != 'Alejandra martinan Workshop':
        bad.append('E191 spelling')
    e192 = by.get('E192') or {}
    if e192.get('name') != 'Lucas y Naima Workshop' or e192.get('start') != '2027-05-10' or e192.get('end') != '2027-05-17':
        bad.append('E192 name or dates')
    if e192.get('organizers') != ['王萌'] or e192.get('organizers_en'):
        bad.append('E192 organizer')
    if e192.get('city') != 'Beijing':
        bad.append('E192 city')
    if e188.get('organizers') != ['AS Tango阿根廷探戈学校'] or e188.get('organizers_en') or e188.get('city') != 'Beijing':
        bad.append('E188 organizer or city')
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

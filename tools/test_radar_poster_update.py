#!/usr/bin/env python3
"""Safety tests for the radar 异动 poster step. Run: python3 tools/test_radar_poster_update.py"""
import datetime
import json
import os
import shutil
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import radar_poster_update as P
import radar_yidong as Y

from PIL import Image


def jpeg(path, color=(180, 40, 40), size=(120, 200)):
    Image.new('RGB', size, color).save(path, 'JPEG', quality=85)


def fixture(tmp):
    os.makedirs(os.path.join(tmp, 'asia'), exist_ok=True)
    os.makedirs(os.path.join(tmp, 'images/asia/posters'), exist_ok=True)
    os.makedirs(os.path.join(tmp, 'images/thumb/images/asia/posters'), exist_ok=True)
    old = os.path.join(tmp, 'images/asia/posters/old.jpg')
    jpeg(old, (10, 20, 30))
    events = [
        {'id': 'R030', 'kind': 'weekly', 'type': 'milonga', 'name': 'Milonga Iris',
         'city': 'Shanghai', 'weekday': 6, 'organizers': ['麦克的探戈世界'],
         'poster': '/images/asia/posters/old.jpg', 'hidden': False, 'updated': '2026-10-01'},
        {'id': 'R031', 'kind': 'weekly', 'type': 'milonga', 'name': 'Other',
         'city': 'Shanghai', 'weekday': 6, 'organizers': ['Someone'],
         'poster': '/images/asia/posters/old.jpg', 'hidden': False, 'updated': '2026-10-01'},
        {'id': 'E093', 'kind': 'event', 'type': 'marathon', 'name': 'Fest',
         'city': 'Beijing', 'organizers': ['Shiao'], 'poster': '/images/asia/posters/fest.jpg',
         'hidden': False, 'updated': '2026-10-01'},
        {'id': 'E004', 'kind': 'event', 'type': 'milonga', 'regular_oneoff': True,
         'name': 'Anniversary', 'city': 'Shanghai', 'start': '2026-10-31',
         'organizers': ['Infinity Tango'], 'hidden': False, 'updated': '2026-10-01'},
        {'id': 'HID', 'kind': 'weekly', 'type': 'milonga', 'name': 'Hidden',
         'city': 'Beijing', 'weekday': 1, 'organizers': ['A'], 'hidden': True, 'updated': '2026-10-01'},
        {'id': 'CLS', 'kind': 'weekly', 'type': 'class', 'name': 'Workshop',
         'city': 'Beijing', 'weekday': 3, 'organizers': ['A'], 'hidden': False, 'updated': '2026-10-01'},
    ]
    raw = json.dumps(events, ensure_ascii=False, separators=(',', ':'))
    for name in ('events.json', 'events-core.json'):
        with open(os.path.join(tmp, 'asia', name), 'w', encoding='utf-8') as fh:
            fh.write(raw)
    html = (
        '<link rel="stylesheet" href="../css/style.css?v=china335">\n'
        '<script src="lang-pref.js?v=china142"></script>\n'
        '<link rel="preload" href="events-core.json?v=china368">\n'
        "eventsUrl: 'events-core.json?v=china368',\n"
        '<script src="asia-map.js?v=china368"></script>\n'
        '<script defer src="/asia/atm-home.js?v=h33"></script>\n'
        '<script src="/asia/cardB.js?v=cb40"></script>\n'
    )
    with open(os.path.join(tmp, 'asia/index.html'), 'w', encoding='utf-8') as fh:
        fh.write(html)
    os.makedirs(os.path.join(tmp, 'zh/asia'), exist_ok=True)
    with open(os.path.join(tmp, 'zh/asia/index.html'), 'w', encoding='utf-8') as fh:
        fh.write(html.replace('events-core.json', '../../asia/events-core.json').replace('asia-map.js', '../../asia/asia-map.js'))
    with open(os.path.join(tmp, 'asia/asia-map.js'), 'w', encoding='utf-8') as fh:
        fh.write('var ATM_TH = {"/images/asia/posters/old.jpg":[480,800]};\n'
                 "var eventsUrl = UI.eventsUrl || 'events-core.json?v=china368';\n")
    with open(os.path.join(tmp, 'asia/atm-home.js'), 'w', encoding='utf-8') as fh:
        fh.write("fetch('/asia/events.json?v=e130')\n")
    with open(os.path.join(tmp, 'asia/cardB.js'), 'w', encoding='utf-8') as fh:
        fh.write("fetch('/asia/events.json?v=e130');fetch('/asia/events.json?v=e130');\n")
    return old


def item(**kw):
    base = {'event_id': 'R030', 'city': '上海', 'note': 'G03 new poster'}
    base.update(kw)
    return base


def main():
    fails = 0

    def check(name, cond):
        nonlocal fails
        print(('ok  ' if cond else 'FAIL') + ' ' + name)
        if not cond:
            fails += 1

    tmp = tempfile.mkdtemp(prefix='atm-poster-')
    try:
        old = fixture(tmp)
        new = os.path.join(tmp, 'new.jpg')
        jpeg(new, (200, 10, 10), (100, 180))
        # refuse featured, hidden, class row, class ad, city mismatch, no corroboration, filename conflict
        events = P.load_events(tmp)
        for label, it in (
            ('featured', {'event_id': 'E093', 'image': new, 'city': 'Beijing', 'note': 'x'}),
            ('hidden', {'event_id': 'HID', 'image': new, 'city': 'Beijing', 'note': 'x'}),
            ('class row', {'event_id': 'CLS', 'image': new, 'city': 'Beijing', 'note': 'x'}),
            ('class ad', {'event_id': 'R030', 'image': new, 'city': '上海', 'note': '大师课招生'}),
            ('city', {'event_id': 'R030', 'image': new, 'city': 'Beijing', 'note': 'x'}),
            ('org', {'event_id': 'R030', 'image': new, 'organizers': ['Nobody'], 'note': 'x'}),
            ('weekday', {'event_id': 'R030', 'image': new, 'weekday': '周一', 'note': 'x'}),
            ('thin', {'event_id': 'R030', 'image': new}),
            ('filename', {'event_id': 'R030', 'image': os.path.join(tmp, 'E004-poster.jpg'), 'city': '上海', 'note': 'x'}),
            ('guess', {'radar_id': 'R001', 'image': new, 'note': 'x'}),
        ):
            try:
                P.assess(events, it)
                check('refuse ' + label, False)
            except P.Refuse:
                check('refuse ' + label, True)
        # dated one-off accepts matching date; weekly saturday string
        ev, checks, _ = P.assess(events, {'event_id': 'E004', 'image': new, 'city': 'Shanghai', 'date': '2026-10-31', 'note': 'one-off'})
        check('one-off assess', ev['id'] == 'E004' and 'date' in checks)
        ev, checks, _ = P.assess(events, {'event_id': 'R030', 'image': new, 'weekday': '每月第2个周六', 'note': 'monthly'})
        check('weekday token', 'weekday' in checks)
        try:
            P.assess(events, {'event_id': 'R030', 'radar_id': 'R031', 'image': new, 'note': 'x'})
            check('two ids', False)
        except P.Refuse:
            check('two ids', True)

        jpeg(os.path.join(tmp, 'E004-poster.jpg'), (1, 2, 3), (90, 90))
        res = P.apply_items(tmp, [item(image=new)], dry_run=False, bump_caches=True, today='2026-11-02')
        check('replaced one', len(res['replaced']) == 1 and res['replaced'][0]['id'] == 'R030')
        check('backup set', bool(res['replaced'][0]['backup']) and os.path.isfile(os.path.join(tmp, res['replaced'][0]['backup'].lstrip('/'))))
        check('old kept', os.path.isfile(old))
        evs = P.load_events(tmp)
        by = {e['id']: e for e in evs}
        check('poster field', by['R030']['poster'] == '/images/asia/posters/R030.jpg')
        check('past poster', by['R030'].get('posters_past') == [res['replaced'][0]['backup']])
        check('other unchanged', by['R031']['poster'] == '/images/asia/posters/old.jpg')
        check('updated date', by['R030']['updated'] == '2026-11-02')
        core = json.load(open(os.path.join(tmp, 'asia/events-core.json'), encoding='utf-8'))
        check('core synced', next(e for e in core if e['id'] == 'R030')['poster'].endswith('/R030.jpg'))
        check('thumb', os.path.isfile(os.path.join(tmp, 'images/thumb/images/asia/posters/R030.webp')))
        js = open(os.path.join(tmp, 'asia/asia-map.js'), encoding='utf-8').read()
        check('atm_th', '"/images/asia/posters/R030.jpg":' in js)
        html = open(os.path.join(tmp, 'asia/index.html'), encoding='utf-8').read()
        check('cache china', 'china369' in html and 'china335' in html and 'china142' in html)
        check('cache h cb', 'h34' in html and 'cb41' in html)
        home = open(os.path.join(tmp, 'asia/atm-home.js'), encoding='utf-8').read()
        check('cache e', 'e131' in home)
        log = open(os.path.join(tmp, P.LOG_REL), encoding='utf-8').read()
        check('log replace', '"action":"replaced"' in log and 'R030' in log)

        # identical bytes: no second backup required, action unchanged
        before = len(os.listdir(os.path.join(tmp, P.BACKUP_REL))) if os.path.isdir(os.path.join(tmp, P.BACKUP_REL)) else 0
        # copy the file we just wrote
        same = os.path.join(tmp, 'same.jpg')
        shutil.copy(os.path.join(tmp, 'images/asia/posters/R030.jpg'), same)
        res2 = P.apply_items(tmp, [item(image=same)], dry_run=False, bump_caches=True, today='2026-11-02')
        check('unchanged identical', len(res2['unchanged']) == 1 and not res2['replaced'])
        after = len(os.listdir(os.path.join(tmp, P.BACKUP_REL)))
        check('no extra backup', after == before)
        html2 = open(os.path.join(tmp, 'asia/index.html'), encoding='utf-8').read()
        check('cache not bumped again', 'china369' in html2 and 'china370' not in html2)

        # dry-run does not write a new id
        res3 = P.apply_items(tmp, [{'event_id': 'E004', 'image': new, 'city': 'Shanghai', 'date': '2026-10-31', 'note': 'dry'}], dry_run=True)
        check('dry-run plans', len(res3['replaced']) == 1)
        evs = P.load_events(tmp)
        check('dry-run no write', next(e for e in evs if e['id'] == 'E004').get('poster') in (None,))

        # yidong refuses a poster list under the wrong key, and runs an empty posters array
        bad = os.path.join(tmp, 'bad.json')
        with open(bad, 'w', encoding='utf-8') as fh:
            json.dump({'new_posters': [item(image=new)]}, fh)
        try:
            Y.load_notes(bad)
            check('yidong wrong key', False)
        except P.Refuse:
            check('yidong wrong key', True)
        empty = os.path.join(tmp, 'empty.json')
        with open(empty, 'w', encoding='utf-8') as fh:
            json.dump({'date': '2026-11-02', 'source': 'radar', 'posters': []}, fh)
        summary = Y.run(tmp, Y.load_notes(empty)[1], dry_run=False, bump=True, today='2026-11-02', source='radar')
        check('yidong empty ran', summary['poster_step'] == 'ran' and summary['candidates'] == 0)
        log = open(os.path.join(tmp, P.LOG_REL), encoding='utf-8').read()
        check('yidong log', '"action":"yidong"' in log)

        # real events.json: featured id is not a regular target (read-only assess)
        repo = P.ROOT
        real = os.path.join(repo, 'asia/events.json')
        if os.path.isfile(real):
            real_events = json.load(open(real, encoding='utf-8'))
            try:
                P.assess(real_events, {'event_id': 'E093', 'image': new, 'city': 'Beijing', 'note': 'should refuse'})
                check('live featured refuse', False)
            except P.Refuse:
                check('live featured refuse', True)
            # a known weekly id with the wrong city refuses and does not need a write
            weekly = next(e for e in real_events if e.get('kind') == 'weekly' and not e.get('hidden') and e.get('city'))
            try:
                P.assess(real_events, {'event_id': weekly['id'], 'image': new, 'city': 'Not A City', 'note': 'x'})
                check('live city refuse', False)
            except P.Refuse:
                check('live city refuse', True)
    finally:
        shutil.rmtree(tmp)
    print('fails', fails)
    return 1 if fails else 0


if __name__ == '__main__':
    sys.exit(main())

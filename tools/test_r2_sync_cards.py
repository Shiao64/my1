#!/usr/bin/env python3
"""Card R2 publish set and the map wiring. Run: python3 tools/test_r2_sync_cards.py"""
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import r2_sync_cards as R

ROOT = R.ROOT


def check(name, ok):
    print(('ok  ' if ok else 'FAIL') + ' ' + name)
    if not ok:
        raise SystemExit(1)


def main():
    keys, missing, manifest = R.collect(ROOT)
    check('events-core', 'asia/events-core.json' in keys)
    check('events-more', 'asia/events-more.json' in keys)
    check('events-full', 'asia/events.json' in keys)
    check('no manifest in collect', 'asia/manifest.json' not in keys)
    check('poster original', any(k.startswith('images/asia/posters/') and not k.endswith('.json') for k in keys))
    check('thumb', any(k.startswith('images/thumb/images/') for k in keys))
    check('thumb800', any(k.startswith('images/thumb800/images/') for k in keys))
    check('manifest base', manifest['base'] == 'https://data.tangoweekend.org')
    check('missing originals listed separately', isinstance(missing, list))
    one, _m, man = R.collect(ROOT, 'E093')
    check('one card still ships all json', all(name in one for name in R.JSON_FILES))
    check('one card records id', man['event_id'] == 'E093')
    # E093's poster should be present; a different card's poster file need not be.
    check('one card has its poster', 'images/asia/posters/tbxuzmah.jpg' in one)
    check('one card skips other posters', 'images/asia/posters/E158.jpg' not in one and len(one) < len(keys))
    try:
        R.collect(ROOT, 'no-such-card')
        check('unknown id refused', False)
    except SystemExit:
        check('unknown id refused', True)

    def read(rel):
        with open(os.path.join(ROOT, rel), encoding='utf-8') as fh:
            return fh.read()

    en, zh = read('asia/index.html'), read('zh/asia/index.html')
    js, cards, home = read('asia/asia-map.js'), read('asia/cardB.js'), read('asia/atm-home.js')
    data = read('asia/atm-data.js')
    check('en loads helper', 'atm-data.js?v=r9' in en)
    check('zh loads helper', 'atm-data.js?v=r9' in zh)
    check('en map script', 'asia-map.js?v=r9' in en)
    check('zh map script', 'asia-map.js?v=r9' in zh)
    check('json version stays', 'events-core.json?v=china465' in en and 'events-core.json?v=china465' in zh)
    r2_core = 'https://data.tangoweekend.org/asia/events-core.json?v=china465'
    check('en r2 core keeps version', r2_core in en)
    check('zh r2 core keeps version', r2_core in zh)
    check('en no bare r2 core', 'events-core.json"' not in en and "events-core.json';" not in en)
    check('zh no bare r2 core', 'events-core.json"' not in zh and "events-core.json';" not in zh)
    check('json cache', R.cache_control('asia/events-core.json') == 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400')
    check('json type', R.content_type('asia/events-core.json') == 'application/json; charset=utf-8')
    check('webp type', R.content_type('images/thumb/a.webp') == 'image/webp')
    check('jpeg type', R.content_type('images/thumb/a.jpg') == 'image/jpeg')
    check('png type', R.content_type('images/a.png') == 'image/png')
    check('image cache', R.cache_control('images/thumb/a.webp') == 'public, max-age=2592000')
    check('map uses loader', 'loadJson(' in js and 'atmPosterUrls' in js)
    check('cards use loader', 'atmDataJson' in cards)
    check('home uses loader', 'atmDataJson' in home)
    check('default base', "https://data.tangoweekend.org" in data)
    check('worker untouched', 'r2' not in read('subscribe-worker/wrangler.toml').lower())
    node = r'''
const fs = require('fs');
const w = {};
global.window = w; global.fetch = () => { throw new Error('no fetch'); };
eval(fs.readFileSync('asia/atm-data.js', 'utf8'));
if (w.ATM_DATA_BASE !== 'https://data.tangoweekend.org') process.exit(2);
w.location = { hostname: 'cursor-wutong-2027.my1-7p3.pages.dev' };
w.ATM_DATA_BASE = null;
eval(fs.readFileSync('asia/atm-data.js', 'utf8'));
if (w.ATM_DATA_BASE !== '') process.exit(8);
w.ATM_DATA_BASE = '';
let fetches = 0;
let localUrl = '';
global.fetch = (url, opts) => { fetches++; localUrl = String(url); if (opts && opts.cache === 'no-cache') process.exit(9); return Promise.resolve({ ok: true, json: async () => [{ id: 'a' }] }); };
const p1 = w.atmDataJson('/asia/events-core.json?v=china459');
const p2 = w.atmDataJson('events-core.json?v=china459');
if (p1 !== p2 || fetches !== 1) process.exit(10);
if (localUrl !== '/asia/events-core.json?v=china459') process.exit(16);
w.location = { hostname: 'tangoweekend.org' };
w.ATM_DATA_BASE = 'https://data.tangoweekend.org';
const u = w.atmPosterUrls('/images/asia/posters/E158.jpg?v=20261105', false);
if (!u.webp.endsWith('.webp?v=20261105')) process.exit(3);
if (u.key !== '/images/asia/posters/E158.jpg') process.exit(4);
if (u.webp.indexOf('data.tangoweekend.org') !== -1) process.exit(5); // not rewritten until a JSON fetch succeeds
w.ATM_DATA_OK = true;
const live = w.atmPosterUrls('/images/asia/posters/E158.jpg?v=20261105', true);
if (live.jpg.indexOf('https://data.tangoweekend.org/images/thumb800/images/asia/posters/E158.jpg?v=20261105') !== 0) process.exit(6);
if (live.localJpg.indexOf('/images/thumb800/') !== 0) process.exit(7);
let seen = [];
global.fetch = (url) => { seen.push(String(url)); return Promise.resolve({ ok: true, json: async () => [] }); };
w.atmDataJson('/asia/events-more.json?v=china465');
w.atmDataJson('events-more.json?v=china465');
w.atmDataJson('/asia/events.json?v=e216#frag');
w.atmDataJson('/asia/djs.json');
w.atmDataJson('/asia/organizers.json?v=o1&x=2');
if (seen[0] !== 'https://data.tangoweekend.org/asia/events-more.json?v=china465') process.exit(11);
if (seen[1] !== 'https://data.tangoweekend.org/asia/events.json?v=e216') process.exit(12);
if (seen[2] !== 'https://data.tangoweekend.org/asia/djs.json') process.exit(13);
if (seen[3] !== 'https://data.tangoweekend.org/asia/organizers.json?v=o1&x=2') process.exit(14);
if (seen.length !== 4) process.exit(15);
const e164 = '/images/asia/posters/E164.jpg?v=20261109fix';
const thumb = w.atmPosterUrls(e164, false);
const card = w.atmPosterUrls(e164, true);
if (thumb.webp !== 'https://data.tangoweekend.org/images/thumb/images/asia/posters/E164.webp?v=20261109fix') process.exit(17);
if (thumb.jpg !== 'https://data.tangoweekend.org/images/thumb/images/asia/posters/E164.jpg?v=20261109fix') process.exit(18);
if (card.webp.indexOf('thumb800/images/asia/posters/E164.webp?v=20261109fix') < 0) process.exit(19);
if (card.full !== 'https://data.tangoweekend.org/images/asia/posters/E164.jpg?v=20261109fix') process.exit(20);
if (thumb.webp.indexOf('?v=t360') >= 0 || card.webp.indexOf('?v=t800') >= 0) process.exit(21);
const bust = w.atmPosterRetryUrl(thumb.webp);
if (bust !== thumb.webp + '&atmbust=1') process.exit(22);
if (w.atmPosterRetryUrl(bust) !== '') process.exit(23);
const today = '2026-11-09';
const future = { id: 'E162', kind: 'event', start: '2027-04-21', end: '2027-04-26' };
if (w.atmResolveCard([[future]], null, 'E162', today).fate !== 'found') process.exit(25);
const past = { id: 'OLD', kind: 'event', start: '2020-01-01', end: '2020-01-02' };
if (w.atmResolveCard([[past]], null, 'OLD', today).fate !== 'ended') process.exit(26);
if (w.atmResolveCard([[]], null, 'NOPE', today).fate !== 'missing') process.exit(27);
if (w.atmResolveCard([[{ id: 'E164', hidden: true, kind: 'event', start: '2026-12-30', end: '2027-01-03' }]], null, 'E164', today).fate !== 'missing') process.exit(28);
const stale = [[{ id: 'E160', kind: 'event', start: '2027-10-03', end: '2027-10-06' }]];
const fresh = [[{ id: 'E162', kind: 'event', start: '2027-04-21', end: '2027-04-26' }, { id: 'E163', kind: 'event', start: '2027-04-21', end: '2027-04-26' }, { id: 'E164', kind: 'event', start: '2026-12-30', end: '2027-01-03' }]];
const got = w.atmResolveCard(stale, fresh, 'E164', today);
if (got.fate !== 'found' || got.row.id !== 'E164') process.exit(29);
if (w.atmResolveCard(stale, null, 'E162', today).fate !== 'missing') process.exit(30);
if (w.atmEventEnded({ kind: 'event', start: '2027-04-21', end: '2027-04-26', status: 'ended' }, today) !== true) process.exit(31);
let freshUrls = [];
global.fetch = (url) => { freshUrls.push(String(url)); return Promise.resolve({ ok: true, json: async () => [{ id: 'E162' }] }); };
w.atmDataJsonFresh('/asia/events-core.json?v=china465');
if (freshUrls[0] !== 'https://data.tangoweekend.org/asia/events-core.json?v=china465&atmbust=1') process.exit(32);
if (freshUrls.length !== 1) process.exit(33);
const aliasEn = w.atmCardAliasHref('E163', false, '?card=E163&via=card', '#top');
const aliasZh = w.atmCardAliasHref('E163', true, '?card=E163', '');
if (aliasEn !== '/event/chengdu-2027-ich-tango-festival/?via=card#top') process.exit(34);
if (aliasZh !== '/event/chengdu-2027-ich-tango-festival/zh/') process.exit(35);
if (aliasEn.indexOf('tangotoworldcup') >= 0 || aliasEn.indexOf('card=') >= 0) process.exit(36);
if (w.atmCardAliasHref('E162', false, '?card=E162', '') !== '') process.exit(37);
if (w.atmCardAliasHref('E164', true, '?card=E164', '') !== '') process.exit(38);
'''
    run = subprocess.run(['node', '-e', node], cwd=ROOT, capture_output=True, text=True)
    check('poster url helper ' + (run.stderr.strip() or run.stdout.strip()), run.returncode == 0)
    print('objects', len(keys), 'bytes', sum(os.path.getsize(p) for p in keys.values()))
    import json as _json
    for rel in ('asia/events.json', 'asia/events-core.json'):
        rows = _json.load(open(os.path.join(ROOT, rel), encoding='utf-8'))
        by = {e['id']: e for e in rows}
        check(rel + ' one public chengdu', by['E162']['hidden'] is False and by['E162']['featured'] is True and by['E163']['hidden'] is True and by['E163']['featured'] is False)
        check(rel + ' merged title', 'TangotoWorldCUP' in by['E162']['name'] and '5th' in by['E162']['name'] and '第5届' in by['E162']['name_zh'] and '预选赛' in by['E162']['name_zh'])
        check(rel + ' prize kept', by['E162']['posters_extra'][0]['src'].endswith('E163_2.jpg?v=20261109fix2'))
        check(rel + ' poster fix2', by['E162']['poster'].endswith('?v=20261109fix2'))
        check(rel + ' E163 detail merged', by['E163']['detail'] == '/event/chengdu-2027-ich-tango-festival/')
        check(rel + ' no see-E163 note', '见卡 E163' not in by['E162'].get('note_zh', '') and 'see card E163' not in by['E162'].get('note', '').lower())
        check(rel + ' E160 untouched name', by['E160']['name'].startswith('2nd Wuhan'))
        check(rel + ' E164 absent', 'E164' not in by)
    fest = read('event/chengdu-2027-ich-tango-festival/index.html')
    fest_zh = read('event/chengdu-2027-ich-tango-festival/zh/index.html')
    old = read('event/chengdu-2027-tangotoworldcup-ich-competition/index.html')
    old_zh = read('event/chengdu-2027-tangotoworldcup-ich-competition/zh/index.html')
    check('festival has prize and cup', '¥12,000.00' in fest and 'TangotoWorldCUP' in fest and 'E163_2.jpg?v=20261109fix2' in fest)
    check('zh festival has three names', '第5届' in fest_zh and '预选赛' in fest_zh and '第12届' in fest_zh)
    check('old en redirects', 'location.replace("/event/chengdu-2027-ich-tango-festival/"' in old and 'tangotoworldcup' not in old.split('location.replace', 1)[1])
    check('old zh redirects', 'location.replace("/event/chengdu-2027-ich-tango-festival/zh/"' in old_zh)
    check('pages redirects', '/event/chengdu-2027-tangotoworldcup-ich-competition/zh/ /event/chengdu-2027-ich-tango-festival/zh/ 301' in read('_redirects'))
    check('inline card alias', "cid==='E163'" in en and "cid==='E163'" in zh)
    raw = open(os.path.join(ROOT, 'images/asia/posters/E162.jpg'), 'rb').read(3)
    prize = open(os.path.join(ROOT, 'images/asia/posters/E163_2.jpg'), 'rb').read(3)
    check('posters decode as jpeg', raw == b'\xff\xd8\xff' and prize == b'\xff\xd8\xff')
    legends = open(os.path.join(ROOT, 'images/asia/posters/E167.jpg'), 'rb').read(3)
    sched = open(os.path.join(ROOT, 'images/asia/posters/E167_2.jpg'), 'rb').read(3)
    check('E167 posters decode as jpeg', legends == b'\xff\xd8\xff' and sched == b'\xff\xd8\xff')
    for rel in ('asia/events.json', 'asia/events-core.json'):
        rows = _json.load(open(os.path.join(ROOT, rel), encoding='utf-8'))
        by = {e['id']: e for e in rows}
        e = by['E167']
        check(rel + ' E167 featured festival', e['kind'] == 'event' and e['type'] == 'festival' and e['featured'] is True and e['hidden'] is False)
        check(rel + ' E167 title', e['name'] == 'Legends Tango Festival 2027' and e['name_zh'] == 'Legends Tango Festival 2027')
        check(rel + ' E167 dates', e['start'] == '2027-02-25' and e['end'] == '2027-02-28' and e['city'] == 'Guangzhou')
        check(rel + ' E167 email only', e['contacts'] == {'email': 'legendstango@gmail.com'} and '18676479599' not in _json.dumps(e))
        check(rel + ' E167 LTA address', e['venue_address'] == '广州市越秀区明月一路明月阁1706' and e['venue'] == 'Legends Tango Academy')
        check(rel + ' E167 detail', e['detail'] == '/event/guangzhou-2027-legends-tango-festival/' and e['detail'] != by['ONKkPuWH']['detail'])
        check(rel + ' E167 posters', e['poster'] == '/images/asia/posters/E167.jpg' and e['posters_extra'][0]['src'] == '/images/asia/posters/E167_2.jpg')
        check(rel + ' E167 schedule', len(e['schedule']) == 14 and e['schedule'][0]['time'].startswith('7:15pm') and 'tbc' in e['schedule'][8]['dj'] and e['schedule'][10]['dj'] == 'tbc')
        check(rel + ' E167 prices and Iara', '3480' in e['note'] and 'Iara Duarte' in e['note'] and '330 each' in e['note'])
    en_page = read('event/guangzhou-2027-legends-tango-festival/index.html')
    zh_page = read('event/guangzhou-2027-legends-tango-festival/zh/index.html')
    check('E167 en page', 'legendstango@gmail.com' in en_page and 'E167_2.jpg' in en_page and 'Iara Duarte' in en_page and 'RMB 3480' in en_page and 'DJ1 tbc' in en_page)
    check('E167 zh page', 'Legends Tango Festival 2027' in zh_page and '广州市越秀区明月一路明月阁1706' in zh_page and '2nd Academy Anniversary' in zh_page)
    check('E167 pages skip the other Guangzhou festival', 'ONKkPuWH' not in en_page and 'ONKkPuWH' not in zh_page and 'guangzhou-2027-tango-festival' not in en_page)


if __name__ == '__main__':
    main()

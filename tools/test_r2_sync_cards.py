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
    check('en loads helper', 'atm-data.js?v=r3' in en)
    check('zh loads helper', 'atm-data.js?v=r3' in zh)
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
global.fetch = (url, opts) => { fetches++; if (opts && opts.cache === 'no-cache') process.exit(9); return Promise.resolve({ ok: true, json: async () => [{ id: 'a' }] }); };
const p1 = w.atmDataJson('/asia/events-core.json?v=china459');
const p2 = w.atmDataJson('events-core.json?v=china459');
if (p1 !== p2 || fetches !== 1) process.exit(10);
w.ATM_DATA_BASE = 'https://data.tangoweekend.org';
const u = w.atmPosterUrls('/images/asia/posters/E158.jpg?v=20261105', false);
if (!u.webp.endsWith('.webp?v=20261105')) process.exit(3);
if (u.key !== '/images/asia/posters/E158.jpg') process.exit(4);
if (u.webp.indexOf('data.tangoweekend.org') !== -1) process.exit(5); // not rewritten until a JSON fetch succeeds
w.ATM_DATA_OK = true;
const live = w.atmPosterUrls('/images/asia/posters/E158.jpg?v=20261105', true);
if (live.jpg.indexOf('https://data.tangoweekend.org/images/thumb800/images/asia/posters/E158.jpg?v=20261105') !== 0) process.exit(6);
if (live.localJpg.indexOf('/images/thumb800/') !== 0) process.exit(7);
'''
    run = subprocess.run(['node', '-e', node], cwd=ROOT, capture_output=True, text=True)
    check('poster url helper ' + (run.stderr.strip() or run.stdout.strip()), run.returncode == 0)
    print('objects', len(keys), 'bytes', sum(os.path.getsize(p) for p in keys.values()))


if __name__ == '__main__':
    main()

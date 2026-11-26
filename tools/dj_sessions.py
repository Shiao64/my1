#!/usr/bin/env python3
"""DJ session log + DJ page candidates (Shiao 2026-11-21).

Why: a weekly card's DJ lives on its poster (poster_djs + poster_dates). Past posters are
pruned after 30 days, so the DJ history went with them. This keeps an append-only log.

Files
  data/dj-sessions.json   the log. One row per DJ per night per event: {date, dj, event, name, name_en, city, src}.
                          Only added to, never pruned. Hand edits are fine (fix a name, delete a wrong row).
  data/dj-names.json      Shiao's decisions: {"same": [[names of one person], ...], "skip": [names that never get a page]}.
  data/dj-candidates.md   people with >= 3 nights and no page yet, for Shiao to look over (pages are not automatic).
  asia/dj-recent.json     {profile id: {"n": total nights, "recent": [last 5 past nights]}} read by asia/dj-page.js.

Commands
  python3 tools/dj_sessions.py collect [--history]   add rows from asia/events.json (--history: every git version too)
  python3 tools/dj_sessions.py refresh               write asia/dj-recent.json and data/dj-candidates.md
  python3 tools/dj_sessions.py daily                 collect + refresh (the daily workflow runs this)
  python3 tools/dj_sessions.py approve NAME --id slug [--name EN] [--name-zh 中文] [--city City] [--city-zh 城市]
        after Shiao says yes: adds the person to asia/djs.json (bio left empty), makes /dj/<slug>/ and
        /zh/dj/<slug>/, then refresh.

Rules
  - A row needs a date: poster_dates of that poster, else YYYYMMDD / YYYY-MM-DD in the poster file name
    (a ...T012604Z upload timestamp is not a date), weekly dj + poster_date, or schedule[].date.
  - One night = one session (same DJ, same event, same date counts once).
  - Same person: names equal ignoring case, spaces, punctuation and a trailing "(City)"; the dj / dj_en pair on
    one card; the name / name_zh / match of a profile in asia/djs.json or a person in asia/organizers.json;
    a "same" group in data/dj-names.json. Nothing else is merged (Tony in Seoul and Tony in Taipei may be two people).
"""
import json, os, re, subprocess, sys, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOG = os.path.join(ROOT, 'data/dj-sessions.json')
NAMES = os.path.join(ROOT, 'data/dj-names.json')
CAND = os.path.join(ROOT, 'data/dj-candidates.md')
RECENT = os.path.join(ROOT, 'asia/dj-recent.json')
DJS = os.path.join(ROOT, 'asia/djs.json')
ORGS = os.path.join(ROOT, 'asia/organizers.json')
THRESHOLD = 3   # Shiao 2026-11-21: 3 nights, then Shiao looks before a page goes up
RECENT_N = 5
CITY_ZH = {'Shanghai': '上海', 'Beijing': '北京', 'Shenzhen': '深圳', 'Guangzhou': '广州', 'Hangzhou': '杭州', 'Chengdu': '成都',
           'Wuhan': '武汉', 'Nanjing': '南京', 'Suzhou': '苏州', 'Xiamen': '厦门', 'Tianjin': '天津', 'Chongqing': '重庆',
           "Xi'an": '西安', 'Hong Kong': '香港', 'Taipei': '台北', 'Macau': '澳门', 'Seoul': '首尔', 'Daegu': '大邱',
           'Busan': '釜山', 'Tokyo': '东京', 'Da Nang': '岘港', 'Kuala Lumpur': '吉隆坡', 'Bangkok': '曼谷', 'Singapore': '新加坡'}


def load(p, default):
    try:
        with open(p, encoding='utf-8') as f: return json.load(f)
    except FileNotFoundError:
        return default


def save(p, data):
    with open(p, 'w', encoding='utf-8') as f:
        f.write(json.dumps(data, ensure_ascii=False, indent=1) + '\n')


def today():
    return (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=8)).strftime('%Y-%m-%d')


def clean(n):
    n = re.sub(r'^\s*DJ\d*[\s:：]+', '', str(n or ''), flags=re.I)
    n = re.sub(r'\s*[（(](host|主持)[^)）]*[)）]', '', n, flags=re.I)
    n = re.sub(r'\s+', ' ', n).strip(' .,;:')
    return '' if re.match(r'^(tb[acd]|待定|待公布|未定|待公佈|미정)$', n, re.I) else n


def split(n):
    if isinstance(n, list): return [clean(x) for x in n if clean(x)]
    return [clean(x) for x in re.split(r'\s*(?:、|\+|＆|&|/|\band\b|与|與|,|;|；|，)\s*', str(n or ''), flags=re.I) if clean(x)]


def key(n):
    n = re.sub(r'\s*[（(][^()（）]*[)）]\s*$', '', str(n or ''))   # "Jessie (SH)" -> "Jessie"
    return re.sub(r'[^a-z0-9一-鿿]', '', n.lower())


def date_in(path):
    m = re.search(r'(20\d\d)-(\d\d)-(\d\d)', path) or re.search(r'(20\d\d)(\d\d)(\d\d)(?![T\d])', path)
    if not m: return ''
    y, mo, d = map(int, m.groups())
    try: return datetime.date(y, mo, d).isoformat()
    except ValueError: return ''


def rows_from(events, src):
    out = []
    for e in events:
        if not isinstance(e, dict) or not e.get('id'): continue
        base = {'event': e['id'], 'name': e.get('name_zh') or e.get('name') or '', 'name_en': e.get('name_en') or e.get('name') or '', 'city': e.get('city') or ''}
        pd = e.get('poster_dates') or {}
        for img, n in (e.get('poster_djs') or {}).items():
            dt = pd.get(img) or date_in(img)
            for x in split(n):
                if dt: out.append(dict(base, date=dt, dj=x, src=src + ' poster ' + img.rsplit('/', 1)[-1]))
        if e.get('kind') == 'weekly' and e.get('poster_date') and e.get('dj'):
            for x in split(e['dj']): out.append(dict(base, date=e['poster_date'], dj=x, src=src + ' weekly dj'))
        djz = dict(zip(e.get('dj_en') or [], e.get('dj') or [])) if isinstance(e.get('dj'), list) and isinstance(e.get('dj_en'), list) else {}
        for s in e.get('schedule') or []:
            if s.get('dj') and s.get('date'):
                for x in split(s['dj']): out.append(dict(base, date=s['date'], dj=djz.get(x, x), src=src + ' schedule'))
        # 2026-11-25 (Shiao, 担任 DJ on organizer pages): a one-day one-off card with a dj but no schedule and no
        # poster DJs (e.g. E124 ATer Halloween, DJ Tayfun) is one night on its start date. Multi-day cards without a
        # schedule are skipped: which night the DJ plays is not known.
        day = e.get('start') or ''
        if (e.get('kind') != 'weekly' and e.get('dj') and not e.get('schedule') and not e.get('poster_djs')
                and re.fullmatch(r'\d{4}-\d{2}-\d{2}', day) and (e.get('end') or day) == day):
            for x in split(e['dj']):
                if x.count('(') + x.count('（') != x.count(')') + x.count('）'): continue  # "Resident DJ（Ken Wong, SC Lee）" split at the comma
                out.append(dict(base, date=day, dj=x, src=src + ' one-off dj'))
    return out


def add(log, rows):
    have = {(r['date'], r['event'], key(r['dj'])) for r in log}
    n = 0
    for r in rows:
        k = (r['date'], r['event'], key(r['dj']))
        if not k[2] or k in have: continue
        have.add(k); log.append({x: r[x] for x in ('date', 'dj', 'event', 'name', 'name_en', 'city', 'src')}); n += 1
    log.sort(key=lambda r: (r['date'], r['event'], r['dj']))
    return n


def collect(history=False):
    log = load(LOG, [])
    n = add(log, rows_from(load(os.path.join(ROOT, 'asia/events.json'), []), 'events.json'))
    if history:
        revs = subprocess.check_output(['git', 'log', '--format=%H %cs', '--', 'asia/events.json'], cwd=ROOT).decode().split('\n')
        for line in revs:
            if not line.strip(): continue
            rev, day = line.split()
            try: d = json.loads(subprocess.check_output(['git', 'show', rev + ':asia/events.json'], cwd=ROOT))
            except Exception: continue
            if isinstance(d, dict): d = d.get('events', [])
            n += add(log, rows_from(d, 'git ' + rev[:8] + ' ' + day))
    save(LOG, log)
    print('dj-sessions: +%d rows, %d total' % (n, len(log)))


class People:
    """Union of name keys into people."""
    def __init__(self):
        self.p = {}
    def find(self, k):
        self.p.setdefault(k, k)
        while self.p[k] != k:
            self.p[k] = self.p[self.p[k]]; k = self.p[k]
        return k
    def join(self, names):
        ks = [key(x) for x in names if key(x)]
        for k in ks[1:]: self.p[self.find(k)] = self.find(ks[0])


def profiles():
    out = []
    for p in load(DJS, []): out.append(('dj', p))
    for p in load(ORGS, []):
        if p.get('kind') != 'group': out.append(('organizer', p))
    return out


def people(log):
    ppl = People()
    for r in log: ppl.find(key(r['dj']))
    for e in load(os.path.join(ROOT, 'asia/events.json'), []):
        if isinstance(e.get('dj'), list) and isinstance(e.get('dj_en'), list) and len(e['dj']) == len(e['dj_en']):
            for a, b in zip(e['dj'], e['dj_en']): ppl.join([a, b])
    for _, p in profiles(): ppl.join([p.get('name'), p.get('name_zh')] + list(p.get('match') or []))
    for g in load(NAMES, {}).get('same', []): ppl.join(g)
    return ppl


def nights(rows):
    seen, out = set(), []
    for r in sorted(rows, key=lambda r: (r['date'], r['event']), reverse=True):
        k = (r['date'], r['event'])
        if k in seen: continue
        seen.add(k); out.append(r)
    return out


def refresh():
    log = load(LOG, [])
    ppl = people(log)
    by = {}
    for r in log: by.setdefault(ppl.find(key(r['dj'])), []).append(r)
    day = today()
    recent, prof_roots = {}, {}
    for kind, p in profiles():
        root = ppl.find(key(p.get('name') or p.get('name_zh')))
        prof_roots[root] = (kind, p)
        ns = nights(by.get(root, []))
        if not ns: continue
        past = [r for r in ns if r['date'] <= day][:RECENT_N]
        recent[p['id']] = {'n': len(ns), 'recent': [{x: r[x] for x in ('date', 'event', 'name', 'name_en', 'city')} for r in past]}
    with open(RECENT, 'w', encoding='utf-8') as f: f.write(json.dumps(recent, ensure_ascii=False, separators=(',', ':')) + '\n')
    skip = {key(x) for x in load(NAMES, {}).get('skip', [])}
    cands = []
    for root, rows in by.items():
        if root in prof_roots or ppl.find(root) in {ppl.find(s) for s in skip if s}: continue
        ns = nights(rows)
        if len(ns) < THRESHOLD: continue
        cands.append((len(ns), root, rows, ns))
    near = sorted(((len(nights(rows)), sorted({r['dj'] for r in rows})) for root, rows in by.items()
                   if root not in prof_roots and len(nights(rows)) == THRESHOLD - 1), key=lambda x: x[1])
    cands.sort(key=lambda c: (-c[0], c[1]))
    L = ['# DJ 介绍页候选名单', '',
         '由 `tools/dj_sessions.py` 自动产生（每天更新），请勿手改。满 %d 场、还没有介绍页的人，**Shiao 过目后才上线**。' % THRESHOLD, '',
         '- 同意：告诉 Claude「上线 <名字>」，Claude 跑 `python3 tools/dj_sessions.py approve <名字> --id <网址名>`。',
         '- 两个名字是同一人：写进 `data/dj-names.json` 的 `same`；不要做页面：写进 `skip`。',
         '- 「多个城市」的要特别看：可能是同名的两个人。', '',
         '记录共 %d 条，%d 个名字。更新：%s' % (len(log), len(by), day), '']
    if not cands: L.append('目前没有满 %d 场的人。' % THRESHOLD)
    for n, root, rows, ns in cands:
        names = sorted({r['dj'] for r in rows})
        cities = sorted({r['city'] for r in rows if r['city']})
        L.append('## %s（%d 场）' % (' / '.join(names), n))
        L.append('')
        if len(cities) > 1: L.append('**多个城市：%s，请确认是同一人**' % '、'.join(cities)); L.append('')
        for r in ns: L.append('- %s · %s（%s）· %s · `%s`' % (r['date'], r['name'], r['event'], CITY_ZH.get(r['city'], r['city']), r['src']))
        L.append('')
    if near:
        L.append('## 差 1 场的（参考，不用处理）'); L.append('')
        L.append('、'.join(' / '.join(n) for _, n in near)); L.append('')
    L.append('## 同一人的写法？'); L.append('')
    L.append('名字不同、程序不会自动合并。看到是同一人（例如中文名和英文名）就告诉 Claude，会写进 `data/dj-names.json`。'); L.append('')
    with open(CAND, 'w', encoding='utf-8') as f: f.write('\n'.join(L).rstrip() + '\n')
    print('dj-recent: %d profiles with nights; candidates: %d' % (len(recent), len(cands)))


PAGE = '''<!DOCTYPE html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} · {site}</title>
<link rel="stylesheet" href="/css/dj-page.css?v=d6">
</head>
<body data-kind="dj" data-id="{id}" data-lang="{dl}">
<header class="dj-bar">
  <a class="dj-back" href="{home}" aria-label="{backl}">‹</a>
  <h1>{title}</h1>
  <span class="dj-aff" id="pf-aff"></span>
</header>
<main class="dj-main">
  <div class="dj-story">
    <div class="dj-photo" id="pf-photo"></div>
    <p class="dj-bio" id="pf-bio"></p>
  </div>
  <dl class="dj-fields">
    <div><dt>Instagram</dt><dd id="pf-ig"></dd></div>
    <div><dt>Facebook</dt><dd id="pf-fb"></dd></div>
    <div><dt>{wx}</dt><dd id="pf-wx"></dd></div>
    <div><dt>SoundCloud</dt><dd id="pf-sc"></dd></div>
  </dl>
  <section>
    <h2>{uph}</h2>
    <div id="pf-up" class="dj-events"></div>
  </section>
</main>
<script src="/asia/dj-page.js?v={jsv}"></script>
<script defer src="/asia/atm-social.js?v=s30"></script>
</body>
</html>
'''


def approve(argv):
    import argparse
    ap = argparse.ArgumentParser(prog='dj_sessions.py approve')
    ap.add_argument('who'); ap.add_argument('--id', required=True)
    ap.add_argument('--name'); ap.add_argument('--name-zh', default='')
    ap.add_argument('--city', default=''); ap.add_argument('--city-zh', default='')
    a = ap.parse_args(argv)
    if not re.match(r'^[a-z0-9]+(-[a-z0-9]+)*$', a.id): sys.exit('--id: lowercase letters, digits and - only')
    log = load(LOG, []); ppl = people(log); root = ppl.find(key(a.who))
    names = sorted({r['dj'] for r in log if ppl.find(key(r['dj'])) == root} | {a.who})
    djs = load(DJS, [])
    if any(p['id'] == a.id for p in djs) or any(p.get('id') == a.id for p in load(ORGS, [])): sys.exit('id already used: ' + a.id)
    en = a.name or next((n for n in names if not re.search(r'[一-鿿]', n)), a.who)
    zh = a.name_zh or next((n for n in names if re.search(r'[一-鿿]', n)), '')
    cities = sorted({r['city'] for r in log if ppl.find(key(r['dj'])) == root and r['city']})
    city = a.city or (cities[0] if len(cities) == 1 else '')
    djs.append({'id': a.id, 'name': en, 'name_zh': zh, 'city': city, 'city_zh': a.city_zh or CITY_ZH.get(city, ''), 'photo': '', 'bio': '', 'bio_zh': '',
                'links': {'instagram': '', 'facebook': '', 'wechat': '', 'soundcloud': ''}, 'match': names,
                'sources': ['DJ session log data/dj-sessions.json; page approved by Shiao ' + today()]})
    with open(DJS, 'w', encoding='utf-8') as f:
        f.write('[\n' + ',\n'.join('  ' + json.dumps(p, ensure_ascii=False) for p in djs) + '\n]\n')
    jsv = re.search(r'dj-page\.js\?v=(\w+)', open(os.path.join(ROOT, 'dj/yelyn-woo/index.html'), encoding='utf-8').read()).group(1)
    for lang in ('en', 'zh'):
        d = os.path.join(ROOT, 'zh' if lang == 'zh' else '', 'dj', a.id); os.makedirs(d, exist_ok=True)
        z = lang == 'zh'
        with open(os.path.join(d, 'index.html'), 'w', encoding='utf-8') as f:
            f.write(PAGE.format(lang='zh-CN' if z else 'en', dl='zh' if z else 'en', id=a.id, title=(zh or en) if z else en,
                                site='亚洲探戈地图' if z else 'Asia Tango Map', home='/zh/asia/' if z else '/asia/', backl='返回' if z else 'Back',
                                wx='微信' if z else 'WeChat', uph='近期在地图上担任 DJ' if z else 'Upcoming on Asia Tango Map', jsv=jsv))
    print('added', a.id, en, zh, names)
    refresh()


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else ''
    if cmd == 'collect': collect('--history' in sys.argv)
    elif cmd == 'refresh': refresh()
    elif cmd == 'daily': collect(); refresh()
    elif cmd == 'approve': approve(sys.argv[2:])
    else: print(__doc__)

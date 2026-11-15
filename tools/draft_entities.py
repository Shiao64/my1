#!/usr/bin/env python3
"""Draft venue / group / organizer lists from asia/events.json (step 1 of the data-structure plan).

Read-only for the site: it only writes data/entities-draft/. Nothing on the site reads these files yet.
    python3 tools/draft_entities.py
Outputs: venues.json, groups.json, organizers.json, event_links.json, review.md
"""
import json, re, unicodedata, difflib, collections, os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'data', 'entities-draft')
EV = json.load(open(os.path.join(ROOT, 'asia', 'events.json'), encoding='utf-8'))

GROUP_WORDS = re.compile(r'tango|tanguísimo|tanguisimo|땅고|탱고|探戈|studio|club|academy|school|cafe|café|space|sociedad|committee|委员会|実行|festival|orquesta|学院|學院|幫|教室|俱乐部|俱樂部|milonga|practilonga|dance|ocho|pista|people|사람', re.I)


def norm(s):
    s = unicodedata.normalize('NFKD', s or '')
    s = ''.join(c for c in s if not unicodedata.combining(c)).lower()
    return re.sub(r'[\s\W_]+', '', s)


def addr_key(e):
    a = e.get('venue_address') or ''
    if not a or 'not found' in a.lower():
        a = e.get('venue_address_en') or ''
    if 'not found' in a.lower():
        a = ''
    return norm(a)


class UF:
    def __init__(self): self.p = {}
    def f(self, x):
        self.p.setdefault(x, x)
        while self.p[x] != x:
            self.p[x] = self.p[self.p[x]]; x = self.p[x]
        return x
    def u(self, a, b): self.p[self.f(a)] = self.f(b)


def sim(a, b, contain=True):
    a, b = norm(a), norm(b)
    if not a or not b: return 0
    if contain and len(a) >= 3 and len(b) >= 3 and (a in b or b in a): return 0.95
    return difflib.SequenceMatcher(None, a, b).ratio()


review = collections.defaultdict(list)
DEC = json.load(open(os.path.join(OUT, 'decisions.json'), encoding='utf-8')) if os.path.exists(os.path.join(OUT, 'decisions.json')) else {}
CN = lambda city_or_e: (city_or_e if isinstance(city_or_e, dict) else CITY_EV.get(city_or_e, {})).get('country') == 'China' or (city_or_e if isinstance(city_or_e, dict) else CITY_EV.get(city_or_e, {})).get('region') == 'Hong Kong'
CITY_EV = {e['city']: e for e in EV}

# ---------- venues ----------
uf = UF()
by_addr, by_name = {}, {}
PLACEHOLDER = re.compile(r'^(tba|tbc|to be announced|待定|未定)$', re.I)
withv = [e for e in EV if (e.get('venue') or e.get('venue_en')) and not PLACEHOLDER.match((e.get('venue_en') or e.get('venue') or '').strip())]
review['venue_tba'] = [(e['id'], e['city'], e['name']) for e in EV if (e.get('venue') or e.get('venue_en')) and e not in withv]
for e in withv:
    uf.f(e['id'])
    ak = addr_key(e)
    if ak:
        k = (e['city'], ak)
        if k in by_addr: uf.u(e['id'], by_addr[k])
        else: by_addr[k] = e['id']
    nk = (e['city'], norm(e.get('venue_en') or e.get('venue')))
    if nk[1]:
        if nk in by_name: uf.u(e['id'], by_name[nk])
        else: by_name[nk] = e['id']
for d in DEC.get('venue_same', []):
    ids = [e['id'] for e in withv if e['city'] == d['city'] and (e.get('venue_en') or e.get('venue')) in d['names']]
    for x in ids[1:]: uf.u(x, ids[0])
VENUE_USE = {(d['city'], n): d['use'] for d in DEC.get('venue_same', []) for n in d['names']}
for d in DEC.get('host_same', []):  # the same answer names the venue when a venue goes by those names
    for e in withv:
        if (e.get('venue_en') or e.get('venue')) in d['names']:
            for n in d['names']: VENUE_USE[(e['city'], n)] = d['name_en']
clusters = collections.defaultdict(list)
for e in withv: clusters[uf.f(e['id'])].append(e)

venues = []
for n, (root, es) in enumerate(sorted(clusters.items(), key=lambda kv: (kv[1][0]['country'], kv[1][0]['city'], kv[1][0].get('venue_en') or ''))):
    names = collections.Counter(e.get('venue_en') or e.get('venue') for e in es)
    names_local = collections.Counter(e.get('venue') for e in es if e.get('venue'))
    addrs = collections.Counter(e.get('venue_address') for e in es if e.get('venue_address'))
    addrs_en = collections.Counter(e.get('venue_address_en') for e in es if e.get('venue_address_en') and 'not found' not in e['venue_address_en'].lower())
    vid = 'V%03d' % (n + 1)
    v = {'id': vid, 'city': es[0]['city'], 'country': es[0]['country'],
         'name_en': VENUE_USE.get((es[0]['city'], names.most_common(1)[0][0]), names.most_common(1)[0][0]),
         'name_local': VENUE_USE.get((es[0]['city'], names_local.most_common(1)[0][0]), names_local.most_common(1)[0][0]) if names_local else '',
         'address_local': max(addrs, key=lambda a: (bool(re.search(r'\d', a)), len(a))) if addrs else '',  # the fullest spelling that has a street number
         'address_en': max(addrs_en, key=len) if addrs_en else '',
         'rooms': [], 'events': sorted(e['id'] for e in es)}
    if len(names) > 1 and (es[0]['city'], names.most_common(1)[0][0]) not in VENUE_USE:
        v['name_variants'] = sorted(names)
        review['venue_names'].append((vid, v['city'], sorted(names)))
    if len(addrs) > 1 or len(addrs_en) > 1:
        v['address_variants'] = sorted(addrs) + sorted(addrs_en)  # fullest one picked; not asked
    if False:
        review['venue_addrs'].append((vid, v['city'], sorted(addrs) + sorted(addrs_en)))
    if not v['address_local'] and not v['address_en']:
        review['venue_noaddr'].append((vid, v['city'], v['name_en']))
    venues.append(v)
    for e in es: e['_vid'] = vid

# similar venues in the same city that were not merged
for i, a in enumerate(venues):
    for b in venues[i + 1:]:
        if a['city'] != b['city']: continue
        s = max(sim(a['name_en'], b['name_en']), sim(a['name_local'], b['name_local']) if a['name_local'] and b['name_local'] else 0)
        sa = sim(a['address_local'] or a['address_en'], b['address_local'] or b['address_en'])
        done = any(a['name_en'] == VENUE_USE.get((a['city'], x)) for x in (a['name_en'],)) and a['name_en'] == b['name_en']
        if (s >= 0.8 or sa >= 0.85) and not done:
            review['venue_maybe_same'].append((a['id'], a['name_en'], b['id'], b['name_en'], a['city'], round(max(s, sa), 2)))

# ---------- hosts (groups / organizers) ----------
venue_names = collections.defaultdict(set)
for v in venues:
    for nm in v.get('name_variants', [v['name_en']]) + [v['name_local']]:
        if nm: venue_names[v['city']].add(norm(nm))


def split_host(zh, en):
    """Return (kind, display_en, display_local, people) for one organizers[] entry."""
    en = en or zh
    m = re.match(r'^(.*?)\s*[（(]\s*(.+?)\s*[)）]\s*$', en)
    people = []
    base = en
    if m and GROUP_WORDS.search(m.group(1)):
        base, inner = m.group(1).strip(), m.group(2)
        if re.fullmatch(r'[A-Z]{2,5}', inner) or (re.fullmatch(r'[\u4e00-\u9fff ]+', inner) and inner in (zh or '')) or GROUP_WORDS.search(inner):
            pass  # acronym or local name of the group, not a person
        else:
            people = [p.strip() for p in re.split(r'\s+y\s+|\s*&\s*|、|,', inner) if p.strip()]
    if m and not GROUP_WORDS.search(m.group(1)) and GROUP_WORDS.search(m.group(2)):
        inner = re.sub(r'^[\u4e00-\u9fff]+\s*|^(Zhuhai|Shenzhen|Guangzhou)\s+', '', m.group(2))  # "Nahuel（珠海 Vstar Tango）"
        return 'group', inner.strip(), '', [m.group(1).strip()]
    if re.search(r'\s(&|y)\s', base) and not GROUP_WORDS.search(base):
        return 'people', base, zh, [p.strip() for p in re.split(r'\s+&\s+|\s+y\s+', base)]
    if GROUP_WORDS.search(base) or GROUP_WORDS.search(zh or ''):
        return 'group', base, zh, people
    return 'person', base, zh, people


hosts = {}   # key -> record
alias = {}   # norm(name) -> key
ev_hosts = collections.defaultdict(list)


def get_host(kind, en, local, city):
    for nm in (en, local):
        k = norm(nm)
        if k and k in alias:
            h = hosts[alias[k]]
            h['cities'].add(city)
            if kind != h['kind']: h['mixed'] = True
            if kind == 'group' and h['kind'] != 'group': h['kind'] = 'group'
            return h
    key = norm(en) or norm(local)
    h = hosts[key] = {'kind': kind, 'name_en': en, 'name_local': local if local != en else '', 'cities': {city}, 'events': set(), 'members': set(), 'flags': []}
    for nm in (en, local):
        if norm(nm): alias[norm(nm)] = key
    return h


HOST_USE = {}
for d in DEC.get('host_same', []):
    for nm in d['names']: HOST_USE[norm(nm)] = d
def canon(en, local):
    d = HOST_USE.get(norm(en)) or HOST_USE.get(norm(local))
    return (d['name_en'], d.get('name_local', local if norm(local) != norm(en) else '')) if d else (en, local)

for e in EV:
    zhs, ens = e.get('organizers') or [], e.get('organizers_en') or []
    for i, zh in enumerate(zhs):
        en = ens[i] if i < len(ens) else None
        kind, base, local, people = split_host(zh, en)
        if kind == 'people':
            for p in people:
                p = canon(p, '')[0]
                h = get_host('person', p, '', e['city']); h['events'].add(e['id']); ev_hosts[e['id']].append(h)
            continue
        if kind == 'person' and norm(base) in venue_names[e['city']]:
            kind = 'group'
        base, local = canon(base, local)
        h = get_host(kind, base, local, e['city'])
        if local and not h['name_local']: h['name_local'] = local
        h['events'].add(e['id']); ev_hosts[e['id']].append(h)
        for p in people:
            p, pl = canon(p, '')
            ph = get_host('person', p, pl, e['city'])
            if pl and not ph['name_local']: ph['name_local'] = pl; ph['events'].add(e['id'])
            h['members'].add(ph['name_en'])

# uncertain kinds: single Latin word, no group word, not a venue name → could be a nickname or a group brand
member_names = {m for h in hosts.values() for m in h['members']}
for h in hosts.values():
    if h['kind'] == 'person' and h['name_en'] not in member_names and re.fullmatch(r"[A-Za-z][A-Za-z'.]*", h['name_en'] or '') and (h['name_en'].isupper() or len(h['events']) >= 3):
        h['flags'].append('kind?')
        review['host_kind'].append(h)
    elif h.get('mixed'):
        h['flags'].append('kind?')
        review['host_kind'].append(h)

hl = list(hosts.values())
EV_C = {e['id']: e['country'] for e in EV}
for i, a in enumerate(hl):
    for b in hl[i + 1:]:
        same_city = bool(a['cities'] & b['cities'])
        if a['name_en'] in b['members'] or b['name_en'] in a['members']: continue
        c = same_city
        s = max(sim(a['name_en'], b['name_en'], c), sim(a['name_local'], b['name_local'], c) if a['name_local'] and b['name_local'] else 0,
                sim(a['name_local'], b['name_en'], c) if a['name_local'] else 0, sim(a['name_en'], b['name_local'], c) if b['name_local'] else 0)
        if not same_city and not (a['events'] and b['events'] and {EV_C[i] for i in a['events']} & {EV_C[i] for i in b['events']}): continue
        if s >= (0.75 if same_city else 0.85) and min(len(norm(a['name_en'])), len(norm(b['name_en']))) >= 3:
            review['host_maybe_same'].append((a, b, round(s, 2)))

for h in hl:
    ms = sorted(h['members'])
    for i, x in enumerate(ms):
        for y in ms[i + 1:]:
            if x.split()[0].lower() == y.split()[0].lower():
                review['host_maybe_same'].append(({'name_en': x, 'name_local': '', 'cities': h['cities']}, {'name_en': y, 'name_local': '', 'cities': h['cities']}, 0.9))
groups, organizers = [], []
for h in sorted(hl, key=lambda h: (h['kind'], sorted(h['cities'])[0], h['name_en'].lower())):
    lst = groups if h['kind'] == 'group' else organizers
    h['id'] = ('G%03d' if h['kind'] == 'group' else 'O%03d') % (len(lst) + 1)
    lst.append(h)
name_to_id = {h['name_en']: h['id'] for h in hl}


def dump(h):
    pf = profile_of(h['name_en'], h.get('name_local'))
    r = {'id': h['id'], 'name_en': h['name_en'], 'name_local': h['name_local'], 'cities': sorted(h['cities']), 'events': sorted(h['events'])}
    if h['kind'] == 'group': r['organizers'] = sorted(name_to_id.get(m, m) for m in h['members'])
    if h['flags']: r['flags'] = h['flags']
    if pf: r['profile'] = pf
    return r


links = {}
for e in EV:
    links[e['id']] = {'venue_id': e.get('_vid'), 'host': [h['id'] for h in ev_hosts.get(e['id'], [])]}

# ---------- DJs, and the profiles already reserved on the site ----------
PROF = []
for f, role in (('organizers.json', 'organizer'), ('djs.json', 'dj')):
    fp = os.path.join(ROOT, 'asia', f)
    if os.path.exists(fp):
        for pr in json.load(open(fp, encoding='utf-8')):
            PROF.append((role, pr['id'], {norm(x) for x in [pr.get('name'), pr.get('name_zh')] + (pr.get('match') or []) if x}))
def profile_of(*names):
    ks = {norm(n) for n in names if n}
    return sorted({'%s:%s' % (r, i) for r, i, m in PROF if ks & m})

djs = {}; dj_alias = {}
def strip_paren(x):
    m = re.match(r'^(.*?)\s*[（(]\s*(.+?)\s*[)）]\s*$', x or '')
    return (m.group(1).strip(), m.group(2).strip()) if m else ((x or '').strip(), '')
for e in EV:
    loc = e.get('dj'); en = e.get('dj_en')
    loc = loc if isinstance(loc, list) else ([loc] if loc else [])
    en = en if isinstance(en, list) else ([en] if en else [])
    pairs = [(loc[i], en[i] if i < len(en) else '') for i in range(len(loc))]
    pairs += [(v, '') for v in (e.get('poster_djs') or {}).values() if v]
    for l, n in pairs:
        lb, lp = strip_paren(l); nb, np_ = strip_paren(n)
        if re.fullmatch(r'[\u4e00-\u9fff]+', lb) and np_ == lb: nb, np_ = nb, ''
        name_en = nb if nb and not re.search(r'[\u4e00-\u9fff]', nb) else (np_ if np_ and not re.search(r'[\u4e00-\u9fff]', np_) else '')
        name_local = lb if re.search(r'[\u4e00-\u9fff\uac00-\ud7af]', lb) else ''
        key = None
        for k in (norm(name_en), norm(name_local), norm(lb)):
            if k and k in dj_alias: key = dj_alias[k]; break
        if not key:
            key = norm(name_en) or norm(name_local) or norm(lb)
            djs[key] = {'name_en': name_en or lb, 'name_local': name_local, 'from': (lp if lp != name_local else ''), 'cities': set(), 'events': set()}
        for k in (norm(name_en), norm(name_local), norm(lb)):
            if k: dj_alias.setdefault(k, key)
        d = djs[key]; d['cities'].add(e['city']); d['events'].add(e['id'])
        if name_local and not d['name_local']: d['name_local'] = name_local
        if name_en and (not d['name_en'] or re.search(r'[\u4e00-\u9fff]', d['name_en'])): d['name_en'] = name_en
dj_list = []
for d in sorted(djs.values(), key=lambda d: (sorted(d['cities'])[0], d['name_en'].lower())):
    r = {'id': 'D%03d' % (len(dj_list) + 1), 'name_en': d['name_en'], 'name_local': d['name_local'], 'cities': sorted(d['cities']), 'events': sorted(d['events'])}
    if d['from']: r['from'] = d['from']
    pf = profile_of(d['name_en'], d['name_local'])
    if pf: r['profile'] = pf
    org = [h['id'] for h in organizers if norm(h['name_en']) in (norm(d['name_en']), norm(d['name_local'])) or (h['name_local'] and norm(h['name_local']) in (norm(d['name_en']), norm(d['name_local'])))]
    if org: r['also_organizer'] = org
    dj_list.append(r)

os.makedirs(OUT, exist_ok=True)
w = lambda n, o: json.dump(o, open(os.path.join(OUT, n), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
w('venues.json', venues); w('groups.json', [dump(h) for h in groups]); w('organizers.json', [dump(h) for h in organizers]); w('event_links.json', links); w('djs.json', dj_list)

# ---------- review.md (the 待确认清单) ----------
EVBY = {e['id']: e for e in EV}
VBY = {v['id']: v for v in venues}
TODAY = __import__('datetime').date.today().isoformat()
def evs(ids, k=3):
    ids = sorted(ids)
    t = '、'.join((EVBY[i].get('name_zh') or EVBY[i]['name']) for i in ids[:k])
    return t + ('等 %d 个' % len(ids) if len(ids) > k else '')
def vdesc(vid):
    v = VBY[vid]
    nm = v['name_en'] if not v['name_local'] or v['name_local'] == v['name_en'] else v['name_en'] + ' / ' + v['name_local']
    ad = v['address_local'] or v['address_en']
    return '%s（%s%s）' % (nm, ad + '；' if ad and ad != v['name_local'] else '', evs(v['events']))
def hdesc(h):
    nm = h['name_en'] + (' / ' + h['name_local'] if h.get('name_local') else '')
    return nm + ('（%s）' % evs(h['events']) if h.get('events') else '')

S = collections.OrderedDict((k, {'cn': [], 'other': []}) for k in 'ABCDEF')
def put(sec, city, text): S[sec]['cn' if CN(city) else 'other'].append('%s：%s' % (city, text))
for a, an, b, bn, c, sc in review['venue_maybe_same']: put('A', c, '%s ↔ %s' % (vdesc(a), vdesc(b)))
for vid, c, names in review['venue_names']: put('B', c, '%s 名称：%s' % (vid, ' ／ '.join(names)))
for vid, c, ad in review['venue_addrs']: put('B', c, '%s 地址写法不一：%s' % (vid, ' ／ '.join(ad)))
for a, b, sc in review['host_maybe_same']:
    city = sorted(a['cities'] | b['cities'])[0]
    put('C', city, '%s ↔ %s' % (hdesc(a), hdesc(b)))
for h in review['host_kind']: put('D', sorted(h['cities'])[0], '%s（目前先当作%s）' % (hdesc(h), '团体' if h['kind'] == 'group' else '个人'))
for eid, c, nm in review['venue_tba']: put('E', c, '%s（%s）场地写“待定”' % (EVBY[eid].get('name_zh') or nm, eid))
for vid, c, nm in review['venue_noaddr']: put('E', c, '%s 没有地址' % vdesc(vid))
# F: data and posters on live cards
for e in EV:
    if e.get('hidden'): continue
    if e['kind'] == 'event' and (e.get('end') or e.get('start') or '9999') < TODAY: continue
    nm = '%s（%s）' % (e.get('name_zh') or e['name'], e['id'])
    probs = []
    if (e.get('venue') or e.get('venue_en')) and not e.get('venue_address') and not PLACEHOLDER.match((e.get('venue_en') or '').strip()): probs.append('缺本地语言地址')
    pz = e.get('poster') or ''
    if '/generated/' in pz: probs.append('没有真实海报（目前是自动生成的图）')
    elif e['kind'] == 'weekly' and e.get('poster_dates'):
        last = max(e['poster_dates'].values())
        if last < (__import__('datetime').date.today() - __import__('datetime').timedelta(days=28)).isoformat(): probs.append('海报最新一期是 %s，超过 4 周' % last)
    if probs: put('F', e['city'], nm + '：' + '；'.join(probs))

TITLES = {'A': '这两个场地是不是同一个地方？', 'B': '同一个场地有几种写法，用哪个？（也可能是同一栋楼里不同的小场地）',
          'C': '这两个主办是不是同一个？', 'D': '这是团体还是个人？', 'E': '场地待定或没有地址（以后补）', 'F': '资料和海报要补的（只列还在进行的活动）'}
L = ['# 待确认清单（自动生成草稿）', '',
     '统计：活动卡 %d 张；场地 %d 个；团体 %d 个；组织者 %d 位。' % (len(EV), len(venues), len(groups), len(organizers)),
     '已回答的题目记在 data/entities-draft/decisions.json，不会再出现。', '',
     '# 第一部分：中国大陆和香港（先做）', '']
n = 0
def item(t):
    global n; n += 1; L.append('%d. %s' % (n, t))
for k, t in TITLES.items():
    if not S[k]['cn']: continue
    L += ['## %s. %s' % (k, t), '']
    for x in sorted(S[k]['cn']): item(x)
    L.append('')
L += ['# 第二部分：其他地区（暂缓）', '']
for k, t in TITLES.items():
    if S[k]['other']: L.append('- %s. %s：%d 项' % (k, t, len(S[k]['other'])))
L += ['', '明细在 review-other.md。', '']
O = ['# 其他地区待确认（暂缓）', '']
for k, t in TITLES.items():
    if S[k]['other']:
        O += ['## %s. %s' % (k, t), ''] + ['- ' + x for x in sorted(S[k]['other'])] + ['']
open(os.path.join(OUT, 'review.md'), 'w', encoding='utf-8').write('\n'.join(L) + '\n')
open(os.path.join(OUT, 'review-other.md'), 'w', encoding='utf-8').write('\n'.join(O) + '\n')
print('djs', len(dj_list), [d for d in dj_list if d.get('profile') or d.get('also_organizer')][:6])
print('venues', len(venues), 'groups', len(groups), 'organizers', len(organizers), 'China items', n, {k: (len(v['cn']), len(v['other'])) for k, v in S.items()})

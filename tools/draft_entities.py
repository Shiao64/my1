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
         'name_en': names.most_common(1)[0][0], 'name_local': names_local.most_common(1)[0][0] if names_local else '',
         'address_local': addrs.most_common(1)[0][0] if addrs else '',
         'address_en': addrs_en.most_common(1)[0][0] if addrs_en else '',
         'rooms': [], 'events': sorted(e['id'] for e in es)}
    if len(names) > 1:
        v['name_variants'] = sorted(names)
        review['venue_names'].append((vid, v['city'], sorted(names)))
    if len(addrs) > 1 or len(addrs_en) > 1:
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
        if s >= 0.8 or sa >= 0.85:
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


for e in EV:
    zhs, ens = e.get('organizers') or [], e.get('organizers_en') or []
    for i, zh in enumerate(zhs):
        en = ens[i] if i < len(ens) else None
        kind, base, local, people = split_host(zh, en)
        if kind == 'people':
            for p in people:
                h = get_host('person', p, '', e['city']); h['events'].add(e['id']); ev_hosts[e['id']].append(h)
            continue
        if kind == 'person' and norm(base) in venue_names[e['city']]:
            kind = 'group'
        h = get_host(kind, base, local, e['city'])
        h['events'].add(e['id']); ev_hosts[e['id']].append(h)
        for p in people:
            ph = get_host('person', p, '', e['city']); ph['events'].add(e['id'])
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
for i, a in enumerate(hl):
    for b in hl[i + 1:]:
        same_city = bool(a['cities'] & b['cities'])
        if a['name_en'] in b['members'] or b['name_en'] in a['members']: continue
        c = same_city
        s = max(sim(a['name_en'], b['name_en'], c), sim(a['name_local'], b['name_local'], c) if a['name_local'] and b['name_local'] else 0,
                sim(a['name_local'], b['name_en'], c) if a['name_local'] else 0, sim(a['name_en'], b['name_local'], c) if b['name_local'] else 0)
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
    r = {'id': h['id'], 'name_en': h['name_en'], 'name_local': h['name_local'], 'cities': sorted(h['cities']), 'events': sorted(h['events'])}
    if h['kind'] == 'group': r['organizers'] = sorted(name_to_id.get(m, m) for m in h['members'])
    if h['flags']: r['flags'] = h['flags']
    return r


links = {}
for e in EV:
    links[e['id']] = {'venue_id': e.get('_vid'), 'host': [h['id'] for h in ev_hosts.get(e['id'], [])]}

os.makedirs(OUT, exist_ok=True)
w = lambda n, o: json.dump(o, open(os.path.join(OUT, n), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
w('venues.json', venues); w('groups.json', [dump(h) for h in groups]); w('organizers.json', [dump(h) for h in organizers]); w('event_links.json', links)

# ---------- review.md (the 待确认清单) ----------
L = ['# 待确认清单（自动生成草稿）', '',
     '统计：活动卡 %d 张；场地 %d 个；团体 %d 个；组织者 %d 位。' % (len(EV), len(venues), len(groups), len(organizers)), '']
n = 0
def item(t):
    global n; n += 1; L.append('%d. %s' % (n, t))
L += ['## A. 这两个场地是不是同一个地方？', '']
for a, an, b, bn, c, s in review['venue_maybe_same']: item('%s：%s（%s） ↔ %s（%s）' % (c, an, a, bn, b))
L += ['', '## B. 同一个场地有几种写法，用哪个？（也可能是同一栋楼里不同的小场地）', '']
for vid, c, names in review['venue_names']: item('%s %s：%s' % (c, vid, ' ／ '.join(names)))
for vid, c, ad in review['venue_addrs']: item('%s %s 地址不一致：%s' % (c, vid, ' ／ '.join(ad)))
L += ['', '## C. 这两个主办是不是同一个？', '']
for a, b, s in review['host_maybe_same']:
    item('%s：%s ↔ %s' % ('、'.join(sorted(a['cities'] | b['cities'])), a['name_en'] + (' / ' + a['name_local'] if a['name_local'] else ''), b['name_en'] + (' / ' + b['name_local'] if b['name_local'] else '')))
L += ['', '## D. 这是团体还是个人？', '']
for h in review['host_kind']: item('%s：%s%s（%d 个活动，目前先当作%s）' % ('、'.join(sorted(h['cities'])), h['name_en'], ' / ' + h['name_local'] if h['name_local'] else '', len(h['events']), '团体' if h['kind'] == 'group' else '个人'))
L += ['', '## E. 没有地址的场地（以后补，不用现在回答）', '']
for eid, c, nm in review['venue_tba']: item('%s：%s（%s）场地写的是“待定”' % (c, nm, eid))
for vid, c, nm in review['venue_noaddr']: item('%s %s：%s' % (c, vid, nm))
open(os.path.join(OUT, 'review.md'), 'w', encoding='utf-8').write('\n'.join(L) + '\n')
print('venues', len(venues), 'groups', len(groups), 'organizers', len(organizers), 'review items', n)
print({k: len(v) for k, v in review.items()})

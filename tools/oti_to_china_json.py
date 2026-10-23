#!/usr/bin/env python3
"""Convert OnlyTangoInfo public data (decrypted `var publicEvent=[...]` JS) into china/events.json.

Usage: python3 tools/oti_to_china_json.py [/workspace/oti_fresh.js] [china/events.json] [--updated 2026-10-21]
Read-only with respect to OnlyTangoInfo: this only reads a local dump.
"""
import json, re, sys, datetime, os

SRC = '/workspace/oti_fresh.js'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'china', 'events.json')
UPDATED = '2026-10-21'
args = [a for a in sys.argv[1:]]
if '--updated' in args:
    i = args.index('--updated'); UPDATED = args[i+1]; del args[i:i+2]
if args: SRC = args[0]
if len(args) > 1: OUT = args[1]

def load_rows(path):
    s = open(path, encoding='utf-8').read()
    j = s.index('[', s.index('var publicEvent='))
    depth = 0; k = j; instr = esc = False
    while True:
        c = s[k]
        if instr:
            if esc: esc = False
            elif c == '\\': esc = True
            elif c == '"': instr = False
        elif c == '"': instr = True
        elif c == '[': depth += 1
        elif c == ']':
            depth -= 1
            if depth == 0: break
        k += 1
    return json.loads(re.sub(r',\s*([\]\}])', r'\1', s[j:k+1]))

MON = {m: i+1 for i, m in enumerate('JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC'.split())}

def fields(s):
    out = {}
    if not s or s == '-': return out
    for part in s.split('#'):
        if ':' in part:
            k, v = part.split(':', 1); out[k] = v
    return out

def lst(v):
    if not v: return []
    v = v.strip()
    if v.startswith('{') and v.endswith('}'): v = v[1:-1]
    return [x.strip() for x in v.split('¬') if x.strip() and x.strip() != '?']

def clean_orgs(name, orgs):
    res = []
    for o in orgs:
        if o == 'Daisy Tasng': continue               # OTI typo alias of Daisy Tsang
        if o == name or o.startswith('More than Tango'): continue
        if ' & ' in o and name.startswith('More than'):
            res += [x.strip() for x in o.split(' & ')]; continue
        if name == 'Wutong Tango Weekend':            # "{Milonga 1758(Sissi Zheng¬Wing Jiang)}"
            m = re.match(r'(.+?)\((.+)$', o)
            if m: res += [m.group(1).strip(), m.group(2).strip()]; continue
            o = o.rstrip(')')
        res.append(o)
    out = []
    for x in res:
        if x not in out: out.append(x)
    return out

def links(url, f):
    fb = url if 'facebook.com' in url else None
    other = f.get('www') or (url if url and not fb else None)
    return {'facebook': fb, 'video': f.get('vid') or None, 'other': other or None}

def main():
    rows = load_rows(SRC)
    venues = {}
    for r in rows:
        if r[1] in ('China', 'Taiwan', 'Hong Kong', 'Macau') and r[3] == 'venue':
            venues[r[4]] = fields(r[5]).get('dir') or None
    recs = []
    for r in rows:
        _, country, city, typ, name, fs, _, url = r[:8]
        if country not in ('China', 'Taiwan', 'Hong Kong', 'Macau'): continue
        url = url if url not in ('-', '') else ''
        f = fields(fs)
        region = 'Hong Kong' if city == 'Hong Kong' else ('Macau' if city == 'Macau' else country)
        rec = dict(id=r[-1], kind=None, type=None, name=name, city=city, country=country, region=region,
                   start=None, end=None, weekday=None, weekdays=None, time=None,
                   venue=f.get('loc') or None, venue_address=venues.get(f.get('loc', '')) if f.get('loc') else None,
                   organizers=clean_orgs(name, lst(f.get('org', ''))), links=links(url, f),
                   source='OnlyTangoInfo', updated=UPDATED)
        fec = f.get('fec', '')
        if typ.startswith('event'):
            sub = typ.split(' ', 1)[1] if ' ' in typ else 'event'
            # keep OTI subtype as-is (festival, marathon, encuentro, championship, ...); page groups them under Festival
            rec.update(kind='event', type=sub)
            if fec.startswith('EVT.'):
                _, _, mon, days, yr = fec.split('.')
                m, y = MON[mon], int(yr)
                a, b = (days.split('-') + [days])[:2]; a, b = int(a), int(b)
                sd = datetime.date(y, m, a)
                if b < a:  # crosses into next month
                    em, ey = (m+1, y) if m < 12 else (1, y+1); ed = datetime.date(ey, em, b)
                else: ed = datetime.date(y, m, b)
                rec.update(start=sd.isoformat(), end=ed.isoformat())
        elif typ in ('milonga', 'practica'):
            t = 'practica' if re.search(r'练习|practica', name, re.I) else typ
            rec.update(kind='weekly', type=t)
            if fec.startswith('REG.W.'):
                _, _, dpart, tm = fec.split('.')
                ds = list(range(*[int(x) + i for i, x in enumerate(dpart.split('-'))])) if '-' in dpart else [int(dpart)]
                t1, t2 = tm.split('-')
                rec.update(weekday=ds[0], weekdays=ds, time=f'{t1[:2]}:{t1[2:]}–{t2[:2]}:{t2[2:]}')
        else:
            continue  # venues, academies, people and resource lists (e.g. 'milongas de Pekín', milonga.tw) are not listings
        recs.append(rec)
    # Manual additions per owner (kept across weekly updates)
    OVERRIDES = {
        'aanirocB': {  # Tango Wonderland, Taipei
            'organizers': ['Rebecca Meow', 'Taichung Tango Academy'],
            'links': {'other': 'https://www.taichungtta.com/'},
        },
    }
    for r in recs:
        o = OVERRIDES.get(r['id'])
        if not o: continue
        for k, v in o.items():
            if k == 'links': r['links'].update(v)
            else: r[k] = v
    # Non-OTI listings the owner asked to keep (survives weekly regen)
    MANUAL = [
        {
            'id': 'manual-hz-jinsha',
            'kind': 'event',
            'type': 'festival',
            'name': 'Hangzhou Jinsha International Tango Festival',
            'city': 'Hangzhou',
            'country': 'China',
            'region': 'China',
            'start': '2026-11-05',
            'end': '2026-11-09',
            'weekday': None,
            'weekdays': None,
            'time': None,
            'venue': 'Jinsha Lake Grand Theatre (金沙湖大剧院)',
            'venue_address': '金沙湖, Hangzhou',
            'organizers': ['蒋黎黎 Lily'],
            'links': {
                'facebook': None,
                'video': None,
                'other': 'https://uzzfwntg.jsjform.com/f/NBcCOy',
                'wechat': 'https://mp.weixin.qq.com/s/3w6PRyzOzKG-jHIch8fGEg',
            },
            'source': 'manual:web+wechat',
            'updated': UPDATED,
            'hidden': False,
            'hidden_reason': None,
            'tba': False,
        },
    ]
    have = {r['id'] for r in recs}
    for m in MANUAL:
        if m['id'] not in have:
            recs.append(m)
    # COMPLETE data set (owner 2026-10-23): nothing is dropped here; filtering is display-only on the page.
    # Owner's display decisions are kept as flags:
    HIDE_IDS = {'GpOaldUV': 'Owner excluded: As Tango (Beijing) – no date/organizer',
                'qIDsVZoD': 'Owner excluded: Beijing Tango Marathon La Ideal – no date'}
    HIDE_CITIES = {'Wuhan': 'Owner excluded: Wuhan'}
    for r in recs:
        reason = HIDE_IDS.get(r['id']) or HIDE_CITIES.get(r['city'])
        r['hidden'] = bool(reason)
        r['hidden_reason'] = reason
        r['tba'] = (r['kind'] == 'event' and not r.get('start')) or (r['kind'] == 'weekly' and r.get('weekday') is None)
    kind_o = {'event': 0, 'weekly': 1}
    recs.sort(key=lambda x: (x['city'], kind_o[x['kind']], x['start'] or '9999', x['name']))
    os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as fh:
        json.dump(recs, fh, ensure_ascii=False, indent=1)
    from collections import Counter
    print(len(recs), 'records ->', OUT)
    print(Counter((x['kind'], 'dated' if x['start'] else ('sched' if x['weekday'] is not None else 'tba')) for x in recs), 'hidden:', sum(x['hidden'] for x in recs))

if __name__ == '__main__':
    main()

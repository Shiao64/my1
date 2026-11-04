#!/usr/bin/env python3
"""Diff asia/events.json between two git revisions and build web-push messages.

New visible cards -> "新活动 / New event". New or edited temp changes (status changed|cancelled, not expired)
-> "临时变更 / Temporarily changed" or "已取消 / Cancelled". Output: JSON list of
{title_zh,title_en,body_zh,body_en,url_zh,url_en,tag} on stdout (max 5; extras folded into one summary).

  python3 tools/push_diff.py BEFORE_SHA AFTER_SHA
  python3 tools/push_diff.py --files old.json new.json
"""
import json, subprocess, sys, datetime
SITE = 'https://tangoweekend.org'
MAX = 5

def today(): return (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=8)).strftime('%Y-%m-%d')
def at(rev, path='asia/events.json'):
    try: return json.loads(subprocess.check_output(['git', 'show', f'{rev}:{path}'], stderr=subprocess.DEVNULL))
    except Exception: return []
def by_id(L): return {e['id']: e for e in (L if isinstance(L, list) else L.get('events', [])) if isinstance(e, dict) and e.get('id')}
def visible(e): return e.get('hidden') is not True
def url(e, zh): return f"{SITE}{'/zh' if zh else ''}/asia/?card={e['id']}"
def changes(e):
    return {(o.get('date') or o.get('start')): o for o in (e.get('temp_notices') or [])
            if isinstance(o, dict) and o.get('status') in ('changed', 'cancelled') and (o.get('end') or o.get('date') or o.get('start') or '') >= today()}
def md(d):
    p = d.split('-'); return f'{int(p[1])}/{int(p[2])}' if len(p) == 3 else d
def where(e):
    zh = e.get('name_zh') or e.get('name') or e['id']; en = e.get('name') or zh
    return zh, en, e.get('city') or '', e.get('city_zh') or e.get('city') or ''

def build(old, new):
    O, N, out = by_id(old), by_id(new), []
    for i, e in N.items():
        if not visible(e): continue
        zh, en, city, cityz = where(e)
        if i not in O or not visible(O[i]):
            when = md(e['start']) if e.get('start') else ''
            out.append(dict(tag='new-' + i, title_zh='新活动：' + zh, title_en='New event: ' + en,
                            body_zh=' '.join(x for x in [cityz, when] if x), body_en=' '.join(x for x in [city, when] if x),
                            url_zh=url(e, True), url_en=url(e, False)))
            continue
        oc, nc = changes(O[i]), changes(e)
        for d, o in nc.items():
            if oc.get(d) == o: continue
            cx = o['status'] == 'cancelled'
            bits_zh = [o.get('text') or ''] if o.get('text') else [x for x in [o.get('time'), o.get('venue'), o.get('fee'), o.get('dj') and 'DJ ' + o['dj']] if x]
            bits_en = [o.get('text_en') or ''] if o.get('text_en') else [x for x in [o.get('time'), o.get('venue_en') or o.get('venue'), o.get('fee_en') or o.get('fee'), o.get('dj') and 'DJ ' + o['dj']] if x]
            out.append(dict(tag=f'chg-{i}-{d}',
                            title_zh=f"{'已取消' if cx else '临时变更'} {md(d)}：{zh}",
                            title_en=f"{'Cancelled' if cx else 'Temporarily changed'} {md(d)}: {en}",
                            body_zh=('，'.join(bits_zh))[:120], body_en=('; '.join(bits_en))[:120],
                            url_zh=url(e, True), url_en=url(e, False)))
    if len(out) > MAX:
        rest = len(out) - (MAX - 1)
        out = out[:MAX - 1] + [dict(tag='more', title_zh=f'还有 {rest} 条新活动/变更', title_en=f'{rest} more new events or changes',
                                    body_zh='打开亚洲探戈地图查看', body_en='Open the Asia Tango Map',
                                    url_zh=SITE + '/zh/asia/', url_en=SITE + '/asia/')]
    return out

if __name__ == '__main__':
    a = sys.argv[1:]
    if a[:1] == ['--files']: old, new = json.load(open(a[1])), json.load(open(a[2]))
    else: old, new = at(a[0]), at(a[1])
    print(json.dumps(build(old, new), ensure_ascii=False))

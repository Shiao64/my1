#!/usr/bin/env python3
"""Write china/events-changes.json: diff between previous and new events.json.

Usage: python3 tools/oti_changes.py OLD.json NEW.json OUT.json [--date YYYY-MM-DD] [--source-updated YYYY-MM-DD]
Always writes OUT (empty lists if nothing changed).
"""
import json, sys, datetime

args = sys.argv[1:]
def opt(name, default):
    if name in args:
        i = args.index(name); v = args[i+1]; del args[i:i+2]; return v
    return default
date = opt('--date', datetime.date.today().isoformat())
src_upd = opt('--source-updated', None)
old_p, new_p, out_p = args[:3]

def load(p):
    try: return json.load(open(p, encoding='utf-8'))
    except Exception: return []

def when(r):
    if r.get('kind') == 'event':
        return f"{r.get('start')}..{r.get('end')}" if r.get('end') and r.get('end') != r.get('start') else r.get('start')
    days = 'Mon Tue Wed Thu Fri Sat Sun'.split()
    wd = r.get('weekdays') or ([r['weekday']] if r.get('weekday') is not None else [])
    return ' '.join(days[(d - 1) % 7] if isinstance(d, int) else str(d) for d in wd) + (f" {r['time']}" if r.get('time') else '')

def view(r):
    return {'name': r.get('name'), 'city': r.get('city'), 'type': r.get('type'), 'when': when(r),
            'venue': r.get('venue'), 'organizers': r.get('organizers') or []}

old = {r['id']: r for r in load(old_p)}
new = {r['id']: r for r in load(new_p)}
added = [dict(id=i, **view(new[i])) for i in new if i not in old]
removed = [dict(id=i, **view(old[i])) for i in old if i not in new]
updated = []
for i in new:
    if i in old:
        a, b = view(old[i]), view(new[i])
        diff = {k: {'old': a[k], 'new': b[k]} for k in a if a[k] != b[k]}
        if diff: updated.append({'id': i, 'name': b['name'], 'city': b['city'], 'changes': diff})
res = {'date': date, 'source': 'OnlyTangoInfo', 'source_updated': src_upd,
       'total_before': len(old), 'total_after': len(new),
       'added': added, 'removed': removed, 'updated': updated}
json.dump(res, open(out_p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f"changes: +{len(added)} -{len(removed)} ~{len(updated)} -> {out_p}")

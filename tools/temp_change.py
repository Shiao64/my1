#!/usr/bin/env python3
"""Admin: mark one date of an event as temporarily changed or cancelled (no event is deleted).

Writes a temp_notices item with status "changed"|"cancelled" into every asia/events*.json copy of the card.
The card shows 「临时变更」/"Temporarily changed" or 「已取消」/"Cancelled" until the date passes (Asia/Shanghai).
Pushing to main triggers .github/workflows/push-notify.yml, which sends a web push.

  python3 tools/temp_change.py set R222 2026-11-05 --time 20:30–00:30 --venue "X" --venue-en "X" \
          --address "..." --address-en "..." --fee "HK$120" --fee-en "HK$120" --dj "Stefan Pan" \
          --text "中文说明" --text-en "English note"
  python3 tools/temp_change.py cancel R222 2026-11-05 --text "场地维修，本周停一次" --text-en "Venue repairs, off this week"
  python3 tools/temp_change.py clear R222 2026-11-05     # remove the change for that date
  python3 tools/temp_change.py list                       # active changes
  python3 tools/temp_change.py prune                      # drop expired changes (optional; the site hides them anyway)
"""
import argparse, json, os, sys, datetime
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
FILES = ['asia/events.json', 'asia/events-core.json', 'asia/events-more.json']
FIELDS = ['time', 'venue', 'venue_en', 'address', 'address_en', 'fee', 'fee_en', 'dj', 'text', 'text_en']

def today(): return (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=8)).strftime('%Y-%m-%d')
def load(f):
    p = os.path.join(ROOT, f)
    return (json.load(open(p, encoding='utf-8')), p) if os.path.exists(p) else (None, p)
def save(d, p): open(p, 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False, separators=(',', ':')))

def is_change(o): return isinstance(o, dict) and o.get('status') in ('changed', 'cancelled')
def end_of(o): return o.get('end') or o.get('date') or o.get('start') or ''

def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('cmd', choices=['set', 'cancel', 'clear', 'list', 'prune'])
    ap.add_argument('id', nargs='?'); ap.add_argument('date', nargs='?')
    for f in FIELDS: ap.add_argument('--' + f.replace('_', '-'))
    a = ap.parse_args(argv)
    if a.cmd in ('set', 'cancel', 'clear') and not (a.id and a.date):
        ap.error('id and date (YYYY-MM-DD) required')
    if a.date:
        datetime.date.fromisoformat(a.date)
    hit = 0
    for f in FILES:
        d, p = load(f)
        if d is None: continue
        evs = d if isinstance(d, list) else d.get('events', [])
        dirty = False
        for e in evs:
            tn = e.get('temp_notices') or []
            if a.cmd == 'list':
                if f == FILES[0]:
                    for o in tn:
                        if is_change(o) and end_of(o) >= today(): print(e['id'], json.dumps(o, ensure_ascii=False))
                continue
            if a.cmd == 'prune':
                keep = [o for o in tn if not (is_change(o) and end_of(o) < today())]
                if len(keep) != len(tn): e['temp_notices'] = keep; dirty = True
                continue
            if e.get('id') != a.id: continue
            hit += 1
            tn = [o for o in tn if not (is_change(o) and (o.get('date') == a.date or o.get('start') == a.date))]
            if a.cmd != 'clear':
                o = {'status': 'changed' if a.cmd == 'set' else 'cancelled', 'date': a.date}
                for k in FIELDS:
                    v = getattr(a, k)
                    if v: o[k] = v
                tn.append(o)
            if tn: e['temp_notices'] = tn
            else: e.pop('temp_notices', None)
            e['updated'] = today(); dirty = True
        if dirty: save(d, p); print('wrote', f)
    if a.cmd in ('set', 'cancel', 'clear') and not hit:
        print('no card with id', a.id, file=sys.stderr); return 1
    return 0

if __name__ == '__main__': sys.exit(main())

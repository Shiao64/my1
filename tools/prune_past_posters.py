#!/usr/bin/env python3
"""Drop expired past posters from the event cards.

Rule (2026-11-17, Shiao): a card keeps at most 4 past posters, and none dated more
than 30 days ago. A past poster with no known date stays. A card that has no current
poster keeps its newest past poster so it never turns blank.

Dry run by default; --apply writes asia/events*.json. Dropped files are copied to
images/asia/posters/_backup (never deleted). Run: python3 tools/prune_past_posters.py [--apply]
"""
import datetime
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import radar_poster_update as rpu

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def prune_card(card, today):
    """Return the list of dropped paths; edits card['posters_past'] in place."""
    past = card.get('posters_past')
    if not isinstance(past, list) or not past:
        return []
    dates = card.get('poster_dates') if isinstance(card.get('poster_dates'), dict) else None
    kept, dropped = rpu.trim_past(past, rpu.MAX_PAST, dates, today, rpu.MAX_AGE_DAYS)
    if not kept and not card.get('poster') and dropped:
        keep_one = max(dropped, key=lambda p: rpu.known_poster_date(p, dates) or '')
        dropped.remove(keep_one)
        kept = [keep_one]
    if dropped:
        card['posters_past'] = kept
    return dropped


def main(argv):
    apply = '--apply' in argv
    today = datetime.date.today()
    for a in argv:
        if a.startswith('--today='):
            today = datetime.date.fromisoformat(a.split('=', 1)[1])
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    total = {}
    for rel in rpu.EVENT_FILES:
        path = os.path.join(ROOT, rel)
        if not os.path.isfile(path):
            continue
        with open(path, encoding='utf-8') as fh:
            raw = fh.read()
        rows = json.loads(raw)
        changed = False
        for card in rows:
            if not isinstance(card, dict):
                continue
            dropped = prune_card(card, today)
            if dropped:
                changed = True
                for p in dropped:
                    total.setdefault((card.get('id'), p), None)
        if changed and apply:
            with open(path, 'w', encoding='utf-8') as fh:
                # Keep the file's own ending (events-more.json ends with a newline).
                fh.write(json.dumps(rows, ensure_ascii=False, separators=(',', ':')) + ('\n' if raw.endswith('\n') else ''))
    for (cid, p) in sorted(total):
        print(('drop ' if apply else 'would drop ') + '%s %s' % (cid, p))
        if apply:
            rpu.archive_poster(ROOT, cid, p, stamp)
    print('%d past poster(s) %s' % (len(total), 'dropped' if apply else 'would be dropped (dry run)'))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))

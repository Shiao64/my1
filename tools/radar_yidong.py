#!/usr/bin/env python3
"""Tango radar 异动 path.

This is the operator entry for a radar change run. Replacing a regular
milonga / practica / dated-oneoff poster is a fixed step of every run: this
script always calls tools/radar_poster_update.py. A 异动 that found a new
organizer poster and did not put it in posters[] is refused, not skipped.

When it fires
  Every radar 异动 (new or changed regular listing, including the nightly
  scan when it has something to publish). Featured-festival posters are not
  part of this step.

How to run (repo root):
  python3 tools/radar_yidong.py --notes path/to/yidong.json
  python3 tools/radar_yidong.py --notes path/to/yidong.json --dry-run
  python3 tools/radar_yidong.py --event-id R030 --image https://host/poster.jpg \\
      --city Shanghai --weekday 6 --note "G03 2026-11-02 new poster"

Notes file:
  {
    "date": "2026-11-02",
    "source": "radar",
    "posters": [
      {
        "event_id": "R030",
        "radar_id": "R030",
        "image": "https://example.com/poster.jpg",
        "city": "上海",
        "organizers": ["麦克的探戈世界"],
        "weekday": "周六",
        "note": "which group / post this image came from"
      }
    ],
    "other_changes": "optional text this tool does not apply"
  }

event_id is the events.json id (雷达表「草稿内部ID」). radar_id alone is
accepted only when that number is itself the events.json id. City may be
Chinese (北京) or English (Beijing). Weekday is 0=Sun .. 6=Sat or 周二 /
每月第2个周六.

On a real replace the tool backs up the old poster, writes the new file and
thumb, updates poster, logs tools/radar-poster-log.jsonl, and bumps e/china/h/cb.
Pass --no-bump only when a later publish commit will bump those keys itself.
--dry-run downloads and reports; it does not write.

Needs Pillow (pip install pillow).
"""
from __future__ import annotations

import argparse
import datetime
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import radar_poster_update as poster  # noqa: E402

KNOWN = {'date', 'source', 'posters', 'other_changes', 'note'}
# keys that mean "there are poster discoveries" but were not put in posters[]
SUSPECT = ('new_posters', 'poster_updates', 'images', 'image', 'poster', '海报')


def load_notes(path):
    with open(path, encoding='utf-8') as fh:
        doc = json.load(fh)
    if not isinstance(doc, dict):
        raise poster.Refuse('notes file must be a JSON object')
    unknown = [k for k in doc if k not in KNOWN]
    bad = [k for k in unknown if 'poster' in k.lower() or k in SUSPECT or '图' in k]
    if bad:
        raise poster.Refuse(
            'put poster discoveries in posters[], not %s. The 异动 path will not guess.' % ', '.join(bad)
        )
    items = doc.get('posters')
    if items is None:
        items = []
    if not isinstance(items, list):
        raise poster.Refuse('posters must be a list (empty if this 异动 has no new poster)')
    return doc, items


def run(root, items, *, dry_run, bump, today, source):
    result = poster.apply_items(
        root, items, dry_run=dry_run, bump_caches=(bump and not dry_run), today=today, log=not dry_run,
    )
    summary = {
        'path': 'radar-异动',
        'source': source,
        'date': today,
        'poster_step': 'ran',
        'candidates': len(items),
        'replaced': len(result['replaced']),
        'unchanged': len(result['unchanged']),
        'refused': len(result['refused']),
        'caches': result['caches'],
        'dry_run': dry_run,
        'detail': result,
    }
    if not dry_run:
        poster.append_log(root, {
            'ts': poster._stamp(),
            'action': 'yidong',
            'source': source,
            'candidates': len(items),
            'replaced': [r['id'] for r in result['replaced']],
            'unchanged': [r['id'] for r in result['unchanged']],
            'refused': [{'id': r['id'], 'reason': r['reason']} for r in result['refused']],
        })
    return summary


def main(argv=None):
    p = argparse.ArgumentParser(description='Radar 异动 path. Always runs the regular-poster step.')
    p.add_argument('--root', default=poster.ROOT)
    p.add_argument('--notes', help='JSON file with a posters array (use [] when there is no new poster)')
    p.add_argument('--event-id')
    p.add_argument('--radar-id')
    p.add_argument('--image')
    p.add_argument('--city')
    p.add_argument('--organizer', action='append', default=[])
    p.add_argument('--weekday')
    p.add_argument('--date', dest='event_date')
    p.add_argument('--note', default='')
    p.add_argument('--source', default='radar')
    p.add_argument('--today', default=datetime.date.today().isoformat())
    p.add_argument('--dry-run', action='store_true')
    p.add_argument('--no-bump', action='store_true', help='do not bump e/china/h/cb after a replace')
    args = p.parse_args(argv)
    items = []
    source = args.source
    if args.notes:
        doc, items = load_notes(args.notes)
        source = doc.get('source') or source
        if doc.get('date'):
            args.today = str(doc['date'])[:10]
    if args.event_id or args.radar_id or args.image:
        if not args.image or not (args.event_id or args.radar_id):
            p.error('a single poster needs --image and --event-id or --radar-id')
        one = {'image': args.image, 'note': args.note}
        if args.event_id:
            one['event_id'] = args.event_id
        if args.radar_id:
            one['radar_id'] = args.radar_id
        if args.city:
            one['city'] = args.city
        if args.organizer:
            one['organizers'] = args.organizer
        if args.weekday is not None:
            one['weekday'] = args.weekday
        if args.event_date:
            one['date'] = args.event_date
        items.append(one)
    if not args.notes and not items:
        p.error('pass --notes (posters may be []) or one --event-id/--image item')
    try:
        summary = run(args.root, items, dry_run=args.dry_run, bump=not args.no_bump, today=args.today, source=source)
    except poster.Refuse as exc:
        print(exc.reason, file=sys.stderr)
        return 2
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if not summary['detail']['refused'] else 2


if __name__ == '__main__':
    sys.exit(main())

#!/usr/bin/env python3
"""Replace organizer posters for regular milongas, practicas, and dated one-offs.

This module is the poster step of the tango radar 异动 path. Operators run
`tools/radar_yidong.py`, which always calls `apply_items` here. Do not treat
a direct run as a substitute for that path, and do not copy posters in by hand
when this step can see an explicit match.

What it does, per item that passes the checks:
  1. Download the new organizer image (http/https or a local file).
  2. Copy the previous poster to images/asia/posters/_backup/<id>-<utc>.<ext>
     before any bytes are overwritten. The previous file is never deleted.
  3. Store the new file under images/asia/posters/<id>.<ext>.
  4. Write an ~800px-wide thumb (no upscale) as WebP and JPEG at
     images/thumb/images/asia/posters/<id>.webp and .jpg, and record its
     pixel size in asia/asia-map.js ATM_TH.
  5. Set that event's `poster` (and `updated`) in events.json and, when the
     same id is present, events-core.json / events-more.json.
  6. Append a line to tools/radar-poster-log.jsonl.
  7. When asked (the 异动 runner does this after a real replace), bump the live
     cache keys eNNN, chinaNNN, hNN, cbNN the same way a publish commit does.
     SITE_VERSION is left alone.

Mis-replace protections (a failed check refuses the item; nothing is written):
  - Explicit events.json id, or a radar id that IS that id. No name/city search.
  - event_id and radar_id must not point at two different rows.
  - Target must be kind=weekly, or kind=event with regular_oneoff (dated one-off).
    Featured festivals and other non-regular events are skipped.
  - Hidden rows are skipped.
  - Class ads are skipped (课系 / 大师课 / 工作坊 / workshop / master class),
    and type=class rows are out of scope.
  - City, organizers, weekday, and start date are checked when the note supplies
    them. A mismatch refuses. At least one of those, a note, or a filename that
    contains this event id is required.
  - A filename that contains a different events.json id refuses.
  - A poster file still referenced by another event is not overwritten; this
    event gets its own file. Shared files stay on disk.

Usage (prefer the 异动 runner):
  python3 tools/radar_yidong.py --notes day.json
  python3 tools/radar_yidong.py --event-id R030 --image https://example.com/a.jpg \\
      --city Shanghai --note "G03 new poster"
"""
from __future__ import annotations

import datetime
import hashlib
import io
import json
import os
import re
import shutil
import sys
import urllib.request
from urllib.parse import urlparse

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
EVENT_FILES = ('asia/events.json', 'asia/events-core.json', 'asia/events-more.json')
LOG_REL = 'tools/radar-poster-log.jsonl'
BACKUP_REL = 'images/asia/posters/_backup'
POSTER_DIR = 'images/asia/posters'
MAP_JS = 'asia/asia-map.js'
MAX_BYTES = 20_000_000
MIN_BYTES = 800
MIN_PX = 80
THUMB_W = 800
UA = 'AsiaTangoMap-radar/1.0'

# Chinese labels operators paste from 雷达表. Not used to find an event — only
# to compare a city the note already named with the matched row.
CITY_ALIAS = {
    '北京': 'Beijing', '上海': 'Shanghai', '广州': 'Guangzhou', '深圳': 'Shenzhen',
    '天津': 'Tianjin', '杭州': 'Hangzhou', '南京': 'Nanjing', '成都': 'Chengdu',
    '重庆': 'Chongqing', '武汉': 'Wuhan', '西安': "Xi'an", '青岛': 'Qingdao',
    '海口': 'Haikou', '苏州': 'Suzhou', '郑州': 'Zhengzhou', '香港': 'Hong Kong',
    '台北': 'Taipei', '台中': 'Taichung', '台南': 'Tainan', '新北': 'New Taipei',
    '苗栗': 'Miaoli', '竹北': 'Zhubei', '首尔': 'Seoul', '釜山': 'Busan',
    '大田': 'Daejeon', '大邱': 'Daegu', '昌原': 'Changwon', '清州': 'Cheongju',
    '光州': 'Gwangju', '群山': 'Gunsan', '晋州': 'Jinju', '浦项': 'Pohang',
    '蔚山': 'Ulsan', '东京': 'Tokyo', '吉隆坡': 'Kuala Lumpur', '槟城': 'Penang',
    '岘港': 'Da Nang', '文莱': 'Bandar Seri Begawan',
}
WEEKDAY_TOKENS = (
    ('星期天', 0), ('星期日', 0), ('礼拜日', 0), ('周日', 0), ('sunday', 0), ('sun', 0),
    ('星期一', 1), ('礼拜一', 1), ('周一', 1), ('monday', 1), ('mon', 1),
    ('星期二', 2), ('礼拜二', 2), ('周二', 2), ('tuesday', 2), ('tues', 2), ('tue', 2),
    ('星期三', 3), ('礼拜三', 3), ('周三', 3), ('wednesday', 3), ('wed', 3),
    ('星期四', 4), ('礼拜四', 4), ('周四', 4), ('thursday', 4), ('thurs', 4), ('thur', 4), ('thu', 4),
    ('星期五', 5), ('礼拜五', 5), ('周五', 5), ('friday', 5), ('fri', 5),
    ('星期六', 6), ('礼拜六', 6), ('周六', 6), ('saturday', 6), ('sat', 6),
)
CLASS_AD = re.compile(r'课系|大师课|大师班|工作坊|workshop|master\s*class', re.I)
MILONGA_WORD = re.compile(r'milonga|practic[ae]|práctica|舞会|练习', re.I)
BLOCKED_HOSTS = {
    'localhost', '127.0.0.1', '::1', '0.0.0.0', '169.254.169.254',
    'metadata.google.internal',
}


class Refuse(Exception):
    def __init__(self, reason):
        super().__init__(reason)
        self.reason = reason


def norm(s):
    return re.sub(r'[^a-z0-9\u4e00-\u9fff]+', '', (s or '').lower())


def canon_city(s):
    s = (s or '').strip()
    s = CITY_ALIAS.get(s, s)
    return norm(s)


def load_events(root):
    path = os.path.join(root, 'asia/events.json')
    with open(path, encoding='utf-8') as fh:
        data = json.load(fh)
    if not isinstance(data, list):
        raise Refuse('asia/events.json is not a list')
    return data


def save_events(root, events):
    text = json.dumps(events, ensure_ascii=False, separators=(',', ':'))
    for rel in EVENT_FILES:
        path = os.path.join(root, rel)
        if not os.path.isfile(path):
            if rel != 'asia/events.json':
                continue
            raise Refuse('missing ' + rel)
        with open(path, encoding='utf-8') as fh:
            cur = json.load(fh)
        if not isinstance(cur, list):
            continue
        by = {e.get('id'): e for e in cur if isinstance(e, dict)}
        changed = False
        for ev in events:
            row = by.get(ev.get('id'))
            if row is None:
                continue
            past = ev.get('posters_past') if isinstance(ev.get('posters_past'), list) else None
            if row.get('poster') != ev.get('poster') or row.get('updated') != ev.get('updated') or (past is not None and row.get('posters_past') != past):
                row['poster'] = ev.get('poster')
                row['updated'] = ev.get('updated')
                if past is not None:
                    row['posters_past'] = list(past)
                changed = True
        if changed:
            raw = open(path, 'rb').read()
            out = json.dumps(cur, ensure_ascii=False, separators=(',', ':'))
            if raw.endswith(b'\n'):
                out += '\n'
            with open(path, 'w', encoding='utf-8') as fh:
                fh.write(out)


def parse_weekday(value):
    if value is None or value == '':
        return None
    if isinstance(value, bool):
        raise Refuse('weekday is not a day')
    if isinstance(value, int):
        if 0 <= value <= 6:
            return value
        raise Refuse('weekday out of range 0=Sun .. 6=Sat')
    text = str(value).strip().lower()
    if text.isdigit():
        n = int(text)
        if 0 <= n <= 6:
            return n
        raise Refuse('weekday out of range')
    found = []
    for token, n in WEEKDAY_TOKENS:
        if token in text and n not in found:
            found.append(n)
    if len(found) == 1:
        return found[0]
    if len(found) > 1:
        raise Refuse('weekday text names more than one day')
    raise Refuse('weekday not recognized')


def js_weekday(iso_date):
    y, m, d = (int(x) for x in iso_date.split('-'))
    py = datetime.date(y, m, d).weekday()  # Mon=0
    return (py + 1) % 7  # Sun=0, matches asia-map.js


def split_orgs(value):
    if value is None:
        return []
    if isinstance(value, (list, tuple)):
        parts = []
        for v in value:
            parts.extend(split_orgs(v))
        return [p for p in parts if p]
    return [p.strip() for p in re.split(r'[/、,;；|]', str(value)) if p.strip()]


def org_names(event):
    names = []
    for key in ('organizers', 'organizers_en'):
        names.extend(split_orgs(event.get(key)))
    return names


def orgs_match(given, event):
    g = [norm(x) for x in split_orgs(given)]
    g = [x for x in g if x]
    have = [norm(x) for x in org_names(event)]
    have = [x for x in have if x]
    if not g:
        return False
    if not have:
        return False
    for a in g:
        for b in have:
            if a == b or (len(a) >= 2 and len(b) >= 2 and (a in b or b in a)):
                return True
    return False


def is_regular(event):
    if event.get('hidden'):
        return False
    if event.get('type') == 'class':
        return False
    if event.get('kind') == 'weekly':
        return True
    if event.get('regular_oneoff') and event.get('kind') == 'event':
        return True
    return False


def is_class_ad(item):
    if str(item.get('ad_kind') or item.get('ad_type') or '').lower() in ('class', 'workshop', '课', '课系'):
        return True
    blob = ' '.join(str(item.get(k) or '') for k in ('note', 'title', 'image', 'filename'))
    if CLASS_AD.search(blob) and not MILONGA_WORD.search(blob):
        return True
    return False


def filename_mentions(src, event_id):
    base = os.path.basename(urlparse(str(src)).path)
    return re.search(r'(?<![A-Za-z0-9])' + re.escape(event_id) + r'(?![A-Za-z0-9])', base) is not None


def filename_conflict(src, event_id, ids):
    for other in ids:
        if other and other != event_id and len(other) >= 3 and filename_mentions(src, other):
            return other
    return None


def resolve_event(by_id, item):
    eid = str(item.get('event_id') or item.get('id') or '').strip()
    rid = str(item.get('radar_id') or '').strip()
    if not eid and not rid:
        raise Refuse('missing event_id (radar id is accepted only when it is the events.json id)')
    if eid:
        if eid not in by_id:
            raise Refuse('no events.json row for event_id %s' % eid)
        if rid and rid in by_id and rid != eid:
            raise Refuse('event_id %s and radar_id %s are different rows' % (eid, rid))
        return by_id[eid]
    if rid not in by_id:
        raise Refuse('radar_id %s is not an events.json id; pass event_id (草稿内部ID). Not guessing.' % rid)
    return by_id[rid]


def assess(events, item):
    """Return (event, checks). Raise Refuse when the item must not replace a poster."""
    if not isinstance(item, dict):
        raise Refuse('poster item is not an object')
    if is_class_ad(item):
        raise Refuse('class ad skipped (课系/大师课/工作坊/workshop)')
    src = str(item.get('image') or item.get('url') or item.get('path') or '').strip()
    if not src:
        raise Refuse('missing image')
    by_id = {e.get('id'): e for e in events if isinstance(e, dict) and e.get('id')}
    event = resolve_event(by_id, item)
    if not is_regular(event):
        why = 'hidden' if event.get('hidden') else 'not a regular milonga/practica/dated one-off'
        raise Refuse('%s (%s %s)' % (why, event.get('id'), event.get('kind')))
    conflict = filename_conflict(src, event['id'], by_id)
    if conflict:
        raise Refuse('image filename names a different event id %s' % conflict)
    checks = []
    if item.get('city'):
        if canon_city(item['city']) != canon_city(event.get('city')):
            raise Refuse('city %r does not match %s (%s)' % (item['city'], event['id'], event.get('city')))
        checks.append('city')
    if item.get('organizers') or item.get('organizer'):
        given = item.get('organizers') if item.get('organizers') else item.get('organizer')
        if not orgs_match(given, event):
            raise Refuse('organizers %r do not match %s %r' % (given, event['id'], org_names(event)))
        checks.append('organizers')
    if item.get('weekday') is not None and item.get('weekday') != '':
        wd = parse_weekday(item.get('weekday'))
        if event.get('weekday') is None:
            start = event.get('start')
            if start and js_weekday(start) != wd:
                raise Refuse('weekday does not match one-off start %s' % start)
            if not start:
                raise Refuse('event %s has no weekday to check' % event['id'])
        elif int(event['weekday']) != wd:
            raise Refuse('weekday %s does not match %s weekday %s' % (wd, event['id'], event.get('weekday')))
        checks.append('weekday')
    start = item.get('start') or item.get('date') or item.get('on')
    if start:
        start = str(start).strip()[:10]
        if event.get('start') and event['start'] != start:
            raise Refuse('date %s does not match %s start %s' % (start, event['id'], event.get('start')))
        if event.get('kind') == 'weekly' and event.get('weekday') is not None:
            if js_weekday(start) != int(event['weekday']):
                raise Refuse('date %s is not this event weekday' % start)
        checks.append('date')
    note = str(item.get('note') or '').strip()
    if note:
        checks.append('note')
    if filename_mentions(src, event['id']):
        checks.append('filename')
    if not checks:
        raise Refuse('need a corroborating city, organizers, weekday, date, note, or filename containing the event id')
    return event, checks, src


def _blocked(url):
    host = (urlparse(url).hostname or '').lower().rstrip('.')
    if host in BLOCKED_HOSTS or host.endswith('.localhost'):
        raise Refuse('refusing image host %s' % host)


def fetch_bytes(src):
    if re.match(r'https?://', src, re.I):
        _blocked(src)
        req = urllib.request.Request(src, headers={'User-Agent': UA})
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = resp.read(MAX_BYTES + 1)
        except Refuse:
            raise
        except Exception as exc:
            raise Refuse('download failed: %s' % exc)
        if len(data) > MAX_BYTES:
            raise Refuse('image larger than %s bytes' % MAX_BYTES)
        return data
    if src.startswith('file:'):
        raise Refuse('file: URLs are not accepted; pass a local path')
    path = src
    if not os.path.isabs(path):
        path = os.path.abspath(path)
    if not os.path.isfile(path):
        raise Refuse('image file not found')
    size = os.path.getsize(path)
    if size > MAX_BYTES:
        raise Refuse('image larger than %s bytes' % MAX_BYTES)
    with open(path, 'rb') as fh:
        return fh.read()


def sniff_image(data):
    try:
        from PIL import Image, ImageOps
    except ImportError:
        raise Refuse('Pillow is required (pip install pillow)')
    if len(data) < MIN_BYTES:
        raise Refuse('image too small')
    try:
        opened = Image.open(io.BytesIO(data))
        fmt = (opened.format or '').upper()
        im = ImageOps.exif_transpose(opened)
        im.load()
        im.format = fmt
    except Exception as exc:
        raise Refuse('not an image: %s' % exc)
    ext = {'JPEG': 'jpg', 'PNG': 'png', 'WEBP': 'webp', 'GIF': 'gif'}.get(fmt)
    if not ext:
        raise Refuse('unsupported image type %s' % (fmt or 'unknown'))
    w, h = im.size
    if w < MIN_PX or h < MIN_PX:
        raise Refuse('image %sx%s is below %spx' % (w, h, MIN_PX))
    return im, ext


def thumb_image(im):
    """Resize to at most THUMB_W wide. Never upscale. Returns webp, jpeg, size."""
    from PIL import Image
    rgb = im.convert('RGB')
    rgb.thumbnail((THUMB_W, THUMB_W * 8), Image.LANCZOS)
    webp = io.BytesIO()
    rgb.save(webp, 'WEBP', quality=80, method=6)
    jpg = io.BytesIO()
    rgb.save(jpg, 'JPEG', quality=82, optimize=True)
    return webp.getvalue(), jpg.getvalue(), rgb.size


def backup_poster(root, event_id, old_web, stamp):
    if not old_web:
        return None
    rel = old_web.split('?', 1)[0].lstrip('/')
    src = os.path.join(root, rel)
    if not os.path.isfile(src):
        return None
    ext = os.path.splitext(src)[1] or '.img'
    dest_dir = os.path.join(root, BACKUP_REL)
    os.makedirs(dest_dir, exist_ok=True)
    name = '%s-%s%s' % (event_id, stamp, ext)
    dest = os.path.join(dest_dir, name)
    n = 2
    while os.path.exists(dest):
        dest = os.path.join(dest_dir, '%s-%s-%s%s' % (event_id, stamp, n, ext))
        n += 1
    shutil.copy2(src, dest)
    if os.path.getsize(dest) != os.path.getsize(src):
        raise Refuse('backup size mismatch for %s' % event_id)
    return '/' + os.path.relpath(dest, root).replace(os.sep, '/')


def poster_used_by_others(events, event_id, web_path):
    if not web_path:
        return False
    q = web_path.split('?', 1)[0]
    for e in events:
        if e.get('id') == event_id:
            continue
        for key in ('poster', 'poster_zh', 'poster_en'):
            p = e.get(key)
            if p and p.split('?', 1)[0] == q:
                return True
    return False


def update_atm_th(root, web_path, size, drop_path=None):
    path = os.path.join(root, MAP_JS)
    if not os.path.isfile(path):
        return False
    text = open(path, encoding='utf-8').read()
    m = re.search(r'var ATM_TH = (\{.*?\});', text)
    if not m:
        raise Refuse('ATM_TH not found in asia-map.js')
    table = json.loads(m.group(1))
    table[web_path.split('?', 1)[0]] = [int(size[0]), int(size[1])]
    if drop_path and drop_path.split('?', 1)[0] in table and drop_path.split('?', 1)[0] != web_path.split('?', 1)[0]:
        del table[drop_path.split('?', 1)[0]]
    blob = json.dumps(table, ensure_ascii=False, separators=(',', ':'))
    text = text[:m.start(1)] + blob + text[m.end(1):]
    with open(path, 'w', encoding='utf-8') as fh:
        fh.write(text)
    return True


def bump_live_caches(root):
    """Bump the cache keys a data publish bumps. Leave style.css / lang-pref / SITE_VERSION."""
    files = {
        'asia/index.html': None,
        'zh/asia/index.html': None,
        'asia/asia-map.js': None,
        'asia/atm-home.js': None,
        'asia/cardB.js': None,
    }
    present = {}
    for rel in files:
        path = os.path.join(root, rel)
        if os.path.isfile(path):
            present[rel] = open(path, encoding='utf-8').read()
    blob = '\n'.join(present.values())

    def current(pattern):
        found = [int(n) for n in re.findall(pattern, blob)]
        if not found:
            raise Refuse('cache key not found: ' + pattern)
        return max(found)

    china = current(r'(?:events-core\.json|asia-map\.js)\?v=china(\d+)')
    enum = current(r'events\.json\?v=e(\d+)')
    hnum = current(r'atm-home\.js\?v=h(\d+)')
    cbnum = current(r'cardB\.js\?v=cb(\d+)')
    repls = (
        (re.compile(r'(events-core\.json\?v=china)\d+'), r'\g<1>' + str(china + 1)),
        (re.compile(r'(asia-map\.js\?v=china)\d+'), r'\g<1>' + str(china + 1)),
        (re.compile(r'(events\.json\?v=e)\d+'), r'\g<1>' + str(enum + 1)),
        (re.compile(r'(atm-home\.js\?v=h)\d+'), r'\g<1>' + str(hnum + 1)),
        (re.compile(r'(cardB\.js\?v=cb)\d+'), r'\g<1>' + str(cbnum + 1)),
    )
    changed = []
    for rel, text in present.items():
        new = text
        for cre, rep in repls:
            new = cre.sub(rep, new)
        if new != text:
            with open(os.path.join(root, rel), 'w', encoding='utf-8') as fh:
                fh.write(new)
            changed.append(rel)
    return {'china': china + 1, 'e': enum + 1, 'h': hnum + 1, 'cb': cbnum + 1, 'files': changed}


def append_log(root, row):
    path = os.path.join(root, LOG_REL)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'a', encoding='utf-8') as fh:
        fh.write(json.dumps(row, ensure_ascii=False, separators=(',', ':')) + '\n')


def _stamp():
    return datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')


def apply_items(root, items, *, dry_run=False, bump_caches=False, today=None, log=True):
    """Apply poster items. Returns a result dict. Refusals do not write that item."""
    root = os.path.abspath(root)
    events = load_events(root)
    today = today or datetime.date.today().isoformat()
    result = {'replaced': [], 'unchanged': [], 'refused': [], 'caches': None, 'dry_run': dry_run}
    replaced_events = []
    for item in items:
        try:
            event, checks, src = assess(events, item)
            data = fetch_bytes(src)
            im, ext = sniff_image(data)
            digest = hashlib.sha256(data).hexdigest()
            old = event.get('poster') or ''
            old_fs = os.path.join(root, old.split('?', 1)[0].lstrip('/')) if old else ''
            same = False
            if old_fs and os.path.isfile(old_fs):
                with open(old_fs, 'rb') as fh:
                    same = hashlib.sha256(fh.read()).hexdigest() == digest
            if same:
                row = {'action': 'unchanged', 'id': event['id'], 'poster': old, 'checks': checks,
                       'note': item.get('note') or ''}
                result['unchanged'].append(row)
                if log and not dry_run:
                    row2 = dict(row, ts=_stamp())
                    append_log(root, row2)
                continue
            dest_rel = '%s/%s.%s' % (POSTER_DIR, event['id'], ext)
            dest_web = '/' + dest_rel
            if poster_used_by_others(events, event['id'], dest_web):
                dest_rel = '%s/%s-%s.%s' % (POSTER_DIR, event['id'], _stamp(), ext)
                dest_web = '/' + dest_rel
            shared_old = poster_used_by_others(events, event['id'], old)
            plan = {
                'action': 'replaced', 'id': event['id'], 'name': event.get('name'),
                'city': event.get('city'), 'old': old or None, 'new': dest_web,
                'checks': checks, 'note': item.get('note') or '',
                'shared_old_kept': bool(shared_old),
            }
            if dry_run:
                plan['backup'] = '(dry-run)'
                result['replaced'].append(plan)
                continue
            stamp = _stamp()
            backup = backup_poster(root, event['id'], old, stamp)
            if old and os.path.isfile(old_fs) and backup is None:
                raise Refuse('refusing to replace %s without a backup' % event['id'])
            os.makedirs(os.path.join(root, os.path.dirname(dest_rel)), exist_ok=True)
            dest_fs = os.path.join(root, dest_rel)
            with open(dest_fs, 'wb') as fh:
                fh.write(data)
            twebp, tjpg, tsize = thumb_image(im)
            thumb_rel = 'images/thumb' + os.path.splitext(dest_web)[0] + '.webp'
            thumb_fs = os.path.join(root, thumb_rel.lstrip('/'))
            jpg_rel = os.path.splitext(thumb_rel)[0] + '.jpg'
            jpg_fs = os.path.join(root, jpg_rel.lstrip('/'))
            os.makedirs(os.path.dirname(thumb_fs), exist_ok=True)
            with open(thumb_fs, 'wb') as fh:
                fh.write(twebp)
            with open(jpg_fs, 'wb') as fh:
                fh.write(tjpg)
            drop = None
            if old and not shared_old and old.split('?', 1)[0] != dest_web:
                drop = old
            if os.path.isfile(os.path.join(root, MAP_JS)):
                update_atm_th(root, dest_web, tsize, drop_path=drop)
            event['poster'] = dest_web
            event['updated'] = today
            if backup:
                past = event.get('posters_past')
                if not isinstance(past, list):
                    past = []
                if backup not in past:
                    past = [backup] + [p for p in past if p != backup]
                event['posters_past'] = past[:12]
            plan['backup'] = backup
            plan['thumb'] = '/' + thumb_rel.lstrip('/')
            plan['thumb_jpg'] = '/' + jpg_rel.lstrip('/')
            plan['thumb_px'] = [tsize[0], tsize[1]]
            result['replaced'].append(plan)
            replaced_events.append(event['id'])
            if log:
                logged = dict(plan, ts=stamp)
                append_log(root, logged)
        except Refuse as exc:
            ident = ''
            if isinstance(item, dict):
                ident = str(item.get('event_id') or item.get('id') or item.get('radar_id') or '')
            row = {'action': 'refused', 'id': ident, 'reason': exc.reason,
                   'note': (item.get('note') if isinstance(item, dict) else '') or ''}
            result['refused'].append(row)
            if log and not dry_run:
                append_log(root, dict(row, ts=_stamp()))
    if replaced_events and not dry_run:
        save_events(root, events)
        if bump_caches:
            result['caches'] = bump_live_caches(root)
    return result


def main(argv):
    import argparse
    p = argparse.ArgumentParser(description='Radar poster step. Prefer tools/radar_yidong.py.')
    p.add_argument('--root', default=ROOT)
    p.add_argument('--notes')
    p.add_argument('--event-id')
    p.add_argument('--radar-id')
    p.add_argument('--image')
    p.add_argument('--city')
    p.add_argument('--organizer', action='append', default=[])
    p.add_argument('--weekday')
    p.add_argument('--date')
    p.add_argument('--note', default='')
    p.add_argument('--dry-run', action='store_true')
    p.add_argument('--bump-caches', action='store_true')
    p.add_argument('--today')
    args = p.parse_args(argv)
    items = []
    if args.notes:
        with open(args.notes, encoding='utf-8') as fh:
            doc = json.load(fh)
        items.extend(doc.get('posters') or [])
    if args.event_id or args.radar_id or args.image:
        if not args.image or not (args.event_id or args.radar_id):
            p.error('a single item needs --image and --event-id or --radar-id')
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
        if args.date:
            one['date'] = args.date
        items.append(one)
    if not items:
        p.error('pass --notes and/or one --event-id/--image item')
    result = apply_items(args.root, items, dry_run=args.dry_run, bump_caches=args.bump_caches, today=args.today)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if not result['refused'] else 2


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))

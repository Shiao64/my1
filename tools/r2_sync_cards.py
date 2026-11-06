#!/usr/bin/env python3
"""Publish Asia map card JSON and the posters those cards use to R2.

Bucket: atm-events-data
Public base: https://data.tangoweekend.org  (custom domain on the tangoweekend.org zone)

This does not bump china/e/h/cb cache keys and does not deploy Pages.
Edit the JSON (and poster files) in the working tree, then run this script.
The copies in git stay the fallback the site uses when R2 is unreachable.

  python3 tools/r2_sync_cards.py --dry-run
  python3 tools/r2_sync_cards.py                  # full card JSON + referenced posters
  python3 tools/r2_sync_cards.py --event-id E158  # three JSON files + that card's images
  python3 tools/r2_sync_cards.py --check          # GET the public events-core.json

Auth: CLOUDFLARE_API_TOKEN with Workers R2 Storage Write, and DNS write on
tangoweekend.org if the custom domain is not attached yet. Account id defaults
to the Apple Private Relay account that already owns this site
(CLOUDFLARE_ACCOUNT_ID overrides it).

R2 must already be enabled on the account (dashboard → R2 → enable). The API
returns code 10042 until that one-time step is done; this token cannot turn
billing on by itself.
"""
from __future__ import annotations

import argparse
import datetime
import json
import mimetypes
import os
import sys
import tempfile
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUCKET = 'atm-events-data'
PUBLIC_BASE = 'https://data.tangoweekend.org'
ZONE_ID = '69eed80dfad7a5e04e947d33524961b9'
DEFAULT_ACCOUNT = '7c571cf66c16cf58be0c597ac05cbad4'
JSON_FILES = ('asia/events.json', 'asia/events-core.json', 'asia/events-more.json')
POSTER_KEYS = ('poster', 'poster_zh', 'poster_en')
IMAGE_EXTS = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}


def account_id():
    return os.environ.get('CLOUDFLARE_ACCOUNT_ID') or DEFAULT_ACCOUNT


def token():
    return os.environ.get('CLOUDFLARE_API_TOKEN') or os.environ.get('CF_API_TOKEN') or ''


def _walk(node, acc):
    if isinstance(node, dict):
        for key, val in node.items():
            if key in POSTER_KEYS and isinstance(val, str):
                acc.append(val)
            elif key == 'photos' and isinstance(val, list):
                acc.extend(x for x in val if isinstance(x, str))
            else:
                _walk(val, acc)
    elif isinstance(node, list):
        for item in node:
            _walk(item, acc)


def poster_paths(events):
    found = []
    _walk(events, found)
    out = []
    for raw in found:
        path = raw.split('?', 1)[0]
        if path.startswith('/') and os.path.splitext(path)[1].lower() in IMAGE_EXTS:
            out.append(path)
    return out


def asset_keys_for_poster(web_path):
    """Site path plus the 480px and 800px thumbs the map actually requests."""
    rel = web_path.lstrip('/')
    stem = os.path.splitext(rel)[0]
    keys = [rel]
    for folder in ('images/thumb', 'images/thumb800'):
        for ext in ('.webp', '.jpg'):
            keys.append(folder + '/' + stem + ext)
    return keys


def load_events(root, names):
    rows = []
    for name in names:
        path = os.path.join(root, name)
        with open(path, encoding='utf-8') as fh:
            data = json.load(fh)
        if not isinstance(data, list):
            raise SystemExit('%s is not a list' % name)
        rows.append((name, data))
    return rows


def event_in(data, event_id):
    return any(isinstance(row, dict) and row.get('id') == event_id for row in data)


def collect(root, event_id=None):
    """Return {object_key: absolute_path} for the publish set."""
    loaded = load_events(root, JSON_FILES)
    if event_id and not any(event_in(data, event_id) for _, data in loaded):
        raise SystemExit('no row %s in %s' % (event_id, ', '.join(JSON_FILES)))
    keys = {}
    for name, _data in loaded:
        keys[name] = os.path.join(root, name)
    posters = []
    for _name, data in loaded:
        rows = data
        if event_id:
            rows = [row for row in data if isinstance(row, dict) and row.get('id') == event_id]
        posters.extend(poster_paths(rows))
    missing = []
    for web in dict.fromkeys(posters):
        for key in asset_keys_for_poster(web):
            path = os.path.join(root, key)
            if os.path.isfile(path):
                keys[key] = path
            elif key == web.lstrip('/'):
                missing.append(key)
    manifest = {
        'rev': datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ'),
        'bucket': BUCKET,
        'base': PUBLIC_BASE,
        'files': list(JSON_FILES),
        'event_id': event_id or '',
    }
    return keys, missing, manifest


def cache_control(key):
    """JSON stays fresh when a card changes without a program version bump.
    Images are long-lived; a new ?v= on the poster field is a new cache key."""
    if key.endswith('.json'):
        return 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400'
    return 'public, max-age=2592000'


def content_type(key):
    low = key.lower()
    if low.endswith('.json'):
        return 'application/json; charset=utf-8'
    if low.endswith('.webp'):
        return 'image/webp'
    if low.endswith('.jpg') or low.endswith('.jpeg'):
        return 'image/jpeg'
    if low.endswith('.png'):
        return 'image/png'
    if low.endswith('.gif'):
        return 'image/gif'
    guess, _enc = mimetypes.guess_type(key)
    return guess or 'application/octet-stream'


class ApiError(RuntimeError):
    def __init__(self, method, path, status, body):
        self.method = method
        self.path = path
        self.status = status
        self.body = body
        super().__init__('%s %s -> HTTP %s %s' % (method, path, status, body[:400]))


def api(method, path, payload=None, raw=None, content_type=None, extra_headers=None):
    tok = token()
    if not tok:
        raise SystemExit('Set CLOUDFLARE_API_TOKEN (R2 write). R2 must already be enabled in the dashboard.')
    url = 'https://api.cloudflare.com/client/v4' + path
    headers = {'Authorization': 'Bearer ' + tok}
    data = None
    if raw is not None:
        data = raw
        headers['Content-Type'] = content_type or 'application/octet-stream'
    elif payload is not None:
        data = json.dumps(payload).encode('utf-8')
        headers['Content-Type'] = 'application/json'
    if extra_headers:
        headers.update(extra_headers)
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=120) as res:
            body = res.read()
            if not body:
                return {}
            return json.loads(body.decode('utf-8'))
    except urllib.error.HTTPError as err:
        body = err.read().decode('utf-8', 'replace')
        raise ApiError(method, path, err.code, body)


def ensure_bucket():
    acct = account_id()
    try:
        api('POST', '/accounts/%s/r2/buckets' % acct, {'name': BUCKET, 'locationHint': 'apac'})
        print('created bucket', BUCKET, 'location hint apac')
    except ApiError as err:
        if err.status == 409 or 'already exists' in err.body.lower():
            print('bucket exists', BUCKET)
        elif '10042' in err.body:
            raise SystemExit(
                'R2 is not enabled on account %s. Open the Cloudflare dashboard → R2 and enable it '
                '(one-time; Workers Paid does not turn R2 on by itself), then rerun this script.\n%s'
                % (acct, err.body[:300])
            )
        else:
            raise
    cors_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'r2-cors.json')
    with open(cors_path, encoding='utf-8') as fh:
        cors = json.load(fh)
    api('PUT', '/accounts/%s/r2/buckets/%s/cors' % (acct, BUCKET), cors)
    print('cors set (GET/HEAD from any origin)')
    try:
        api('POST', '/accounts/%s/r2/buckets/%s/domains/custom' % (acct, BUCKET), {
            'domain': 'data.tangoweekend.org',
            'enabled': True,
            'zoneId': ZONE_ID,
            'minTLS': '1.2',
        })
        print('custom domain requested: data.tangoweekend.org')
    except ApiError as err:
        if err.status in (400, 409) and ('already' in err.body.lower() or 'exists' in err.body.lower() or 'duplicate' in err.body.lower()):
            print('custom domain already attached')
        else:
            print('custom domain not attached yet:', err.body[:300])
    try:
        managed = api('PUT', '/accounts/%s/r2/buckets/%s/domains/managed' % (acct, BUCKET), {'enabled': True})
        result = (managed or {}).get('result') or {}
        domain = result.get('domain') or result.get('bucketId') or ''
        print('r2.dev public development URL enabled', domain or '(see dashboard; rate-limited, not the live base)')
    except ApiError as err:
        print('r2.dev not enabled:', err.body[:200])


def put_object(key, path, cache):
    acct = account_id()
    with open(path, 'rb') as fh:
        raw = fh.read()
    # Object keys keep slashes. Encode every other reserved character.
    from urllib.parse import quote
    encoded = quote(key, safe='/')
    api(
        'PUT',
        '/accounts/%s/r2/buckets/%s/objects/%s' % (acct, BUCKET, encoded),
        raw=raw,
        content_type=content_type(key),
        extra_headers={'Cache-Control': cache},
    )


def publish(root, event_id=None, dry_run=False):
    keys, missing, manifest = collect(root, event_id)
    total = sum(os.path.getsize(path) for path in keys.values())
    print('objects %d  bytes %d  missing originals %d' % (len(keys), total, len(missing)))
    if missing:
        print('missing originals (skipped):')
        for key in missing[:20]:
            print('  ', key)
    if dry_run:
        for key in sorted(keys):
            print(key)
        return keys
    ensure_bucket()
    manifest_bytes = json.dumps(manifest, ensure_ascii=False, indent=2).encode('utf-8')
    fd, manifest_path = tempfile.mkstemp(prefix='atm-r2-manifest-', suffix='.json')
    try:
        with os.fdopen(fd, 'wb') as fh:
            fh.write(manifest_bytes)
        keys = dict(keys)
        keys['asia/manifest.json'] = manifest_path
        done = 0
        for key in sorted(keys):
            put_object(key, keys[key], cache_control(key))
            done += 1
            if done % 50 == 0:
                print('uploaded', done, '/', len(keys))
        print('uploaded', done, 'objects')
        print('public base', PUBLIC_BASE)
        print('check', PUBLIC_BASE + '/asia/events-core.json')
    finally:
        if os.path.isfile(manifest_path):
            os.remove(manifest_path)
    return keys


def check_public():
    url = PUBLIC_BASE + '/asia/events-core.json'
    # The custom domain sits behind Cloudflare. Python's default User-Agent is
    # answered with error 1010, so this check identifies itself.
    req = urllib.request.Request(url, method='GET', headers={
        'User-Agent': 'atm-r2-sync/1.0',
        'Origin': 'https://tangoweekend.org',
    })
    try:
        with urllib.request.urlopen(req, timeout=20) as res:
            body = res.read(200)
            print(res.status, res.headers.get('content-type'), res.headers.get('access-control-allow-origin'))
            print(body[:120])
            return res.status == 200
    except urllib.error.HTTPError as err:
        print('HTTP', err.code, url)
        return False
    except urllib.error.URLError as err:
        print('unreachable', url, err.reason)
        return False


def main(argv=None):
    parser = argparse.ArgumentParser(description='Publish card JSON and posters to R2')
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--event-id', help='Still uploads all three JSON files; limits images to this id')
    parser.add_argument('--check', action='store_true', help='GET the public events-core.json and exit')
    parser.add_argument('--root', default=ROOT)
    args = parser.parse_args(argv)
    if args.check:
        ok = check_public()
        return 0 if ok else 1
    publish(os.path.abspath(args.root), event_id=args.event_id, dry_run=args.dry_run)
    return 0


if __name__ == '__main__':
    sys.exit(main())

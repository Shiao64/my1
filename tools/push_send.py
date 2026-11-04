#!/usr/bin/env python3
"""Send web push via the Worker's /push/send (token-protected, rate-limited server-side).

Ad-hoc 临时通知 / 不定期广告 (not tied to an event change):
  PUSH_ADMIN_TOKEN=... python3 tools/push_send.py notice --title-zh "台风停课通知" --title-en "Typhoon: classes off" \
      --body-zh "..." --body-en "..." --url https://tangoweekend.org/asia/        # --url-zh defaults to the /zh/ form
  python3 tools/push_send.py ad ...          # same fields, kind=ad (limit: PUSH_ADHOC_PER_DAY, default 2 per 24h, shared with notice)
  python3 tools/push_send.py diff BEFORE AFTER   # event diff (used by GitHub Actions)
  --dry-run prints the JSON body without sending. --test-endpoint ENDPOINT sends only to that one subscription (no rate limit).
"""
import argparse, json, os, sys, subprocess, urllib.request
API = os.environ.get('PUSH_API', 'https://api.tangoweekend.org')

def zh_url(u):
    return u.replace('tangoweekend.org/', 'tangoweekend.org/zh/', 1) if u and '/zh/' not in u else u

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('kind', choices=['notice', 'ad', 'diff']); ap.add_argument('revs', nargs='*')
    for f in ['title-zh', 'title-en', 'body-zh', 'body-en', 'url', 'url-zh', 'test-endpoint']: ap.add_argument('--' + f)
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()
    if a.kind == 'diff':
        out = subprocess.check_output([sys.executable, os.path.join(os.path.dirname(__file__), 'push_diff.py')] + a.revs)
        msgs = json.loads(out)
        if not msgs: print('nothing to push'); return 0
        body = {'kind': 'event', 'messages': msgs}
    else:
        if not (a.title_zh and a.title_en): ap.error('--title-zh and --title-en are required')
        u = a.url or 'https://tangoweekend.org/asia/'
        body = {'kind': a.kind, 'messages': [{'title_zh': a.title_zh, 'title_en': a.title_en, 'body_zh': a.body_zh or '', 'body_en': a.body_en or '',
                                              'url_en': u, 'url_zh': a.url_zh or zh_url(u), 'tag': a.kind}]}
    if a.test_endpoint: body['test_endpoint'] = a.test_endpoint
    data = json.dumps(body, ensure_ascii=False)
    if a.dry_run: print(data); return 0
    tok = os.environ.get('PUSH_ADMIN_TOKEN')
    if not tok: print('PUSH_ADMIN_TOKEN not set', file=sys.stderr); return 2
    req = urllib.request.Request(API + '/push/send', data=data.encode(), method='POST',
                                 headers={'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json', 'User-Agent': 'atm-push/1'})
    try:
        with urllib.request.urlopen(req, timeout=60) as r: print(r.status, r.read().decode()); return 0
    except urllib.error.HTTPError as e:
        print(e.code, e.read().decode(), file=sys.stderr); return 0 if e.code == 429 else 1

if __name__ == '__main__': sys.exit(main())

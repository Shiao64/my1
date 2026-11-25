#!/usr/bin/env python3
"""Decide whether a 「资料更新」 (formerly 「探戈助理答复」) PR may go live without a human look (「上线检查」, Shiao 2026-11-25).

Shiao's rule (2026-11-16): safe changes go live by themselves; anything doubtful waits.

  python3 tools/inbox_autocheck.py --base origin/main --head HEAD --body pr-body.md [--today YYYY-MM-DD]

Prints JSON {"auto": true|false, "reasons": [...], "changes": [...]} and always exits 0
(exit 2 only when it could not run at all). "reasons" says why it must wait, in Chinese.

Auto only when ALL of these hold:
  * the PR touches only asia/events*.json, data/inbox/**, data/entities-draft/**;
  * the PR description has the line 「需要确认：无」 (Claude found nothing to ask);
  * no card is removed, and the three JSON files stay compact and agree with each other;
  * an existing card only gets: updated / source; new temp_notices, cancelled_dates,
    contacts or links (old ones kept); an address or directions that used to be empty;
    or a new poster put in by tools/radar_poster_update.py (Shiao 2026-11-16): poster
    fields, dj / dj_en when they match the new poster's DJ, the poster + thumb + backup
    files of that card, a radar-poster-log line, and cache-key-only edits to the pages;
  * a new card is in mainland China or Hong Kong, complete (name, city, time, venue,
    address, source; date not past or weekdays), sits in events.json + events-core.json,
    and does not look like a card that is already there (same city + day + venue or name);
  * at most MAX_CARDS cards change in one PR.
"""
import argparse, datetime, json, os, re, subprocess, sys, unicodedata

FILES = ['asia/events.json', 'asia/events-core.json', 'asia/events-more.json']
ALLOWED_PATHS = re.compile(r'^(asia/events(-core|-more)?\.json|data/inbox/.+|data/entities-draft/.+)$')
POSTER_FIELDS = {'poster', 'poster_date', 'poster_dates', 'poster_djs', 'posters_past'}
POSTER_LOG = 'tools/radar-poster-log.jsonl'
IMG = re.compile(r'^images/(asia/posters/(_backup/|past/)?|thumb/images/asia/posters/(?:past/)?|thumb800/images/asia/posters/(?:past/)?)([^/]+)$')
# 2026-11-25: a session poster on a fixed-poster card lives in that day's notice (images/asia/posters/notices/<id>-<date>.*)
NOTICE_IMG = re.compile(r'^images/(thumb/|thumb800/)?images/asia/posters/notices/([^/]+)$|^images/asia/posters/notices/([^/]+)$')
CACHE_FILES = {'asia/index.html', 'zh/asia/index.html', 'asia/asia-map.js', 'asia/atm-home.js', 'asia/cardB.js'}
NEW_REGIONS = {'China', 'Hong Kong'}
TYPES = {'milonga', 'practilonga', 'practica', 'festival', 'marathon', 'weekend',
         'anniversary', 'workshop', 'encuentro'}
ALWAYS_OK = {'updated', 'source', 'poster_reuse'}  # poster_reuse only hides the 上期海报 badge (Shiao 11/25)
ADD_ONLY_LIST = {'temp_notices', 'cancelled_dates'}
ADD_ONLY_DICT = {'contacts', 'links'}
FILL_IF_EMPTY = {'venue_address', 'venue_address_en', 'directions', 'directions_en', 'note_es', 'directions_es', 'note_ru', 'directions_ru'}  # *_es / *_ru: Spanish, Russian for mainland cards (Shiao 11/18)
MAX_CARDS = 8
MARK = re.compile(r'^\s*需要确认\s*[：:]\s*无\s*$', re.M)


def git(*a):
    return subprocess.check_output(['git', *a], text=True)


def show(ref, path):
    try:
        return subprocess.check_output(['git', 'show', f'{ref}:{path}'], text=True, stderr=subprocess.DEVNULL)
    except subprocess.CalledProcessError:
        return None


def compact(lst):
    return json.dumps(lst, ensure_ascii=False, separators=(',', ':'))


def norm(s):
    s = unicodedata.normalize('NFKC', str(s or '')).lower()
    return re.sub(r'[\s·・.,，、()（）\-–—_/|]+', '', s)


def blank(v):
    return v is None or v == '' or v == [] or v == {}


def iso(s):
    try:
        return datetime.date.fromisoformat(str(s))
    except ValueError:
        return None


def similar(a, b):
    a, b = norm(a), norm(b)
    return bool(a and b) and (a == b or (min(len(a), len(b)) >= 4 and (a in b or b in a)))


def days_of(e):
    if e.get('kind') == 'weekly':
        w = e.get('weekdays')
        if w is None and e.get('weekday') is not None:
            w = [e['weekday']]
        return {('w', x % 7) for x in (w or []) if isinstance(x, int)}
    d1, d2 = iso(e.get('start')), iso(e.get('end') or e.get('start'))
    if not d1:
        return set()
    out, d = set(), d1
    while d2 and d <= d2 and len(out) < 40:
        out.add(('d', d.isoformat()))
        out.add(('w', (d.isoweekday()) % 7))
        d += datetime.timedelta(days=1)
    return out


def multi_day(e):
    return e.get('kind') != 'weekly' and (e.get('end') or e.get('start')) != e.get('start')


def looks_duplicate(new, old, today):
    if old.get('hidden') is True or old.get('city') != new.get('city'):
        return False
    end = iso(old.get('end') or old.get('start'))
    if old.get('kind') != 'weekly' and end and end < today:
        return False  # a past one-off is history, not a twin
    a, b = days_of(new), days_of(old)
    if new.get('kind') == 'weekly' or old.get('kind') == 'weekly':
        overlap = {x for x in a if x[0] == 'w'} & {x for x in b if x[0] == 'w'}
    else:
        overlap = {x for x in a if x[0] == 'd'} & {x for x in b if x[0] == 'd'}
    if not overlap:
        return False
    same_name = similar(new.get('name'), old.get('name')) or similar(new.get('name_zh'), old.get('name_zh'))
    if multi_day(new) or multi_day(old):
        return same_name  # festivals use several venues; a shared hall is not a twin
    return same_name or similar(new.get('venue'), old.get('venue'))


def check(base, head, body, today):
    reasons, changes = [], []

    status = [l.split('\t') for l in git('diff', '--name-status', '-M', f'{base}...{head}').splitlines() if l.strip()]
    files = [x[-1] for x in status]
    olds = [x[1] for x in status if x[0].startswith('R')]
    img_files, cache_files = [], []
    for st in status:
        for f in st[1:]:
            if ALLOWED_PATHS.match(f):
                continue
            if (IMG.match(f) or NOTICE_IMG.match(f)) and not st[0].startswith('D'):
                img_files.append(f)
            elif f in CACHE_FILES and st[0] == 'M':
                cache_files.append(f)
            elif f == POSTER_LOG and st[0] == 'M':
                pass
            else:
                reasons.append(f'改了资料以外的文件：{f}')
    for f in cache_files:
        if not cache_only(show(base, f) or '', show(head, f) or ''):
            reasons.append(f'{f} 的改动不只是缓存版本号')

    if not MARK.search(body or ''):
        reasons.append('PR 说明里没有「需要确认：无」，表示有事要问你')

    data = {}
    for side, ref in (('base', base), ('head', head)):
        for f in FILES:
            raw = show(ref, f)
            if raw is None:
                reasons.append(f'{side} 缺 {f}')
                continue
            try:
                data[(side, f)] = (raw, json.loads(raw))
            except ValueError:
                reasons.append(f'{f} 不是正确的 JSON')
    if reasons and any('JSON' in r or '缺' in r for r in reasons):
        return False, reasons, changes

    for f in FILES:
        raw, lst = data[('head', f)]
        want = compact(lst) + ('\n' if f.endswith('more.json') else '')
        if raw != want and raw.rstrip('\n') != compact(lst):
            reasons.append(f'{f} 的写法变了（不是原来的紧凑格式）')

    old = {e['id']: e for e in data[('base', FILES[0])][1]}
    new = {e['id']: e for e in data[('head', FILES[0])][1]}
    core = {e['id']: e for e in data[('head', FILES[1])][1]}
    more = {e['id']: e for e in data[('head', FILES[2])][1]}
    old_core = {e['id'] for e in data[('base', FILES[1])][1]}
    old_more = {e['id'] for e in data[('base', FILES[2])][1]}

    for i in sorted(set(old) - set(new)):
        reasons.append(f'删除了卡 {i}')
    for i in sorted((old_core - set(core)) | (old_more - set(more))):
        if i in new:
            reasons.append(f'卡 {i} 从 core/more 文件里拿掉了')

    touched = [i for i in new if old.get(i) != new[i]]
    # 2026-11-20 (Shiao): mail from an organizer (huodong@) may auto-change only that organizer's own cards.
    own = mail_organizer_cards(head, files)
    if own is not None:
        for i in touched:
            if i in old and i not in own:
                reasons.append(f'组织者来信改到了别人的卡 {i}（他自己的卡：{"、".join(sorted(own)) or "无"}），要你确认')
    poster_ids = set()
    if len(touched) > MAX_CARDS:
        reasons.append(f'一次改了 {len(touched)} 张卡（超过 {MAX_CARDS} 张）')

    for i in touched:
        e = new[i]
        for name, other in (('events-core', core), ('events-more', more)):
            if i in other and other[i] != e:
                reasons.append(f'卡 {i} 在 events.json 和 {name}.json 不一致')
        if i not in old:
            changes.append(f'新卡 {i} {e.get("name", "")}')
            check_new(i, e, old, core, today, reasons)
            continue
        o = old[i]
        fields = sorted(k for k in set(o) | set(e) if o.get(k) != e.get(k))
        changes.append(f'{i} 改了：{"、".join(fields)}')
        # 2026-11-25 (Shiao, #466): the tool may overwrite <id>.jpg in place, so the poster path can stay the
        # same. A replace line in the poster log also counts as a new poster.
        new_poster = (str(o.get('poster') or '').split('?')[0] != str(e.get('poster') or '').split('?')[0]
                      or logged(base, head, i))
        if not new_poster and o.get('poster') != e.get('poster'):
            new_poster = True  # only the ?v= cache tag changed
        if new_poster:
            poster_ids.add(i)
            if not logged(base, head, i):
                reasons.append(f'卡 {i} 换了海报，但不是用换海报工具换的（tools/radar-poster-log.jsonl 没有记录）')
        dj_now = (e.get('poster_djs') or {}).get(str(e.get('poster') or '').split('?')[0])
        for k in fields:
            a, b = o.get(k), e.get(k)
            if k in ALWAYS_OK:
                continue
            if new_poster and k in POSTER_FIELDS:
                continue
            if new_poster and k in ('dj', 'dj_en') and dj_now and str(b or '').startswith(str(dj_now)):
                continue
            if k in ADD_ONLY_LIST and isinstance(b, list) and all(x in b for x in (a or [])):
                continue
            if k in ADD_ONLY_DICT and isinstance(b, dict) and all(b.get(x) == y for x, y in (a or {}).items()):
                continue
            if k in FILL_IF_EMPTY and blank(a):
                continue
            if k == 'hidden' and b is not True:
                reasons.append(f'卡 {i} 改了显示／隐藏')
                continue
            reasons.append(f'卡 {i} 改了「{k}」（不是补资料或单场提示）')
    notice_imgs = set()
    for i in touched:
        for o in (new[i].get('temp_notices') or []):
            if isinstance(o, dict) and str(o.get('image') or '').startswith('/images/asia/posters/notices/'):
                notice_imgs.add(os.path.splitext(o['image'].split('/')[-1])[0])
    for f in img_files:
        nm = NOTICE_IMG.match(f)
        if nm:
            if os.path.splitext(nm.group(2) or nm.group(3))[0] not in notice_imgs:
                reasons.append(f'改了不属于任何新通知的图片：{f}')
            continue
        stem = IMG.match(f).group(3)
        if not any(stem == pid or stem.startswith((pid + '.', pid + '-', pid + '_')) for pid in poster_ids):
            reasons.append(f'改了不属于换海报卡片的图片：{f}')
    if cache_files and not poster_ids:
        reasons.append('改了网页的缓存版本号，但没有换海报')
    return not reasons, reasons, changes


MAIL_MD = re.compile(r'^data/inbox/(done/)?\d{4}-\d\d-\d\d-mail-[^/]+\.md$')
OWN_RE = re.compile(r'这位主办在网站上的卡：([^（\n]+)')


def mail_organizer_cards(head, files):
    """None when no organizer mail is in this PR; else the set of cards those organizers own."""
    own, found = set(), False
    for f in files:
        if not MAIL_MD.match(f):
            continue
        txt = show(head, f) or ''
        if '寄件人是主办本人' not in txt:
            continue
        found = True
        m = OWN_RE.search(txt)
        if m:
            own.update(x.strip() for x in m.group(1).split('、') if x.strip())
    return own if found else None


CACHE_RE = [(re.compile(r'var ATM_TH = \{.*?\};'), 'var ATM_TH = {};'),
            (re.compile(r'\b(china|e|h|cb|r|t)\d+\b'), r'\1N')]


def cache_only(a, b):
    """True when two versions of a page differ only in cache keys and the ATM_TH table."""
    for rx, rep in CACHE_RE:
        a, b = rx.sub(rep, a), rx.sub(rep, b)
    return a == b


def logged(base, head, card_id):
    before = (show(base, POSTER_LOG) or '').splitlines()
    after = (show(head, POSTER_LOG) or '').splitlines()
    for line in after[len(before):]:
        try:
            d = json.loads(line)
        except ValueError:
            continue
        if isinstance(d, dict) and d.get('action') == 'replaced' and d.get('id') == card_id:
            return True
    return False


def check_new(i, e, old, core, today, reasons):
    tag = f'新卡 {i}'
    if e.get('region') not in NEW_REGIONS:
        reasons.append(f'{tag} 不在中国大陆或香港（{e.get("region")}）')
    if e.get('kind') not in ('event', 'weekly'):
        reasons.append(f'{tag} 的 kind 不对')
    if e.get('type') not in TYPES:
        reasons.append(f'{tag} 的类型「{e.get("type")}」不在分类里')
    if e.get('hidden') is True:
        reasons.append(f'{tag} 是隐藏的')
    # 2026-11-20 (Shiao): a new card needs at least one way to reach the organizer or check the source
    c = e.get('contacts') or {}
    has_c = bool(c) if isinstance(c, list) else any(not blank(v) for v in c.values())
    has_l = any(not blank(v) for v in (e.get('links') or {}).values())
    need = ['name', 'city', 'source']
    # 2026-11-25 (Shiao): with an organizer contact the card can go up first; time, venue and address may stay blank
    # (visitors ask the organizer). Without a contact they are still required.
    if not has_c:
        need += ['venue', 'venue_address']
        if not (multi_day(e) or e.get('schedule')):
            need.append('time')  # a festival's times live in its schedule
    for k in need:
        if blank(e.get(k)):
            reasons.append(f'{tag} 缺「{k}」')
    if not (has_c or has_l):
        reasons.append(f'{tag} 没有联络方式也没有链接（至少要一种）')
    if e.get('kind') == 'weekly':
        w = e.get('weekdays') or ([e['weekday']] if e.get('weekday') is not None else [])
        if not w or not all(isinstance(x, int) and 0 <= x <= 6 for x in w):
            reasons.append(f'{tag} 缺每周几')
    else:
        d1, d2 = iso(e.get('start')), iso(e.get('end') or e.get('start'))
        if not d1 or not d2 or d2 < d1:
            reasons.append(f'{tag} 日期不对')
        elif d2 < today:
            reasons.append(f'{tag} 的日期已经过了')
    if i not in core:
        reasons.append(f'{tag} 没放进 events-core.json')
    for oid, o in old.items():
        if looks_duplicate(e, o, today):
            reasons.append(f'{tag} 可能和现有的卡 {oid}「{o.get("name", "")}」重复')
            break


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--base', required=True)
    p.add_argument('--head', required=True)
    p.add_argument('--body', required=True, help='file with the PR description')
    p.add_argument('--today', default=None)
    a = p.parse_args()
    today = iso(a.today) if a.today else (datetime.datetime.utcnow() + datetime.timedelta(hours=8)).date()
    try:
        body = open(a.body, encoding='utf-8').read()
        ok, reasons, changes = check(a.base, a.head, body, today)
    except Exception as exc:  # never auto-merge on a crash
        print(json.dumps({'auto': False, 'reasons': [f'检查程序出错：{exc}'], 'changes': []}, ensure_ascii=False))
        return 2
    print(json.dumps({'auto': ok, 'reasons': reasons, 'changes': changes}, ensure_ascii=False, indent=1))
    return 0


if __name__ == '__main__':
    sys.exit(main())

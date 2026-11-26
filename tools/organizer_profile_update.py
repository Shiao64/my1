#!/usr/bin/env python3
"""Fill in an organizer's (or group's) profile page from what the organizer sent (Shiao 2026-11-26).

Used by the inbox run when a listed organizer mails huodong@tangoweekend.org a photo and/or an intro,
and by hand. It edits asia/organizers.json (indent 2, as the file is), turns the photo into
images/asia/profiles/<id>.webp and bumps the photo's ?v= tag; it never touches the .js files
(organizers.json and /images/* are not cache-pinned in _headers, so the site picks the change up
within ~10 minutes).

    python3 tools/organizer_profile_update.py --find "勾陳"                       # which entry is this person?
    python3 tools/organizer_profile_update.py --id gou-chen --photo data/inbox/x.jpg \
        --bio-zh @bio-zh.txt --bio @bio-en.txt --link wechat=abc --link website=https://... \
        --source "主办本人 2026-11-26 来信（data/inbox/2026-11-26-mail-....md）" [--dry-run]
    python3 tools/organizer_profile_update.py --new --name "Ming Li" --name-zh "李明" --city Beijing \
        [--kind group --members "Ming Li,Wang Wei"] --photo ... --bio-zh ...     # first profile: entry + pages

Rules (Shiao 2026-11-26):
  * the text goes in as the organizer wrote it, contact details included (phone, WeChat, sign-up link);
  * bio_zh is the Chinese text; bio the English one (translate when the organizer gave only Chinese);
  * an existing entry only gets photo / bio / bio_zh / affiliation / links / classes / sources changed,
    and "auto" is removed once a real bio or photo is in; name, match, members, kind stay as they are;
  * a NEW entry (--new) also writes the two page files (/organizer/<id>/ and /zh/organizer/<id>/, or
    /group/<id>/ and /zh/group/<id>/ for --kind group); the inbox check lets that PR wait for Shiao
    the first time (tools/inbox_autocheck.py), later updates of the same profile go live by themselves.
"""
import argparse, datetime, html, json, os, re, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
P = lambda *a: os.path.join(ROOT, *a)
PROFILES = 'asia/organizers.json'
PHOTO_DIR = 'images/asia/profiles'
MAX_W, MAX_H, QUALITY = 720, 960, 82
LINK_KEYS = ('website', 'instagram', 'facebook', 'wechat', 'soundcloud')
EDITABLE = {'photo', 'bio', 'bio_zh', 'affiliation', 'affiliation_zh', 'links', 'classes', 'classes_note',
            'classes_note_zh', 'sources', 'auto'}


class Refuse(Exception):
    pass


def key(s):
    """Same as dj-page.js key(): lower case, keep a-z 0-9, CJK and Hangul."""
    return re.sub(r'[^a-z0-9一-鿿가-힣]', '', str(s or '').lower())


def load():
    with open(P(PROFILES), encoding='utf-8') as fh:
        return json.load(fh)


def save(lst):
    with open(P(PROFILES), 'w', encoding='utf-8') as fh:
        fh.write(json.dumps(lst, ensure_ascii=False, indent=2) + '\n')


def names_of(p):
    return [p.get('name'), p.get('name_zh')] + list(p.get('match') or [])


def find(lst, name):
    """Entries whose name / name_zh / match equal `name` (dj-page.js key())."""
    k = key(name)
    return [p for p in lst if k and k in {key(n) for n in names_of(p)}]


def slug_of(name):
    s = re.sub(r'[^a-z0-9]+', '-', str(name or '').lower()).strip('-')
    return s or 'profile'


def text_arg(v):
    """Argument value, or the contents of a file when it starts with @."""
    if v is None:
        return None
    if v.startswith('@'):
        with open(v[1:], encoding='utf-8') as fh:
            return fh.read().strip()
    return v.strip()


def next_tag(photo, pid):
    """Bump the ?v= tag: l1 -> l2; none -> <first letter>1."""
    m = re.search(r'[?&]v=([a-z]*)(\d+)', str(photo or ''))
    if m:
        return (m.group(1) or pid[:1]) + str(int(m.group(2)) + 1)
    return (pid[:1] if pid[:1].isalpha() else 'p') + '1'


def write_photo(src, pid):
    try:
        from PIL import Image, ImageOps
    except ImportError:
        raise Refuse('Pillow is required (pip install pillow)')
    if not os.path.isfile(src):
        raise Refuse('photo not found: ' + src)
    im = Image.open(src)
    im = ImageOps.exif_transpose(im)
    if im.mode not in ('RGB', 'RGBA'):
        im = im.convert('RGB')
    if im.mode == 'RGBA':
        bg = Image.new('RGB', im.size, (255, 255, 255))
        bg.paste(im, mask=im.split()[3])
        im = bg
    im.thumbnail((MAX_W, MAX_H))
    os.makedirs(P(PHOTO_DIR), exist_ok=True)
    out = os.path.join(PHOTO_DIR, pid + '.webp')
    im.save(P(out), 'WEBP', quality=QUALITY, method=6)
    return '/' + out, im.size


def page_html(p, lang):
    """A profile page in the same shell as the existing ones (organizer pages via gen_organizer_profiles)."""
    zh = lang == 'zh'
    name = (p.get('name_zh') or p['name']) if zh else (p['name'] or p.get('name_zh'))
    if p.get('kind') == 'group':
        E = html.escape
        return (
            '<!DOCTYPE html>\n<html lang="%s">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
            '<title>%s · %s</title>\n%s\n</head>\n'
            '<body data-kind="group" data-id="%s" data-lang="%s">\n'
            '<header class="dj-bar">\n  <a class="dj-back" href="%s" aria-label="%s">‹</a>\n  <h1>%s</h1>\n'
            '  <span class="dj-aff" id="pf-aff"></span>\n</header>\n'
            '<main class="dj-main"></main>\n%s\n</body>\n</html>\n'
        ) % ('zh-CN' if zh else 'en', E(name), '亚洲探戈地图' if zh else 'Asia Tango Map', group_shell()[0],
             E(p['id']), lang, '/zh/asia/' if zh else '/asia/', '返回' if zh else 'Back', E(name), group_shell()[1])
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import gen_organizer_profiles as G
    return G.page_html(p, lang)


def group_shell():
    """Stylesheet and script tags of an existing group page, so a new one loads the same versions."""
    d = P('group')
    for name in sorted(os.listdir(d)) if os.path.isdir(d) else []:
        f = os.path.join(d, name, 'index.html')
        if not os.path.isfile(f):
            continue
        t = open(f, encoding='utf-8').read()
        css = re.search(r'<link rel="stylesheet" href="/css/dj-page\.css[^"]*">', t)
        js = re.findall(r'<script[^>]*src="/asia/(?:group-page|atm-social)\.js[^"]*"></script>', t)
        if css and len(js) == 2:
            return css.group(0), '\n'.join(js)
    return ('<link rel="stylesheet" href="/css/dj-page.css?v=d8">',
            '<script src="/asia/group-page.js?v=g5"></script>\n<script defer src="/asia/atm-social.js?v=s30"></script>')


def page_paths(p):
    folder = 'group' if p.get('kind') == 'group' else 'organizer'
    return [(P(folder, p['id'], 'index.html'), 'en'), (P('zh', folder, p['id'], 'index.html'), 'zh')]


def new_entry(a, lst):
    if not a.name and not a.name_zh:
        raise Refuse('--new needs --name and/or --name-zh')
    for n in (a.name, a.name_zh):
        if n and find(lst, n):
            raise Refuse('an entry already matches %r: %s (use --id)' % (n, ', '.join(p['id'] for p in find(lst, n))))
    pid = a.id or slug_of(a.name or a.name_zh)
    if any(p['id'] == pid for p in lst):
        raise Refuse('id already used: ' + pid)
    city = a.city or ''
    p = {'id': pid}
    if a.kind == 'group':
        p['kind'] = 'group'
    p.update({'name': a.name or a.name_zh, 'name_zh': a.name_zh or a.name, 'city': city, 'city_zh': a.city_zh or city,
              'affiliation': a.affiliation or '', 'affiliation_zh': a.affiliation_zh or a.affiliation or '',
              'photo': '', 'bio': '', 'bio_zh': '', 'links': {k: '' for k in LINK_KEYS},
              'match': [x for x in dict.fromkeys([a.name, a.name_zh]) if x]})
    if a.kind == 'group':
        p['members'] = [x.strip() for x in (a.members or '').split(',') if x.strip()]
    lst.append(p)
    return p


def apply(a):
    lst = load()
    changed = []
    if a.new:
        p = new_entry(a, lst)
        changed.append('new entry ' + p['id'])
    else:
        if not a.id:
            raise Refuse('--id is required (use --find to look it up)')
        hits = [x for x in lst if x['id'] == a.id]
        if not hits:
            raise Refuse('no entry with id ' + a.id + ' (use --new to create one)')
        p = hits[0]
    pid = p['id']

    if a.photo:
        if not a.dry_run:
            web, size = write_photo(a.photo, pid)
        else:
            web, size = '/%s/%s.webp' % (PHOTO_DIR, pid), ('?', '?')
        p['photo'] = web + '?v=' + next_tag(p.get('photo'), pid)
        changed.append('photo %s (%sx%s)' % (p['photo'], size[0], size[1]))
    for k, v in (('bio_zh', text_arg(a.bio_zh)), ('bio', text_arg(a.bio)),
                 ('affiliation', a.affiliation), ('affiliation_zh', a.affiliation_zh),
                 ('classes_note', a.classes_note), ('classes_note_zh', a.classes_note_zh)):
        if v is not None and p.get(k) != v:
            p[k] = v
            changed.append(k)
    if a.bio is None and a.bio_zh is not None and not p.get('bio'):
        changed.append('(bio still empty: add the English text with --bio)')
    for item in a.link or []:
        if '=' not in item:
            raise Refuse('--link needs key=value, keys: ' + ', '.join(LINK_KEYS))
        k, v = item.split('=', 1)
        k = k.strip().lower()
        if k not in LINK_KEYS:
            raise Refuse('unknown link key %r, keys: %s' % (k, ', '.join(LINK_KEYS)))
        p.setdefault('links', {k2: '' for k2 in LINK_KEYS})
        if p['links'].get(k) != v.strip():
            p['links'][k] = v.strip()
            changed.append('links.' + k)
    if a.source:
        p.setdefault('sources', [])
        if a.source not in p['sources']:
            p['sources'].append(a.source)
            changed.append('sources')
    if p.get('auto') and (p.get('bio') or p.get('bio_zh') or p.get('photo')):
        del p['auto']
        changed.append('auto removed')
    if not changed:
        print('nothing to change for', pid)
        return 0
    pages = [(f, lang) for f, lang in page_paths(p) if not os.path.isfile(f)] if a.new else []
    if a.dry_run:
        print('would change %s: %s' % (pid, ', '.join(changed)))
        for f, _ in pages:
            print('would write', os.path.relpath(f, ROOT))
        return 0
    save(lst)
    for f, lang in pages:
        os.makedirs(os.path.dirname(f), exist_ok=True)
        with open(f, 'w', encoding='utf-8') as fh:
            fh.write(page_html(p, lang))
    print('changed %s: %s' % (pid, ', '.join(changed)))
    for f, _ in pages:
        print('wrote', os.path.relpath(f, ROOT))
    return 0


def main(argv):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--find', help='print the entries matching this name and exit')
    ap.add_argument('--id', help='entry id in asia/organizers.json')
    ap.add_argument('--new', action='store_true', help='create the entry (and its two pages)')
    ap.add_argument('--kind', choices=['person', 'group'], default='person')
    ap.add_argument('--name'); ap.add_argument('--name-zh'); ap.add_argument('--city'); ap.add_argument('--city-zh')
    ap.add_argument('--members', help='group members, comma separated (names as written on the cards)')
    ap.add_argument('--photo', help='image file (jpg/png/webp/heic); becomes images/asia/profiles/<id>.webp')
    ap.add_argument('--bio-zh', help='Chinese intro, or @file'); ap.add_argument('--bio', help='English intro, or @file')
    ap.add_argument('--affiliation'); ap.add_argument('--affiliation-zh')
    ap.add_argument('--classes-note'); ap.add_argument('--classes-note-zh')
    ap.add_argument('--link', action='append', help='key=value; keys: ' + ', '.join(LINK_KEYS))
    ap.add_argument('--source', help='where this came from, e.g. 主办本人 2026-11-26 来信（data/inbox/...md）')
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args(argv)
    try:
        if a.find:
            hits = find(load(), a.find)
            if not hits:
                print('no entry matches', a.find)
                return 1
            for p in hits:
                print(json.dumps({k: p.get(k) for k in ('id', 'kind', 'name', 'name_zh', 'city', 'members', 'auto') if p.get(k) is not None}, ensure_ascii=False))
            return 0
        return apply(a)
    except Refuse as e:
        print('refused:', e, file=sys.stderr)
        return 2


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))

#!/usr/bin/env python3
"""Organizer profile pages for everyone who runs 2+ events (Shiao 2026-11-25).

    python3 tools/draft_entities.py                  # first: it decides who is the same person
    python3 tools/gen_organizer_profiles.py          # write
    python3 tools/gen_organizer_profiles.py --check  # only report; exit 1 if something would change

Runs every day at 03:17 Beijing in .github/workflows/poster-prune.yml (Shiao 2026-11-25).

A person in data/entities-draft/organizers.json (groups are in groups.json, not there) with
`min_cards` or more cards that are not hidden, at different time slots (distinct_slots(); Shiao
2026-11-25: 不同时段的 2 场以上), and whose `region` is in `regions` (Shiao 2026-11-25: mainland China
only for now, not Hong Kong / Taiwan / Korea), and not listed in data/organizer-pages.json `skip`, gets:
  - an entry in asia/organizers.json: name, name_zh, match; photo / bio / links empty; "auto": true
  - /organizer/<id>/ and /zh/organizer/<id>/ (same shell as the hand-made pages)
Cards then link the organizer's name to that page (cardB.js orgNamesHtml), and the page lists the
cards: current ones first, then past ones (asia/dj-page.js).

Never overwrites: an entry that already matches the person (hand-made, e.g. 刘峥) is left alone, and an
existing page file is not rewritten. Bios, photos and links are added by hand later. The line under the name (affiliation) comes
from the one confirmed group in data/entities-draft/checked-groups.json, if any (filled on "auto" entries only). Nothing is
deleted when someone drops below the minimum. Every organizer page gets the "past events" section
if it lacks one.
Photo and bio start empty; the page shows 照片待补充 / 介绍待补充 until they are filled in (dj-page.js).
Before writing, it checks that the page's own name matching (dj-page.js matches()) finds exactly the
person's cards; a person where it does not is skipped and reported.
"""
import datetime, html, json, os, re, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
P = lambda *a: os.path.join(ROOT, *a)
PROFILES = 'asia/organizers.json'
CITY_ZH = {'Beijing': '北京', 'Shanghai': '上海', 'Shenzhen': '深圳', 'Guangzhou': '广州', 'Hangzhou': '杭州',
           'Chengdu': '成都', 'Hong Kong': '香港', 'Taipei': '台北', 'Taichung': '台中', 'Seoul': '首尔'}


def key(s):
    """Same as dj-page.js key() / cardB.js djKey(): lower case, keep a-z 0-9, CJK and Hangul."""
    return re.sub(r'[^a-z0-9一-鿿가-힣]', '', str(s or '').lower())


SPLIT = re.compile(r'\s*(?:、|\+|＆|&|/|,|;)\s*')  # dj-page.js matches()


def page_matches(names, e):
    ks = {key(n) for n in names if key(n)}
    for n in (e.get('organizers') or []) + (e.get('organizers_en') or []):
        if n and any(key(x) in ks for x in SPLIT.split(str(n))):
            return True
    return False


def load(rel):
    with open(P(rel), encoding='utf-8') as fh:
        return json.load(fh)


def slug_of(name):
    s = re.sub(r'[^a-z0-9]+', '-', str(name or '').lower()).strip('-')
    return s


# 2026-11-25 (Shiao): the 2+ must be at different times (不同时段的 2 场以上). Two cards for the same
# time slot count once: a weekly card's slot is weekday + start time; a one-off's is date + start time;
# a one-off that is a theme night of the person's own weekly (theme_of, or same weekday and start time)
# adds nothing. One weekly card on two weekdays is still one card.
_T0 = re.compile(r'(\d{1,2})[:：](\d{2})')


def _start_time(e):
    m = _T0.search(str(e.get('time') or ''))
    return '%02d:%s' % (int(m.group(1)), m.group(2)) if m else ''


def _weekdays(e):
    w = e.get('weekdays')
    if w:
        return list(w)
    return [e['weekday']] if e.get('weekday') is not None else []


def distinct_slots(cards):
    """How many of these cards (event dicts) are at different time slots."""
    weekly = [e for e in cards if e.get('kind') == 'weekly']
    weekly_ids = {e.get('id') for e in weekly}
    weekly_slots = {('w', w, _start_time(e)) for e in weekly for w in _weekdays(e)}
    used, n = set(), 0
    for e in weekly + sorted((e for e in cards if e.get('kind') != 'weekly'), key=lambda e: e.get('start') or ''):
        if e.get('kind') == 'weekly':
            slots = {('w', w, _start_time(e)) for w in _weekdays(e)} or {('id', e.get('id'))}
        else:
            if e.get('theme_of') in weekly_ids:
                continue
            day = e.get('start') or ''
            try:
                wd = datetime.date.fromisoformat(day).isoweekday() % 7  # Sunday = 0, as in the JSON
            except ValueError:
                wd = None
            if wd is not None and ('w', wd, _start_time(e)) in weekly_slots:
                continue
            slots = {('d', day, _start_time(e))} if day else {('id', e.get('id'))}
        if slots - used:
            n += 1
            used |= slots
    return n


def shell_bits():
    """The stylesheet and script tags of an existing organizer page, so new pages load the same versions."""
    for d in sorted(os.listdir(P('organizer'))) if os.path.isdir(P('organizer')) else []:
        f = P('organizer', d, 'index.html')
        if not os.path.isfile(f):
            continue
        t = open(f, encoding='utf-8').read()
        css = re.search(r'<link rel="stylesheet" href="/css/dj-page\.css[^"]*">', t)
        js = re.findall(r'<script[^>]*src="/asia/(?:dj-page|atm-social)\.js[^"]*"></script>', t)
        if css and len(js) == 2:
            return css.group(0), '\n'.join(js)
    return ('<link rel="stylesheet" href="/css/dj-page.css?v=d6">',
            '<script src="/asia/dj-page.js?v=d17"></script>\n<script defer src="/asia/atm-social.js?v=s30"></script>')


PAST = {'en': ('Past events',), 'zh': ('过去的活动',)}


def past_section(lang):
    return '  <section>\n    <h2>%s</h2>\n    <div id="pf-past" class="dj-events"></div>\n  </section>\n' % PAST[lang][0]


def page_html(p, lang):
    css, js = shell_bits()
    zh = lang == 'zh'
    name = (p.get('name_zh') or p['name']) if zh else (p['name'] or p.get('name_zh'))
    E = html.escape
    rows = [('Instagram', 'pf-ig'), ('Facebook', 'pf-fb'), ('微信' if zh else 'WeChat', 'pf-wx'), ('SoundCloud', 'pf-sc')]
    return (
        '<!DOCTYPE html>\n<html lang="%s">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        '<title>%s · %s</title>\n%s\n</head>\n'
        '<body data-kind="organizer" data-id="%s" data-lang="%s">\n'
        '<header class="dj-bar">\n  <a class="dj-back" href="%s" aria-label="%s">‹</a>\n  <h1>%s</h1>\n'
        '  <span class="dj-aff" id="pf-aff"></span>\n</header>\n'
        '<main class="dj-main">\n  <div class="dj-story">\n    <div class="dj-photo" id="pf-photo"></div>\n'
        '    <p class="dj-bio" id="pf-bio"></p>\n  </div>\n  <dl class="dj-fields">\n%s  </dl>\n'
        '  <section>\n    <h2>%s</h2>\n    <div id="pf-up" class="dj-events"></div>\n  </section>\n%s'
        '</main>\n%s\n</body>\n</html>\n'
    ) % ('zh-CN' if zh else 'en', E(name), '亚洲探戈地图' if zh else 'Asia Tango Map', css, E(p['id']), lang,
         '/zh/asia/' if zh else '/asia/', '返回' if zh else 'Back', E(name),
         ''.join('    <div><dt>%s</dt><dd id="%s"></dd></div>\n' % r for r in rows),
         '近期主办' if zh else 'Upcoming', past_section(lang), js)


def add_past(path, lang):
    """Give an existing organizer page the past-events section. Returns True when it changes."""
    t = open(path, encoding='utf-8').read()
    if 'id="pf-past"' in t or '</main>' not in t:
        return False
    with open(path, 'w', encoding='utf-8') as fh:
        fh.write(t.replace('</main>', past_section(lang) + '</main>', 1))
    return True


def plan():
    cfg = load('data/organizer-pages.json')
    need, skip = int(cfg.get('min_cards', 2)), {key(k) for k in cfg.get('skip', {})}
    regions = set(cfg.get('regions') or [])
    events = load('asia/events.json')
    byid = {e['id']: e for e in events}
    shown = [e for e in events if not e.get('hidden')]
    draft = load('data/entities-draft/organizers.json')
    same = [d['names'] for d in load('data/entities-draft/decisions.json').get('host_same', [])]
    profiles = load(PROFILES)
    taken = {p['id'] for p in profiles}
    # The line under the name (affiliation), as on 刘峥 / 王凯's pages: the one group that the hand-checked
    # sheet (checked-groups.json, Shiao / Sam) confirms the person belongs to. None or several: left empty.
    confirmed = [g for g in load('data/entities-draft/checked-groups.json').get('groups', []) if g.get('status') == 'confirmed']

    def group_of(names):
        ks = {key(n) for n in names if key(n)}
        hits = [g for g in confirmed if ks & {key(m) for m in g.get('members') or []}]
        return hits[0] if len(hits) == 1 else None

    def with_aff(entry, g):
        out = {}
        for k, v in entry.items():
            if k in ('photo', 'bio') and 'affiliation' not in out:
                out['affiliation'] = g.get('name_en') or g['name_local']
                out['affiliation_zh'] = g['name_local']
            out[k] = v
        return out

    def owner(names):
        ks = {key(n) for n in names if key(n)}
        for p in profiles:
            if ks & {key(x) for x in [p.get('name'), p.get('name_zh')] + (p.get('match') or []) + (p.get('members') or [])}:
                return p
        return None

    add, kept, warn, fill = [], [], [], []
    for o in sorted(draft, key=lambda o: o['id']):
        cards = sorted(i for i in o.get('events', []) if i in byid and not byid[i].get('hidden'))
        if distinct_slots([byid[i] for i in cards if not regions or byid[i].get('region') in regions]) < need:
            continue
        names = [n for n in (o.get('name_en'), o.get('name_local')) if n]
        if {key(n) for n in names} & skip:
            continue
        for grp in same:  # Shiao-confirmed spellings of the same person (decisions.json host_same)
            if {key(n) for n in grp} & {key(n) for n in names}:
                names += [n for n in grp if key(n) not in {key(x) for x in names}]
        hit = owner(names)
        if hit:
            kept.append((hit['id'], names[0], cards))
            g = group_of(names)
            if hit.get('auto') and not hit.get('affiliation') and g:  # only entries this tool made, never hand-made ones
                i = profiles.index(hit)
                profiles[i] = with_aff(hit, g)
                fill.append((hit['id'], g['name_local']))
            continue
        found = sorted(e['id'] for e in shown if page_matches(names, e))
        if found != cards:
            warn.append('%s %s：页面会找到 %s，名单是 %s，先不做' % (o['id'], '/'.join(names), found, cards))
            continue
        en = o.get('name_en') or names[0]
        sid = slug_of(en) or o['id'].lower()
        if sid in taken:
            sid = sid + '-' + slug_of(o['cities'][0] if o.get('cities') else o['id'])
        taken.add(sid)
        entry = {'id': sid, 'name': en, 'name_zh': o.get('name_local') or en}
        if len(o.get('cities') or []) == 1:
            entry['city'] = o['cities'][0]
            if o['cities'][0] in CITY_ZH:
                entry['city_zh'] = CITY_ZH[o['cities'][0]]
        entry.update({'photo': '', 'bio': '', 'bio_zh': '',
                      'links': {'instagram': '', 'facebook': '', 'wechat': '', 'soundcloud': ''},
                      'match': names, 'auto': True})
        g = group_of(names)
        if g:
            entry = with_aff(entry, g)
        add.append((entry, cards))
    return profiles, add, kept, warn, fill


def main(argv):
    check = '--check' in argv
    profiles, add, kept, warn, fill = plan()
    pages = []
    for entry, _ in add:
        for lang, base in (('en', 'organizer'), ('zh', 'zh/organizer')):
            f = P(base, entry['id'], 'index.html')
            if not os.path.exists(f):
                pages.append((f, lang, entry))
    old = []
    for lang, base in (('en', 'organizer'), ('zh', 'zh/organizer')):
        if os.path.isdir(P(base)):
            for d in sorted(os.listdir(P(base))):
                f = P(base, d, 'index.html')
                if os.path.isfile(f) and 'id="pf-past"' not in open(f, encoding='utf-8').read():
                    old.append((f, lang))
    for pid, name, cards in kept:
        print('已有介绍页：%s（%s）%d 张卡' % (name, pid, len(cards)))
    for entry, cards in add:
        print('新加：%s／%s → /organizer/%s/ ，%d 张卡 %s' % (entry['name_zh'], entry['name'], entry['id'], len(cards), ' '.join(cards)))
    for pid, gname in fill:
        print('补所属：%s → %s' % (pid, gname))
    for w in warn:
        print('注意：' + w)
    print('要新加 %d 位、新页面 %d 个、旧页面补「过去的活动」%d 个、补所属 %d 位' % (len(add), len(pages), len(old), len(fill)))
    if check:
        return 1 if (add or pages or old or fill) else 0
    if add or fill:
        profiles = profiles + [e for e, _ in add]
        with open(P(PROFILES), 'w', encoding='utf-8') as fh:
            fh.write(json.dumps(profiles, ensure_ascii=False, indent=2) + '\n')
    for f, lang, entry in pages:
        os.makedirs(os.path.dirname(f), exist_ok=True)
        with open(f, 'w', encoding='utf-8') as fh:
            fh.write(page_html(entry, lang))
    for f, lang in old:
        add_past(f, lang)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))

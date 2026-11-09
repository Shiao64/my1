#!/usr/bin/env python3
"""Generate simple /event/<slug>/ (en) + /event/<slug>/zh/ detail pages for featured events
from asia/events.json (data only; unknown fields left out). Sets record field "detail".
Same shell as the hand-made pages (style.css + event-polish + atm-detail.css/js)."""
import json, os, re, html, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SLUGS = {
 'ONKkPuWH':'guangzhou-2027-tango-festival','RDrwgcit':'hong-kong-2027-festivalito','WExJslMr':'shanghai-2026-more-than-tango',
 'aanirocB':'taipei-2026-tango-wonderland','E005':'beijing-2026-javier-fatima','E042':'kuala-lumpur-2026-the-return',
 'E043':'hong-kong-2026-camila-rene','E044':'hong-kong-2026-tango-marathon','E045':'hong-kong-2026-volver-javier',
 'E086':'da-nang-2026-tango-marathon','E122':'brunei-2027-tango-week','E123':'taipei-2027-lorena-gianpiero',
 'E125':'kuala-lumpur-2026-swango-roxana','E126':'kuala-lumpur-2026-christmas-milonga','E127':'kuala-lumpur-2027-tango-intensivo',
 'E128':'kuala-lumpur-2027-tango-marathon','E129':'penang-2026-halloween-milonga','E130':'penang-2026-bridgerton-christmas-milonga',
 'E131':'beijing-2026-diego-aldana','E132':'wuhan-2027-hsld-tango-weekend','E153':'hong-kong-2026-milonga-artistica-3','JHeguuQb':'shanghai-2026-wutong-tango-weekend','E134':'shanghai-2026-wanso-milonga',
 'E162':'chengdu-2027-ich-tango-festival','E163':'chengdu-2027-tangotoworldcup-ich-competition'}
# Hand-written pages. Regenerating would replace them with the generic template.
# JHeguuQb would put closed-form ticket prices back on the page.
# E162/E163 show a TBA venue, a cross-link, and (E163) the prize poster. The template
# drops TBA venues and would not keep those sections. If the row is missing from
# asia/events.json, main() prints "missing <id>" and does not invent a page.
HANDWRITTEN = {'JHeguuQb', 'E162', 'E163'}
CITY_ZH = {'Guangzhou':'广州','Hong Kong':'香港','Shanghai':'上海','Taipei':'台北','Beijing':'北京','Kuala Lumpur':'吉隆坡',
 'Da Nang':'岘港','Bandar Seri Begawan':'斯里巴加湾','Penang':'槟城','Wuhan':'武汉','Chengdu':'成都'}
TYPE = {'festival':('探戈节','Festival'),'marathon':('马拉松','Marathon'),'milonga':('舞会','Milonga'),'event':('活动','Event')}
MON = ['January','February','March','April','May','June','July','August','September','October','November','December']
E = lambda s: html.escape(str(s), quote=True)
def bad(x): return not x or re.search(r'not found|没找到|未找到|unknown|未知|^tba$|待定', str(x), re.I)
def dates(s, e, zh):
    a = [int(x) for x in s.split('-')]; b = [int(x) for x in (e or s).split('-')]
    if zh:
        if a == b: return f'{a[0]}年{a[1]}月{a[2]}日'
        if a[0] != b[0]: return f'{a[0]}年{a[1]}月{a[2]}日–{b[0]}年{b[1]}月{b[2]}日'
        if a[1] != b[1]: return f'{a[0]}年{a[1]}月{a[2]}日–{b[1]}月{b[2]}日'
        return f'{a[0]}年{a[1]}月{a[2]}–{b[2]}日'
    if a == b: return f'{MON[a[1]-1]} {a[2]}, {a[0]}'
    if a[0] != b[0]: return f'{MON[a[1]-1]} {a[2]}, {a[0]} – {MON[b[1]-1]} {b[2]}, {b[0]}'
    if a[1] != b[1]: return f'{MON[a[1]-1]} {a[2]} – {MON[b[1]-1]} {b[2]}, {a[0]}'
    return f'{MON[a[1]-1]} {a[2]}–{b[2]}, {a[0]}'
def linkify(t):
    t = E(t)
    return re.sub(r'(https?://[^\s<，。；）)]+)', r'<a href="\1" target="_blank" rel="noopener">\1</a>', t).replace('\n', '<br>')
def page(e, slug, zh):
    name = (e.get('name_zh') if zh else None) or e['name']
    city = (CITY_ZH.get(e['city'], e['city']) if zh else e['city'])
    t = TYPE.get(e.get('type'), TYPE['event'])[0 if zh else 1]
    title = name
    secs, nav = [], []
    pre = '../../../' if zh else '../../'
    meta = ' · '.join(x for x in [t, dates(e['start'], e.get('end'), zh), city] if x)
    vn = '' if bad(e.get('venue')) else ((e.get('venue_zh') if zh else None) or e['venue'])
    a1 = '' if bad(e.get('venue_address')) else e['venue_address']
    a2 = '' if bad(e.get('venue_address_en')) else e['venue_address_en']
    ad = ([x for x in [a1] if x] + ([a2] if a2 and a2 != a1 and (e.get('country') != 'China' or not a1) else [])) if zh else ([a2 or a1] if (a2 or a1) else [])
    if vn or ad:
        nav.append(('venue', '场地' if zh else 'Venue'))
        secs.append('<section class="alt cw-venue-sec"><div class="wrap"><h2 id="venue" class="sec-title">%s</h2><p class="venue-block">%s</p></div></section>' % (
            '场地' if zh else 'Venue', '<br>'.join(([f'<b class="venue-name">{E(vn)}</b>'] if vn else []) + [E(x) for x in ad if x])))
    sch = e.get('schedule') or []
    if sch:
        WD = ['周一','周二','周三','周四','周五','周六','周日'] if zh else ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
        import datetime
        def dl(x):
            y, m, d = map(int, x.split('-')); w = WD[datetime.date(y, m, d).weekday()]
            return f'{m}月{d}日（{w}）' if zh else f'{MON[m-1][:3]} {d} ({w})'
        rows = ''.join('<tr><td>%s</td><td style="white-space:nowrap">%s</td><td>%s</td><td>%s</td><td>%s</td></tr>' % (E(dl(r['date'])), E(r['time']), E((r.get('session_zh') if zh else None) or r.get('session', '')), E(r.get('dj') or ''), E((r.get('venue_zh') if zh else None) or r.get('venue') or ('待定' if zh else 'Venue TBC'))) for r in sch)
        hd = ['日期','时间','场次','DJ','场地'] if zh else ['Date','Time','Session','DJ','Venue']
        nav.append(('schedule', '日程' if zh else 'Schedule'))
        secs.append('<section class="alt"><div class="wrap"><h2 id="schedule" class="sec-title">%s</h2><div style="overflow-x:auto"><table class="ev-sched" style="width:100%%;border-collapse:collapse;font-size:.95rem"><thead><tr>%s</tr></thead><tbody>%s</tbody></table></div><style>.ev-sched th,.ev-sched td{text-align:left;padding:6px 8px;border-bottom:1px solid rgba(240,210,138,.25);vertical-align:top}</style><p class="meta">%s</p></div></section>' % ('日程' if zh else 'Schedule', ''.join(f'<th>{h}</th>' for h in hd), rows, '以海报为准，详情请向主办方确认。' if zh else 'From the official posters; please confirm with the organizer.'))
    note = (e.get('note_zh') or e.get('note')) if zh else (e.get('note') or e.get('note_zh'))
    if note:
        nav.append(('info', '日程与说明' if zh else 'Schedule & info'))
        secs.append('<section class="alt"><div class="wrap"><h2 id="info" class="sec-title">%s</h2><p class="note">%s</p></div></section>' % ('日程与说明' if zh else 'Schedule & info', linkify(note)))
    C = e.get('contacts') if isinstance(e.get('contacts'), dict) else {}
    org = (e.get('organizers_en') if not zh else None) or e.get('organizers') or []
    li = []
    if org: li.append(('主办：' if zh else 'Organizer: ') + E(('、' if zh else ', ').join(org)))
    if C.get('wechat_id'): li.append(('微信号：' if zh else 'WeChat ID: ') + E(C['wechat_id']) + (f'（{E(C["wechat_label"])}）' if C.get('wechat_label') else ''))
    elif C.get('wechat_label'): li.append(('微信：' if zh else 'WeChat: ') + E(C['wechat_label']))
    if C.get('phone'): li.append(('电话：' if zh else 'Phone: ') + f'<a href="tel:{E(re.sub(r"[^0-9+]", "", C["phone"]))}">{E(C["phone"])}</a>')
    if C.get('email'): li.append(('邮箱：' if zh else 'Email: ') + f'<a href="mailto:{E(C["email"])}">{E(C["email"])}</a>')
    L = e.get('links') or {}
    LB = [('wechat', '微信文章', 'WeChat article'), ('facebook', '脸书', 'Facebook'), ('other', '网站', 'Website'), ('register', '报名', 'Register'), ('video', '视频', 'Video')]
    lk = [f'<a href="{E(L[k])}" target="_blank" rel="noopener">{z if zh else en}</a>' for k, z, en in LB if L.get(k) and not re.search(r'tangoweekend\.org/event/', L[k])]
    if lk: li.append(('链接：' if zh else 'Links: ') + ' · '.join(lk))
    src = e.get('source')
    if li or src:
        nav.append(('contact', '联络' if zh else 'Contact'))
        secs.append('<section id="contact" class="alt"><div class="wrap"><h2 class="sec-title">%s</h2>%s%s</div></section>' % (
            '联络' if zh else 'Contact', ('<ul class="note">' + ''.join(f'<li>{x}</li>' for x in li) + '</ul>') if li else '',
            ('<p class="meta">' + ('资料来源：' if zh else 'Source: ') + E(src) + (('，更新 ' if zh else ', updated ') + E(e['updated']) if e.get('updated') else '') + ('。详情请向主办方确认。' if zh else '. Please confirm details with the organizer.') + '</p>') if src else ''))
    poster = e.get('poster')
    banner = f'<div class="cw-topbanner" id="top" style="text-align:center"><img src="{pre}{E(poster.lstrip("/"))}" alt="{E(title)}" fetchpriority="high" style="max-width:min(100%,560px);height:auto"></div>' if poster and os.path.exists(os.path.join(ROOT, poster.lstrip('/'))) else ''
    px = [x for x in (e.get('posters_extra') or []) if os.path.exists(os.path.join(ROOT, x['src'].lstrip('/')))]
    if px:
        nav.append(('posters', '海报' if zh else 'Posters'))
        secs.append('<section class="alt"><div class="wrap"><h2 id="posters" class="sec-title">%s</h2><div class="gs-photos ev-posters">%s</div><style>.ev-posters{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin:18px 0 6px}.ev-posters figure{margin:0}.ev-posters img{width:100%%;height:auto;border-radius:10px;display:block}.ev-posters figcaption{font-size:.82rem;opacity:.75;margin-top:6px;text-align:center}</style></div></section>' % ('海报' if zh else 'Posters', ''.join(('<h3 style="grid-column:1/-1;margin:14px 0 0">%s</h3>' % E((x.get('group_zh') if zh else None) or x['group']) if x.get('group') and (i==0 or px[i-1].get('group')!=x['group']) else '') + '<figure><a href="%s%s" target="_blank" rel="noopener"><img src="%s%s" alt="%s" loading="lazy"></a><figcaption>%s</figcaption></figure>' % (pre, E(x['src'].lstrip('/')), pre, E(x['src'].lstrip('/')), E(x.get('caption_zh') if zh else x.get('caption','')), E((x.get('caption_zh') if zh else None) or x.get('caption',''))) for i, x in enumerate(px))))
    url = f'https://tangoweekend.org/event/{slug}/'
    return f'''<!DOCTYPE html>
<html lang="{'zh-CN' if zh else 'en'}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{E(title)}</title>
<link rel="canonical" href="{url}{'zh/' if zh else ''}">
<link rel="alternate" hreflang="en" href="{url}">
<link rel="alternate" hreflang="zh-CN" href="{url}zh/">
<link rel="stylesheet" href="{pre}css/style.css?v=china292">
<link rel="stylesheet" href="{pre}css/event-polish.css?v=1">
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png"><link rel="alternate icon" href="/favicon.ico"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="stylesheet" href="{pre}css/atm-detail.css?v=d10">
</head>
<body class="cw-theme ev-polish">
<div class="atm-bar atm-sticky"><a class="atm-map" href="{pre}{'zh/asia/' if zh else 'asia/'}"><span class="atm-ico" aria-hidden="true"></span>{'亚洲探戈地图' if zh else 'Asia Tango Map'}</a><a class="atm-lang" href="{'../' if zh else 'zh/'}" hreflang="{'en' if zh else 'zh-CN'}">{'EN' if zh else '中文'}</a></div>
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="./" style="font-weight:700;color:#f0d28a;text-decoration:none;margin-right:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:calc(100vw - 80px);display:inline-block;vertical-align:middle">{E(title)}</a>
    <button class="nav-toggle" aria-label="Menu" aria-expanded="false">☰</button>
    <div class="header-menus">
    <nav class="main-nav" aria-label="Sections">{''.join(f'<a href="#{a}">{b}</a>' for a, b in nav)}</nav>
    </div>
  </div>
</header>
{banner}
<h1 class="sr-only">{E(title)}</h1>
<section class="alt"><div class="wrap"><p class="meta" style="text-align:center">{E(meta)}</p><h2 class="sec-title" style="text-align:center">{E(title)}</h2></div></section>{''.join(secs)}
<footer><div class="wrap"></div></footer>
<script>(function(){{var btn=document.querySelector('.nav-toggle'),header=document.querySelector('.site-header');if(!btn||!header)return;btn.addEventListener('click',function(){{var o=header.classList.toggle('is-open');btn.setAttribute('aria-expanded',o);}});header.querySelectorAll('.main-nav a').forEach(function(a){{a.addEventListener('click',function(){{header.classList.remove('is-open');btn.setAttribute('aria-expanded',false);}});}});}})();</script>
<script src="{pre}asia/atm-detail.js?v=d10"></script>
</body>
</html>
'''
def main():
    files = ['asia/events.json', 'asia/events-core.json', 'asia/events-more.json']
    full = json.load(open(os.path.join(ROOT, files[0])))
    by = {e['id']: e for e in full}
    n = 0
    only = set(sys.argv[1:])
    for i, slug in SLUGS.items():
        if only and i not in only: continue
        e = by.get(i)
        if not e: print('missing', i); continue
        if i in HANDWRITTEN:
            print('skip handwritten', slug)
            continue
        for zh in (False, True):
            d = os.path.join(ROOT, 'event', slug, 'zh' if zh else '')
            os.makedirs(d, exist_ok=True)
            open(os.path.join(d, 'index.html'), 'w').write(page(e, slug, zh))
        n += 1
    for f in files:
        p = os.path.join(ROOT, f); raw = open(p).read(); d = json.loads(raw)
        for e in d:
            if only and e['id'] not in only: continue
            if e['id'] in SLUGS: e['detail'] = f'/event/{SLUGS[e["id"]]}/'
        # Pretty files stay pretty. Compact files (events-more.json) stay compact.
        # A full run with no ids still rewrites every slug's detail; pass ids to limit that.
        pretty = raw.startswith('[\n')
        if pretty:
            out = json.dumps(d, ensure_ascii=False, indent=2) + '\n'
        else:
            out = json.dumps(d, ensure_ascii=False, separators=(',', ':')) + ('\n' if raw.endswith('\n') else '')
        open(p, 'w').write(out)
    print('built', n)
if __name__ == '__main__': main()

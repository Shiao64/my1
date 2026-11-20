#!/usr/bin/env python3
"""List cards whose info is getting old (Shiao 2026-11-20, direction doc: data trust).

Writes data/stale-cards.md: visible, not-yet-ended cards in mainland China / HK / TW whose
`confirmed` (organizer confirmed) or else `updated` date is more than 60 days ago.
The card face already warns dancers: 31–90 days grey "请再次向组织者确认", >90 days orange
"资料已久未更新，可能停办了" (asia/cardB.js p10freshInfo).
探戈助理 checks this list each month (data/inbox/README.md). Over 120 days: listed apart
for Shiao to decide (hide or keep). Nothing is changed or deleted here.

    python3 tools/stale_cards.py [--today=YYYY-MM-DD] [--days=60]
"""
import datetime, json, os, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
CN = {'China', 'Hong Kong', 'Taiwan', 'Macau'}


def main():
    args = dict(a[2:].split('=', 1) for a in sys.argv[1:] if a.startswith('--') and '=' in a)
    today = datetime.date.fromisoformat(args.get('today') or datetime.date.today().isoformat())
    limit = int(args.get('days', 60))
    ev = json.load(open(os.path.join(ROOT, 'asia', 'events.json'), encoding='utf-8'))
    rows = []
    for e in ev:
        if e.get('hidden') or e.get('preview'):
            continue
        if (e.get('country') or e.get('region')) not in CN and e.get('region') not in CN:
            continue
        if e.get('kind') == 'event' and (e.get('end') or e.get('start') or '9999') < today.isoformat():
            continue
        d = str(e.get('confirmed') or e.get('updated') or '')[:10]
        try:
            n = (today - datetime.date.fromisoformat(d)).days
        except ValueError:
            n, d = 9999, '（无日期）'
        if n > limit:
            rows.append((n, e['id'], e.get('name_zh') or e.get('name') or '', e.get('city') or '', ', '.join(e.get('organizers') or []), d))
    rows.sort(reverse=True)
    # 2026-11-20 (Shiao): cards with no contact and no link show an orange warning on the card; list them too
    noreach = []
    for e in ev:
        if e.get('hidden') or e.get('preview'):
            continue
        if (e.get('country') or e.get('region')) not in CN and e.get('region') not in CN:
            continue
        if e.get('kind') == 'event' and (e.get('end') or e.get('start') or '9999') < today.isoformat():
            continue
        c = e.get('contacts') or {}
        hc = bool(c) if isinstance(c, list) else any(str(v or '').strip() for v in c.values())
        hl = any(v for v in (e.get('links') or {}).values())
        if not hc and not hl:
            noreach.append((e['id'], e.get('name_zh') or e.get('name') or '', e.get('city') or '', e.get('venue_address') or '（无地址）'))
    old = [r for r in rows if r[0] > 120]
    mid = [r for r in rows if r[0] <= 120]
    out = [f'# 快过期、资料不完整的活动卡（{today.isoformat()} 生成）', '',
           f'资料超过 {limit} 天没有确认或更新的卡。自动生成，每月 1 号更新，不要手改。', '',
           '**探戈助理**：去主办的公众号、朋友圈、微信群找最近的活动消息。确认还在办，就交一份答复（`data/inbox/`），写「<卡号> 仍在办，依据：……」，Claude 会把这张卡的 `updated` 改成当天；有新海报就一起附上。查不到就写「查不到」，不要猜。', '']
    def table(title, rs):
        out.append(f'## {title}（{len(rs)} 张）'); out.append('')
        if not rs:
            out.append('无。'); out.append(''); return
        out.append('| 卡号 | 名称 | 城市 | 主办 | 最后更新 | 天数 |'); out.append('|---|---|---|---|---|---|')
        for n, i, nm, c, o, d in rs:
            out.append(f'| {i} | {nm} | {c} | {o} | {d} | {n if n < 9999 else "—"} |')
        out.append('')
    table('61–120 天：请探戈助理确认', mid)
    table('超过 120 天：可能已停办，请 Shiao 决定隐藏还是保留', old)
    out.append(f'## 没有联络方式也没有链接（{len(noreach)} 张）'); out.append('')
    out.append('卡上显示灰色「联络方式待补充，出发前建议先向当地舞友打听」。**探戈助理**：找主办名字、微信／电话／邮箱，或公众号、网站链接，交答复补上；补齐后提示自动消失。地址不完整（没有路名门牌）的也一起补。'); out.append('')
    if noreach:
        out.append('| 卡号 | 名称 | 城市 | 地址 |'); out.append('|---|---|---|---|')
        for i, nm, c, a in noreach:
            out.append(f'| {i} | {nm} | {c} | {a} |')
    else:
        out.append('无。')
    out.append('')
    p = os.path.join(ROOT, 'data', 'stale-cards.md')
    open(p, 'w', encoding='utf-8').write('\n'.join(out))
    print(f'{len(rows)} stale cards ({len(old)} over 120 days), {len(noreach)} without contact -> data/stale-cards.md')


if __name__ == '__main__':
    main()

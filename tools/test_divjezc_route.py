#!/usr/bin/env python3
"""DIVjezcE route photos stay in order, one language per field, address unchanged."""
import json, os, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
ADDR = '上海市黄浦区西藏南路765号1502室（永惠大厦A栋，近方斜支路口）'
ADDRE = 'Room 1502, Tower A, Yonghui Building, No. 765 South Xizang Road, Huangpu District, Shanghai (near Fangxie Branch Road)'
ORDER = [
    'DIVjezcE-01-exterior.jpg',
    'DIVjezcE-02-entrance.jpg',
    'DIVjezcE-03-lobby.jpg',
    'DIVjezcE-04-room1502.jpg',
]
LANG = ('caption', 'caption_en', 'caption_ko', 'caption_es')

def load(rel):
    with open(os.path.join(ROOT, rel), encoding='utf-8') as fh:
        return json.load(fh)

def main():
    bad = []
    cards = []
    for rel in ('asia/events.json', 'asia/events-core.json'):
        e = next(x for x in load(rel) if x.get('id') == 'DIVjezcE')
        cards.append(e)
        if e.get('venue_address') != ADDR or e.get('venue_address_en') != ADDRE:
            bad.append(rel + ' address changed')
        if e.get('venue') != '永惠大厦A栋 1502室':
            bad.append(rel + ' venue changed')
        pics = e.get('directions_images') or []
        if [os.path.basename(p.get('src', '')) for p in pics] != ORDER:
            bad.append(rel + ' photo order')
        for p in pics:
            path = os.path.join(ROOT, p['src'].lstrip('/'))
            if not os.path.isfile(path):
                bad.append('missing ' + p['src'])
            vals = [p.get(k) or '' for k in LANG]
            if any(not v.strip() for v in vals):
                bad.append(rel + ' empty caption ' + p['src'])
            if len(set(vals)) != 4:
                bad.append(rel + ' captions not separated ' + p['src'])
        for k in ('directions', 'directions_en', 'directions_ko', 'directions_es'):
            if not (e.get(k) or '').strip():
                bad.append(rel + ' missing ' + k)
        dirs = [e.get(k) for k in ('directions', 'directions_en', 'directions_ko', 'directions_es')]
        if len(set(dirs)) != 4:
            bad.append(rel + ' directions not separated')
    if json.dumps(cards[0].get('directions_images'), ensure_ascii=False) != json.dumps(cards[1].get('directions_images'), ensure_ascii=False):
        bad.append('json and core captions differ')
    first = cards[0]['directions_images'][0]
    if first.get('caption') != '沿方斜路向前；找到旁边小区入口':
        bad.append('exterior caption')
    if '永惠大厦' in (first.get('caption') or '') or 'Yonghui' in (first.get('caption_en') or ''):
        bad.append('exterior caption still points at the building')
    gate = cards[0]['directions_images'][1]
    if gate.get('caption') != '1. 大门进入；2. A栋门口':
        bad.append('entrance caption')
    if gate.get('caption_en') != '1. Enter through the main gate; 2. Tower A entrance.':
        bad.append('entrance caption_en')
    lobby = cards[0]['directions_images'][2]
    if lobby.get('caption') != '大堂电梯，乘电梯到15楼':
        bad.append('lobby caption')
    if lobby.get('caption_en') != 'Lobby elevator. Take the elevator to the 15th floor.':
        bad.append('lobby caption_en')
    if '15층' not in (lobby.get('caption_ko') or '') or 'piso 15' not in (lobby.get('caption_es') or ''):
        bad.append('lobby floor translation')
    blob = (cards[0].get('directions') or '') + (cards[0].get('directions_en') or '')
    if '左侧通道' in blob or 'left passage' in blob or '没有标出' in blob or 'do not mark' in blob:
        bad.append('directions still say the floor or elevator was unmarked')
    if '沿街走到永惠大厦' in (cards[0].get('directions') or '') or 'Walk to Yonghui' in (cards[0].get('directions_en') or ''):
        bad.append('directions still send people straight to the building')
    room = cards[0]['directions_images'][3]
    if room.get('caption') != '按 Tango Bang 招牌箭头向左，进入1502室。':
        bad.append('room caption')
    if '楼层' in room.get('caption', '') or '电梯' in room.get('caption', ''):
        bad.append('room caption invented a floor route')
    for k in LANG:
        if '1502' not in (room.get(k) or '') or 'Tango Bang' not in (room.get(k) or ''):
            bad.append('room caption missing the sign or room ' + k)
    if cards[0].get('poster') != '/images/asia/posters/DIVjezcE-tangobang.jpg':
        bad.append('poster is not the Tango Bang logo')
    if 'R018.jpg' in (cards[0].get('poster') or '') or cards[0].get('posters_past'):
        bad.append('old poster still public')
    if cards[0].get('organizers') != ['Vivian Yeh'] or cards[0].get('organizers_en') != ['Vivian Yeh']:
        bad.append('organizer spelling')
    label = ((cards[0].get('contacts') or {}).get('wechat_label') or '')
    if label != 'TangoBang / Vivian Yeh':
        bad.append('wechat label spelling')
    if cards[0].get('time') != '21:00–01:00' or cards[0].get('weekday') != 5:
        bad.append('time or weekday changed')
    if bad:
        print('\n'.join(bad))
        return 1
    print('DIVjezcE route ok')
    return 0

if __name__ == '__main__':
    sys.exit(main())

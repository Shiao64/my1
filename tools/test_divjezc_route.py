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
    lobby = cards[0]['directions_images'][2]['caption']
    if '场地门口' not in lobby or '大堂' not in lobby:
        bad.append('lobby caption does not say it is not the venue door')
    room = cards[0]['directions_images'][3]
    if room.get('caption') != '按 Tango Bang 招牌箭头向左，进入1502室。':
        bad.append('room caption')
    if '楼层' in room.get('caption', '') or '电梯' in room.get('caption', ''):
        bad.append('room caption invented a floor route')
    for k in LANG:
        if '1502' not in (room.get(k) or '') or 'Tango Bang' not in (room.get(k) or ''):
            bad.append('room caption missing the sign or room ' + k)
    if bad:
        print('\n'.join(bad))
        return 1
    print('DIVjezcE route ok')
    return 0

if __name__ == '__main__':
    sys.exit(main())

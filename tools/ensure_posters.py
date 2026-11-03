#!/usr/bin/env python3
"""Guard: every visible card (hidden != true) in asia/events*.json must have a poster.

Order: keep `poster`; else newest `posters_past[0]` (real past poster);
else generate a text poster (1080x1350, same style as posters/generated/R0xx.png)
at images/asia/posters/generated/<id>.png plus list/card thumbs and ATM_TH entry.

  python3 tools/ensure_posters.py           # fix in place
  python3 tools/ensure_posters.py --check   # exit 1 if any visible card has no poster
  --skip ID[,ID]                            # leave these ids untouched this run
"""
import json, os, sys, hashlib
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
FILES = ['asia/events.json', 'asia/events-core.json', 'asia/events-more.json']
PAL = ['#D9C28F', '#E4E4E1', '#F2E1DA']; INK = '#0a4f57'; ACC = '#0e6e78'; WD = '日一二三四五六'
B = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'; R = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'

def visible(e): return isinstance(e, dict) and e.get('id') and e.get('hidden') is not True

def wrap(d, t, font, w):
    lines, cur = [], ''
    for ch in t:
        if d.textlength(cur + ch, font=font) > w and cur:
            if ' ' in cur: i = cur.rfind(' '); lines.append(cur[:i]); cur = cur[i+1:] + ch
            else: lines.append(cur); cur = ch
        else: cur += ch
    lines.append(cur); return [l.strip() for l in lines]

def generate(e):
    from PIL import Image, ImageDraw, ImageFont
    f = lambda p, s: ImageFont.truetype(p, s, index=2)
    W, H = 1080, 1350
    bg = PAL[int(hashlib.md5(e['id'].encode()).hexdigest(), 16) % 3]
    im = Image.new('RGBA', (W, H), bg); ov = Image.new('RGBA', (W, H), (0,0,0,0)); od = ImageDraw.Draw(ov)
    for k in range(14):
        r = 180 + k*60; od.ellipse((W+40-r, H+40-r, W+40+r, H+40+r), outline=(14,110,120,28), width=3)
    im = Image.alpha_composite(im, ov).convert('RGB'); dr = ImageDraw.Draw(im)
    x, y = 80, 90; dr.rectangle((x, y, x+120, y+8), fill=ACC); y += 50
    fn = f(B, 96)
    for l in wrap(dr, e.get('name') or e['id'], fn, W-160)[:4]: dr.text((x, y), l, font=fn, fill=INK); y += 122
    y += 20
    wds = e.get('weekdays') or ([e['weekday']] if e.get('weekday') is not None else [])
    if wds: line2 = '、'.join('周' + WD[w % 7] for w in wds)
    else: line2 = (e.get('start') or '') + (('–' + e['end']) if e.get('end') and e.get('end') != e.get('start') else '')
    if e.get('time'): line2 = (line2 + '  ' + e['time']).strip()
    if line2: dr.text((x, y), line2, font=f(B, 60), fill=INK); y += 95
    fv = f(R, 52)
    for l in wrap(dr, ' · '.join(v for v in [e.get('venue'), e.get('city')] if v), fv, W-160)[:2]:
        dr.text((x, y), l, font=fv, fill=INK); y += 70
    web = f"/images/asia/posters/generated/{e['id']}.png"
    im.save(ROOT + web, optimize=True)
    sys.path.insert(0, os.path.dirname(__file__))
    import radar_poster_update as rpu
    lw, lj, ls, cw, cj, cs = rpu.thumb_image(im)
    for base, wb, jb in [('images/thumb', lw, lj), ('images/thumb800', cw, cj)]:
        stem = os.path.join(ROOT, base + os.path.splitext(web)[0]); os.makedirs(os.path.dirname(stem), exist_ok=True)
        open(stem + '.webp', 'wb').write(wb); open(stem + '.jpg', 'wb').write(jb)
    rpu.update_atm_th(ROOT, web, ls)
    return web

def past_guard(data):
    """Fail if any posters_past entry present in HEAD was dropped, or its file is missing (ALLOW_PAST_DROP=1 to override)."""
    import subprocess
    bad = []
    for rel, L in data.items():
        try: old = json.loads(subprocess.check_output(['git', '-C', ROOT, 'show', 'HEAD:' + rel], stderr=subprocess.DEVNULL))
        except Exception: old = []
        cur = {e['id']: e for e in L}
        for e in old:
            c = cur.get(e['id'])
            if not c: continue
            have = set((c.get('posters_past') or []) + [c.get('poster')])
            for u in (e.get('posters_past') or []):
                if u not in have: bad.append(f'PAST DROPPED: {rel} {e["id"]} {u}')
        for e in L:
            for u in (e.get('posters_past') or []):
                if isinstance(u, str) and u.startswith('/') and not os.path.isfile(os.path.join(ROOT, u.split('?')[0].lstrip('/'))):
                    bad.append(f'PAST FILE MISSING: {rel} {e["id"]} {u}')
    for b in bad: print(b)
    if bad and os.environ.get('ALLOW_PAST_DROP') != '1':
        print(f'FAIL: {len(bad)} past-poster problem(s); set ALLOW_PAST_DROP=1 if intentional'); sys.exit(1)
    print('OK: no past posters dropped')

def main():
    check = '--check' in sys.argv
    skip = set()
    if '--skip' in sys.argv: skip = set(sys.argv[sys.argv.index('--skip') + 1].split(','))
    data = {}
    for rel in FILES:
        p = os.path.join(ROOT, rel)
        if os.path.isfile(p): data[rel] = json.load(open(p, encoding='utf-8'))
    missing = {}
    for rel, L in data.items():
        for e in L:
            if visible(e) and not e.get('poster') and e['id'] not in skip: missing.setdefault(e['id'], e)
    if check:
        past_guard(data)
        for i, e in missing.items(): print('NO POSTER:', i, e.get('name'))
        if missing: print(f'FAIL: {len(missing)} visible card(s) without poster; run tools/ensure_posters.py'); sys.exit(1)
        print('OK: every visible card has a poster'); return
    fixed = {}
    for i, e in missing.items():
        past = [p for p in (e.get('posters_past') or []) if isinstance(p, str) and p]
        fixed[i] = (past[0], 'past') if past else (generate(e), 'generated')
    for rel, L in data.items():
        ch = False
        for e in L:
            if isinstance(e, dict) and e.get('id') in fixed and not e.get('poster') and e.get('hidden') is not True:
                e['poster'] = fixed[e['id']][0]; e.setdefault('poster_pos', 'center top'); ch = True
        if ch:
            compact = rel != 'asia/events.json' or open(os.path.join(ROOT, rel)).read(3) != '[\n '
            txt = json.dumps(L, ensure_ascii=False, separators=(',', ':')) if compact else json.dumps(L, ensure_ascii=False, indent=2) + '\n'
            open(os.path.join(ROOT, rel), 'w', encoding='utf-8').write(txt)
    for i, (p, how) in fixed.items(): print(how, i, missing[i].get('name'), p)
    print(f'fixed {len(fixed)}')

if __name__ == '__main__': main()

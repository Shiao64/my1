#!/usr/bin/env python3
"""Multi-poster rule (owner 2026-11-04): an event with 2+ posters shows them side by side, all fully visible, no 过期 label.
  python3 tools/make_duo.py ID img1 img2 [img3...]
Builds images/asia/posters/<ID>-duo.jpg (same height, 16px gap) + 480w list / 800w card thumbs (jpg+webp).
Set poster=/images/asia/posters/<ID>-duo.jpg and posters_extra=[originals]. Never put them in posters_past.
CSS (cardB.css, atm-home.js) shows any *-duo.* image with object-fit:contain, so nothing is cropped."""
import sys; from PIL import Image
i, *src = sys.argv[1:]; ims = [Image.open(p).convert('RGB') for p in src]; H = min(m.height for m in ims); g = 16
ims = [m.resize((round(m.width*H/m.height), H), Image.LANCZOS) for m in ims]
c = Image.new('RGB', (sum(m.width for m in ims)+g*(len(ims)-1), H), (255,255,255)); x = 0
for m in ims: c.paste(m, (x, 0)); x += m.width+g
c.save(f'images/asia/posters/{i}-duo.jpg', quality=85)
for d, w in [('thumb', 480), ('thumb800', 800)]:
    t = c.resize((w, round(H*w/c.width)), Image.LANCZOS)
    for ext in ('jpg', 'webp'): t.save(f'images/{d}/images/asia/posters/{i}-duo.{ext}', quality=82)
print(c.size)

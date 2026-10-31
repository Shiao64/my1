#!/usr/bin/env python3
"""Compress recap photos -> WebP, long edge <=1600px, q80. Usage: recap_photos.py OUTDIR img1 [img2 ...] (max 8)
Prints the web paths to paste into the event's recap.photos list."""
import sys, os
from PIL import Image, ImageOps
out, srcs = sys.argv[1], sys.argv[2:10]
os.makedirs(out, exist_ok=True)
for i, s in enumerate(srcs, 1):
    im = ImageOps.exif_transpose(Image.open(s)).convert('RGB')
    im.thumbnail((1600, 1600), Image.LANCZOS)
    d = os.path.join(out, f'recap{i:02d}.webp')
    im.save(d, 'WEBP', quality=80, method=6)
    print('/' + os.path.relpath(d).replace(os.sep, '/'), im.size, os.path.getsize(d)//1024, 'KB')

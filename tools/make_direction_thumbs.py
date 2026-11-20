#!/usr/bin/env python3
"""Small thumbnails for 指路图 (route photos under images/asia/directions/).

The card shows each route photo as an 88x66 button (128x96 on the enlarged
card). Those buttons used to load the full photo. This script writes
images/asia/directions/thumb/<name>.webp, sized to cover 384x288 (3x the
largest button), and asia/atm-addr.js loads that file first (falling back to
the full photo if the thumb is missing).

  python3 tools/make_direction_thumbs.py          # make missing thumbs
  python3 tools/make_direction_thumbs.py --force  # remake all (after replacing a photo's bytes)
  python3 tools/make_direction_thumbs.py --check  # exit 1 if any photo has no thumb
"""
import os
import sys

from PIL import Image, ImageOps

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC = os.path.join(ROOT, 'images', 'asia', 'directions')
OUT = os.path.join(SRC, 'thumb')
EXT = ('.jpg', '.jpeg', '.png', '.webp')
BOX = (384, 288)


def thumb_path(name):
    return os.path.join(OUT, os.path.splitext(name)[0] + '.webp')


def photos():
    return sorted(f for f in os.listdir(SRC)
                  if f.lower().endswith(EXT) and os.path.isfile(os.path.join(SRC, f)))


def stale(name):
    return '--force' in sys.argv or not os.path.isfile(thumb_path(name))


def make(name):
    im = ImageOps.exif_transpose(Image.open(os.path.join(SRC, name))).convert('RGB')
    w, h = im.size
    s = max(BOX[0] / w, BOX[1] / h)
    if s < 1:
        im = im.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)
    os.makedirs(OUT, exist_ok=True)
    im.save(thumb_path(name), 'WEBP', quality=72, method=6)
    return thumb_path(name)


def main():
    todo = [n for n in photos() if stale(n)]
    if '--check' in sys.argv:
        for n in todo:
            print('missing thumb:', n)
        return 1 if todo else 0
    for n in todo:
        p = make(n)
        print('%-40s -> thumb/%s (%d KB)' % (n, os.path.basename(p), os.path.getsize(p) // 1024))
    if not todo:
        print('all thumbs up to date')
    return 0


if __name__ == '__main__':
    sys.exit(main())

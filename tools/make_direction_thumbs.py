#!/usr/bin/env python3
"""Small copies of 指路图 (route photos under images/asia/directions/).

Two WebP copies per photo, same sizes as posters' thumb + thumb800:
  thumb/<name>.webp  covers 384x288 (3x the card button), ~10-35KB.
                     The card buttons load this.
  w800/<name>.webp   longest side 800px, ~25-80KB.
                     The enlarged viewer shows the cached thumb at once, then
                     swaps to this; the original file is only a fallback.

  python3 tools/make_direction_thumbs.py          # make missing copies
  python3 tools/make_direction_thumbs.py --force  # remake all (after replacing a photo's bytes)
  python3 tools/make_direction_thumbs.py --check  # exit 1 if any photo is missing a copy
"""
import os
import sys

from PIL import Image, ImageOps

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC = os.path.join(ROOT, 'images', 'asia', 'directions')
EXT = ('.jpg', '.jpeg', '.png', '.webp')
KINDS = ('thumb', 'w800')


def out_path(kind, name):
    return os.path.join(SRC, kind, os.path.splitext(name)[0] + '.webp')


def photos():
    return sorted(f for f in os.listdir(SRC)
                  if f.lower().endswith(EXT) and os.path.isfile(os.path.join(SRC, f)))


def todo(name):
    return [k for k in KINDS if '--force' in sys.argv or not os.path.isfile(out_path(k, name))]


def make(kind, name):
    im = ImageOps.exif_transpose(Image.open(os.path.join(SRC, name))).convert('RGB')
    w, h = im.size
    if kind == 'thumb':
        s = max(384 / w, 288 / h)
        q = 72
    else:
        s = 800 / max(w, h)
        q = 60
    if s < 1:
        im = im.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)
    p = out_path(kind, name)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    im.save(p, 'WEBP', quality=q, method=6)
    return p


def main():
    jobs = [(k, n) for n in photos() for k in todo(n)]
    if '--check' in sys.argv:
        for k, n in jobs:
            print('missing %s copy: %s' % (k, n))
        return 1 if jobs else 0
    for k, n in jobs:
        p = make(k, n)
        print('%-40s -> %s/%s (%d KB)' % (n, k, os.path.basename(p), os.path.getsize(p) // 1024))
    if not jobs:
        print('all copies up to date')
    return 0


if __name__ == '__main__':
    sys.exit(main())

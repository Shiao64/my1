#!/usr/bin/env python3
"""Mobile route-lightbox contract. Desktop rules in atm-addr.js stay put."""
import pathlib
import subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
JS = (ROOT / 'asia' / 'atm-addr.js').read_text(encoding='utf-8')
bad = []

def need(cond, msg):
    if not cond:
        bad.append(msg)

base, _, mobile = JS.partition('@media (orientation:landscape)')
need('@media (max-width:540px) and (min-height:480px)' in JS, 'portrait breakpoint missing')
need('object-fit:contain' in JS and 'object-fit:cover' not in JS.split('#atm-adr-pv')[1].split('#atm-adr-big')[0], 'route photo must stay contain')
need("font:600 15px/1.3 system-ui,sans-serif" in base, 'desktop step type changed')
need("font:15px/1.45 system-ui,sans-serif" in base, 'desktop caption type changed')
need('#atm-adr-pv .pv-main{flex:1;' in base, 'desktop photo column changed')
need('width:auto;height:auto;object-fit:contain' in mobile, 'mobile photo can stretch')
need('PingFang SC' in mobile, 'mobile Chinese font stack missing')
need('env(safe-area-inset-top)' in mobile and 'env(safe-area-inset-bottom)' in mobile, 'safe area missing')
need('100dvh' in mobile, 'dynamic viewport missing')
need('aria-labelledby' in JS and 'aria-describedby' in JS and 'aria-live' in JS, 'caption sync a11y missing')
need("prev: '上一张'" in JS and "next: '下一张'" in JS, 'Chinese control names missing')
need('visualViewport' in JS, 'WeChat/iOS visual viewport missing')
for html in ('asia/index.html', 'zh/asia/index.html'):
    text = (ROOT / html).read_text(encoding='utf-8')
    need('atm-addr.js?v=ad7' in text, html + ' still on old atm-addr cache key')
    need('atm-addr.js?v=ad6' not in text, html + ' still references ad6')
need("thumbOf(p.src, 'w800')" in JS and 'data-full' in JS, 'route photos should use thumb/ on the card and w800/ in the viewer, original as fallback')
need(subprocess.run([sys.executable, str(ROOT / 'tools' / 'make_direction_thumbs.py'), '--check']).returncode == 0, 'route photo missing thumb/w800 copy (run tools/make_direction_thumbs.py)')

if bad:
    print('\n'.join(bad))
    sys.exit(1)
print('route lightbox contract ok')

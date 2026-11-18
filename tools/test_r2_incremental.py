#!/usr/bin/env python3
"""R2 sync uploads only changed files. Run: python3 tools/test_r2_incremental.py"""
import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import r2_sync_cards as R

d = tempfile.mkdtemp()
def mk(name, body):
    p = os.path.join(d, name)
    with open(p, 'wb') as fh:
        fh.write(body)
    return p

keys = {
    'asia/events-core.json': mk('a.json', b'[]'),
    'images/asia/posters/A.jpg': mk('A.jpg', b'aaa'),
    'images/asia/posters/B.jpg': mk('B.jpg', b'bbb'),
}
# No list on R2: everything goes up.
up, skip, hashes = R.plan_upload(keys, None)
assert set(up) == set(keys) and not skip, (up, skip)
# Same list: only JSON goes up.
up, skip, _ = R.plan_upload(keys, dict(hashes))
assert set(up) == {'asia/events-core.json'} and set(skip) == {'images/asia/posters/A.jpg', 'images/asia/posters/B.jpg'}
# B changed: B and JSON go up.
mk('B.jpg', b'bbb2')
up, skip, new = R.plan_upload(keys, dict(hashes))
assert set(up) == {'asia/events-core.json', 'images/asia/posters/B.jpg'} and skip == ['images/asia/posters/A.jpg']
assert new['images/asia/posters/B.jpg'] != hashes['images/asia/posters/B.jpg']
# New file C not on the list: goes up.
keys['images/asia/posters/C.jpg'] = mk('C.jpg', b'c')
up, _, _ = R.plan_upload(keys, dict(hashes))
assert 'images/asia/posters/C.jpg' in up
assert R.cache_control(R.HASH_KEY) == 'no-store'
# Images before JSON, so live data never points at a picture not uploaded yet.
order = R.upload_order(['asia/manifest.json', 'asia/events-core.json', 'images/thumb/x.webp', 'images/asia/posters/A.jpg'])
assert order == ['images/asia/posters/A.jpg', 'images/thumb/x.webp', 'asia/events-core.json', 'asia/manifest.json'], order
print('ok 6 checks')

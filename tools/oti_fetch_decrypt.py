#!/usr/bin/env python3
"""Read-only fetch of OnlyTangoInfo public data, decrypted to `var publicEvent=[...]` JS.

Usage: python3 tools/oti_fetch_decrypt.py OUT.js
Resolves https://is.gd/kokoinfo (following redirects) to https://onlytangos.github.io/tangoworld/#k=<key>;
falls back to env OTI_KEY. Prints the publicEventFecha date (or today) on stdout.
Only performs GET requests; never writes to OTI.
"""
import base64, datetime, os, re, sys, urllib.request
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

SHORT = 'https://is.gd/kokoinfo'
DATA = 'https://onlytangos.github.io/tangoworld/datajs/datos.cifrados.js'
UA = {'User-Agent': 'Mozilla/5.0 (tangoweekend.org weekly read-only sync)'}

def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.geturl(), r.read()

def resolve_key():
    try:
        final, _ = get(SHORT)
        m = re.search(r'[#&?]k=([A-Za-z0-9_\-]+)', final)
        if m: return m.group(1)
        print('WARN: no k= in final URL', final, file=sys.stderr)
    except Exception as e:
        print('WARN: resolve failed:', e, file=sys.stderr)
    k = os.environ.get('OTI_KEY', '').strip()
    if not k: sys.exit('ERROR: could not obtain OTI key (no k= in redirect and OTI_KEY unset)')
    return k

def b64url(s):
    return base64.urlsafe_b64decode(s + '=' * (-len(s) % 4))

def main():
    out = sys.argv[1]
    key = b64url(resolve_key())
    _, js = get(DATA)
    m = re.search(rb'DATOS_CIFRADOS\s*=\s*["\']([^"\']+)["\']', js)
    if not m: sys.exit('ERROR: DATOS_CIFRADOS not found')
    raw = base64.b64decode(m.group(1))
    txt = AESGCM(key).decrypt(raw[:12], raw[12:], None).decode('utf-8')
    if 'var publicEvent=' not in txt: sys.exit('ERROR: decrypted text lacks publicEvent')
    open(out, 'w', encoding='utf-8').write(txt)
    d = re.search(r'publicEventFecha\s*=\s*["\'](\d{4}-\d{2}-\d{2})', txt)
    print(d.group(1) if d else datetime.date.today().isoformat())

if __name__ == '__main__':
    main()

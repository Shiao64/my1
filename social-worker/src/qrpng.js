// QR code as a PNG (email clients do not show SVG). Black/white, 1 bit per module scaled up, zlib via CompressionStream.
import qrcode from './vendor/qrcode.js';

const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const out = new Uint8Array(12 + data.length), dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}
async function zlib(raw) {
  const cs = new CompressionStream('deflate');
  const w = cs.writable.getWriter(); w.write(raw); w.close();
  return new Uint8Array(await new Response(cs.readable).arrayBuffer());
}
export function qrMatrix(text) { const q = qrcode(0, 'M'); q.addData(text); q.make(); const n = q.getModuleCount(); return { n, dark: (r, c) => q.isDark(r, c) }; }

// scale: pixels per module; quiet zone of 4 modules.
export async function qrPng(text, scale = 8) {
  const { n, dark } = qrMatrix(text), q = 4, size = (n + 2 * q) * scale;
  const rowBytes = Math.ceil(size / 8), raw = new Uint8Array((rowBytes + 1) * size);
  for (let y = 0; y < size; y++) {
    const r = Math.floor(y / scale) - q, base = y * (rowBytes + 1);
    raw[base] = 0;   // filter: none
    for (let x = 0; x < size; x++) {
      const c = Math.floor(x / scale) - q;
      const white = r < 0 || c < 0 || r >= n || c >= n || !dark(r, c);
      if (white) raw[base + 1 + (x >> 3)] |= 0x80 >> (x & 7);   // 1-bit grayscale: 1 = white
    }
  }
  const ihdr = new Uint8Array(13), dv = new DataView(ihdr.buffer);
  dv.setUint32(0, size); dv.setUint32(4, size); ihdr[8] = 1; ihdr[9] = 0; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', await zlib(raw)), chunk('IEND', new Uint8Array(0))];
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

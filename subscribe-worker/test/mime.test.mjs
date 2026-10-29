import assert from 'node:assert/strict';
import { buildMime, encWord } from '../src/mime.js';
const raw = buildMime({ fromName: 'Asia Tango Map', fromEmail: 'selecttango@gmail.com', to: 'a@b.com', subject: '请确认订阅：亚洲探戈地图新活动通知',
  text: '您好！\n链接 https://x/confirm?t=1', html: '<p>您好</p>', headers: { 'List-Unsubscribe': '<https://x/u>' }, boundary: 'BB' });
const hdr = raw.split('\r\n\r\n')[0];
assert.match(hdr, /^From: Asia Tango Map <selecttango@gmail\.com>$/m);
assert.match(hdr, /^Subject: =\?UTF-8\?B\?/m);
assert.ok(!/[^\x00-\x7f]/.test(raw), 'raw must be 7-bit ASCII');
assert.match(raw, /multipart\/alternative; boundary="BB"/);
const parts = raw.split('--BB').slice(1, 3).map(p => Buffer.from(p.split('\r\n\r\n')[1].replace(/\s/g, ''), 'base64').toString('utf8'));
assert.equal(parts[0], '您好！\n链接 https://x/confirm?t=1'); assert.equal(parts[1], '<p>您好</p>');
const subj = hdr.match(/^Subject: ([\s\S]*?)\r\n(?=\S)/m)[1].split(/\r\n /).map(w => Buffer.from(w.slice(10, -2), 'base64').toString('utf8')).join('');
assert.equal(subj, '请确认订阅：亚洲探戈地图新活动通知');
assert.ok(raw.split('\r\n').every(l => l.length <= 998));
assert.equal(encWord('Plain'), 'Plain');
assert.throws(() => buildMime({ fromName: 'x', fromEmail: 'a@b', to: 'x@y\r\nBcc: z', subject: 's', text: 't' }));
console.log('mime tests OK');

// Origin gate for /social/* POSTs. The confirm form is served from the API host and
// posts back to /social/confirm; that route is token-authenticated and must not 403.
// Other /social/* POSTs from an untrusted Origin still return forbidden_origin.
// Run: node social-worker/test/origin.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const dir = '/tmp/atm-origin';
fs.mkdirSync(dir, { recursive: true });
const src = fs.readFileSync(path.join(root, 'social-worker/src/live.js'), 'utf8')
  .replace("import SUB from '../../subscribe-worker/src/index.js';\n", 'const SUB = { fetch: async () => new Response("sub") };\n')
  .replace("import { social, wxExpireSweep, generateGoingStats, runGoingNotices } from './social.js';\n", 'const social = async (req, env, url, json) => json({ reached: url.pathname });\nconst wxExpireSweep = async () => ({});\nconst generateGoingStats = async () => ({});\nconst runGoingNotices = async () => ({});\n')
  .replace("import { unsubscribe as unsub2 } from './unsub.js';\n", 'const unsub2 = async () => new Response("unsub");\n');
if (/from ['"]/.test(src)) throw new Error('live.js import stub failed');
fs.writeFileSync(path.join(dir, 'live.js'), src);
const { default: worker } = await import(pathToFileURL(path.join(dir, 'live.js')).href);

const fail = [];
const check = (name, ok) => { if (!ok) fail.push(name); };

async function post(pathname, origin, method = 'POST') {
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
  if (origin !== undefined) headers.Origin = origin;
  const res = await worker.fetch(new Request('https://api.tangoweekend.org' + pathname, { method, headers, body: method === 'POST' ? 'e=a&t=b&confirm=1' : undefined }), {}, {});
  const text = await res.text();
  let body = null; try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body, allow: res.headers.get('Access-Control-Allow-Origin') };
}

const api = 'https://api.tangoweekend.org';
const evil = 'https://evil.example';
const trusted = ['https://tangoweekend.org', 'https://www.tangoweekend.org', 'https://preview-abc.my1-7p3.pages.dev', api];

for (const origin of [api, 'null', evil, undefined]) {
  const r = await post('/social/confirm', origin);
  check('confirm passes ' + (origin === undefined ? 'missing' : origin), r.status === 200 && r.body.reached === '/social/confirm' && r.body.error !== 'forbidden_origin');
}
const confirmQuery = await post('/social/confirm?e=a@b.c&t=ab&next=https%3A%2F%2Ftangoweekend.org%2Fzh%2Fasia%2F', evil);
check('confirm with query still passes', confirmQuery.status === 200 && confirmQuery.body.reached === '/social/confirm');
check('confirm from api reflects that origin', (await post('/social/confirm', api)).allow === api);
check('confirm from evil does not reflect it', (await post('/social/confirm', evil)).allow === 'https://tangoweekend.org');

for (const path of ['/social/signup', '/social/like', '/social/comment', '/social/verify', '/social/confirmation', '/social/going', '/social/profile']) {
  const r = await post(path, evil);
  check(path + ' evil is forbidden', r.status === 403 && r.body.error === 'forbidden_origin' && r.body.reached === undefined);
}
check('like Origin null is forbidden', (await post('/social/like', 'null')).status === 403 && (await post('/social/like', 'null')).body.error === 'forbidden_origin');
check('like http site is forbidden', (await post('/social/like', 'http://tangoweekend.org')).body.error === 'forbidden_origin');
check('like lookalike host is forbidden', (await post('/social/like', 'https://tangoweekend.org.evil.com')).body.error === 'forbidden_origin');
check('like pages.dev suffix trick is forbidden', (await post('/social/like', 'https://x.my1-7p3.pages.dev.evil.com')).body.error === 'forbidden_origin');
check('like api lookalike is forbidden', (await post('/social/like', 'https://api.tangoweekend.org.evil.com')).body.error === 'forbidden_origin');

for (const origin of trusted) {
  const r = await post('/social/like', origin);
  check('like allowed ' + origin, r.status === 200 && r.body.reached === '/social/like' && r.allow === origin);
}
check('like with no Origin still reaches the handler', (await post('/social/like', undefined)).body.reached === '/social/like');
check('admin POST stays exempt', (await post('/social/admin/wx-verify', evil)).body.reached === '/social/admin/wx-verify');
const opt = await post('/social/like', evil, 'OPTIONS');
check('OPTIONS is not the origin gate', opt.status === 204);
const getConfirm = await post('/social/confirm', evil, 'GET');
check('GET confirm is not the origin gate', getConfirm.status === 200 && getConfirm.body.reached === '/social/confirm');
for (const origin of [api, 'null', evil, undefined]) {
  const r = await post('/social/going/confirm', origin);
  check('going confirm passes ' + (origin === undefined ? 'missing' : origin), r.status === 200 && r.body.reached === '/social/going/confirm' && r.body.error !== 'forbidden_origin');
  const u = await post('/social/going/unsub', origin);
  check('going unsub passes ' + (origin === undefined ? 'missing' : origin), u.status === 200 && u.body.reached === '/social/going/unsub' && u.body.error !== 'forbidden_origin');
}

if (fail.length) { console.error('FAIL', fail.join(', ')); process.exit(1); }
console.log('origin gate tests ok');

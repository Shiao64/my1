// Letters from me@tangoweekend.org: POST /social/admin/letter (2026-11-26). No network.
import { letterAdmin, letterAuth, letterInput } from '../src/letter.js';
import { readFileSync } from 'node:fs';
const fail = []; const check = (n, ok) => { if (!ok) fail.push(n); };

const json = (d, s = 200) => ({ status: s, body: d });
const req = tok => ({ headers: { get: k => (k === 'Authorization' && tok ? 'Bearer ' + tok : null) } });
const TOK = 'L'.repeat(32), ADM = 'A'.repeat(32);
const mk = (extra = {}) => { const sent = []; return { sent, env: { LETTER_TOKEN: TOK, ADMIN_TOKEN: ADM, SUB_MAIL: { send: async m => { sent.push(m); } }, ...extra } }; };
const good = { to: 'Organizer@Example.com', subject: 'Hello', text: 'Hi there' };

// auth
{ const { env } = mk();
  check('no token is 401', (await letterAdmin(req(''), env, good, json)).status === 401);
  check('wrong token is 401', (await letterAdmin(req('x'.repeat(32)), env, good, json)).status === 401);
  check('short token is refused even if equal', !letterAuth(req('short'), { LETTER_TOKEN: 'short' }));
  check('letter token works', letterAuth(req(TOK), env));
  check('admin token works', letterAuth(req(ADM), env));
  check('no secrets set: refused', !letterAuth(req(TOK), {})); }

// sending
{ const { env, sent } = mk();
  const r = await letterAdmin(req(TOK), env, { ...good, html: '<p>Hi</p>', cc: ['a@b.co', 'organizer@example.com'] }, json);
  check('ok', r.status === 200 && r.body.ok === true && r.body.from === 'me@tangoweekend.org' && r.body.to === 'organizer@example.com');
  const m = sent[0] || {};
  check('from me@ with a name', m.from && m.from.email === 'me@tangoweekend.org' && m.from.name === 'Asia Tango Map');
  check('reply-to defaults to me@', m.replyTo === 'me@tangoweekend.org');
  check('to lower-cased, one recipient', m.to === 'organizer@example.com');
  check('cc kept, duplicate of to dropped', JSON.stringify(m.cc) === '["a@b.co"]');
  check('html passed through', m.html === '<p>Hi</p>' && m.text === 'Hi there' && m.subject === 'Hello');
  check('one send only', sent.length === 1); }
{ const { env, sent } = mk({ LETTER_FROM: 'other@tangoweekend.org' });
  await letterAdmin(req(TOK), env, { ...good, from_name: 'Shiao Chang · Asia Tango Map', reply_to: 'x@y.org' }, json);
  check('LETTER_FROM, from_name and reply_to honoured', sent[0].from.email === 'other@tangoweekend.org' && sent[0].from.name === 'Shiao Chang · Asia Tango Map' && sent[0].replyTo === 'x@y.org'); }

// input checks
{ const { env, sent } = mk();
  const bad = async (b, err) => { const r = await letterAdmin(req(TOK), env, b, json); return r.status === 400 && r.body.error === err; };
  check('bad to', await bad({ ...good, to: 'nobody' }, 'bad_to'));
  check('two recipients refused', await bad({ ...good, to: 'a@b.co,c@d.co' }, 'bad_to'));
  check('header injection in to refused', await bad({ ...good, to: 'a@b.co\r\nBcc: x@y.z' }, 'bad_to'));
  check('no subject', await bad({ ...good, subject: '  ' }, 'no_subject'));
  check('no text', await bad({ ...good, text: '' }, 'no_text'));
  check('bad cc', await bad({ ...good, cc: ['nope'] }, 'bad_cc'));
  check('too many cc', await bad({ ...good, cc: ['a@a.co', 'b@a.co', 'c@a.co', 'd@a.co', 'e@a.co', 'f@a.co'] }, 'too_many_cc'));
  check('nothing sent on bad input', sent.length === 0);
  check('subject newlines flattened', letterInput({ ...good, subject: 'A\r\nB' }, {}).subject === 'A B'); }

// off switch, missing binding, send failure, copies
{ const { env, sent } = mk({ LETTER_SEND: 'off' });
  check('LETTER_SEND=off is 503 and sends nothing', (await letterAdmin(req(TOK), env, good, json)).status === 503 && sent.length === 0); }
{ const r = await letterAdmin(req(TOK), { LETTER_TOKEN: TOK }, good, json);
  check('no binding is 500', r.status === 500); }
{ const env = { LETTER_TOKEN: TOK, SUB_MAIL: { send: async () => { throw new Error('sender not allowed'); } } };
  const r = await letterAdmin(req(TOK), env, good, json);
  check('send failure is 502 with the reason', r.status === 502 && /sender not allowed/.test(r.body.detail)); }
{ const { env, sent } = mk({ LETTER_COPY: 'copy@x.org, organizer@example.com, bad' });
  const r = await letterAdmin(req(TOK), env, good, json);
  check('one copy, not to the recipient again', r.body.copies === 1 && sent.length === 2 && sent[1].to === 'copy@x.org' && sent[1].subject === '[副本] Hello' && sent[1].text.startsWith('（副本）这封信寄给 organizer@example.com')); }

// the binding allows the sender
const toml = readFileSync(new URL('../../subscribe-worker/wrangler.toml', import.meta.url), 'utf8');
check('wrangler: SUB_MAIL allows me@ and still subscribe@', /allowed_sender_addresses\s*=\s*\[[^\]]*"subscribe@tangoweekend\.org"[^\]]*"me@tangoweekend\.org"/.test(toml));
// the route is wired
const soc = readFileSync(new URL('../src/social.js', import.meta.url), 'utf8');
check('route /admin/letter wired before the ADMIN_TOKEN-only block', soc.indexOf("p === '/admin/letter'") > 0 && soc.indexOf("p === '/admin/letter'") < soc.indexOf("if (p.startsWith('/admin/') )"));

if (fail.length) { console.log('FAIL', fail); process.exit(1); }
console.log('ok letter');

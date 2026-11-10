// Organizer digests. Log mail only. No network. Run: node social-worker/test/going-digest.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const dir = '/tmp/atm-going-digest';
fs.mkdirSync(dir, { recursive: true });
fs.copyFileSync(path.join(root, 'social-worker/src/unsub.js'), path.join(dir, 'unsub.js'));
fs.copyFileSync(path.join(root, 'social-worker/src/going.js'), path.join(dir, 'going.js'));
const { runGoingDigests, digestSchedule, weekSlot, regularWindow, startClock } = await import(pathToFileURL(path.join(dir, 'going.js')).href);

const fail = [];
const check = (name, ok) => { if (!ok) fail.push(name); };
const monday9 = '2026-11-09T01:00:00.000Z';
const sched = digestSchedule({});
const slot = weekSlot(Date.parse(monday9), sched);
check('pending default is Monday 14:00 and not approved', sched.pendingReview === true && sched.approved === false && sched.weekday === 1 && sched.hour === 14 && sched.minute === 0 && sched.tz === 'Asia/Shanghai' && weekSlot(Date.parse('2026-11-09T06:00:00.000Z'), sched).key === '2026-11-09');
const wed = digestSchedule({ GOING_DIGEST_WEEKDAY: '3', GOING_DIGEST_HOUR: '15', GOING_DIGEST_MINUTE: '0' });
check('weekday and hour are configurable', wed.pendingReview === false && wed.approved === false && weekSlot(Date.parse('2026-11-11T07:00:00.000Z'), wed).key === '2026-11-11');
check('sunday uses the previous Monday', weekSlot(Date.parse('2026-11-08T16:00:00.000Z'), sched).key === '2026-11-02');
check('start clock reads the first time and does not invent one', startClock('20:30–24:30').h === 20 && startClock('21:00–02:00').min === 0 && startClock('sometime') === null && startClock('') === null);
const win = regularWindow('2026-11-13', '20:30–24:30');
check('regular window is three hours before the stated start', win && win.sendMs === Date.parse('2026-11-13T09:30:00.000Z') && win.startMs === Date.parse('2026-11-13T12:30:00.000Z'));
check('missing or late-looking time is not guessed', regularWindow('2026-11-13', '') === null && regularWindow('2026-11-13', '8:30pm') === null);

const db = new DatabaseSync(':memory:');
db.exec(fs.readFileSync(path.join(root, 'social-worker/migrations/0009_going.sql'), 'utf8'));
db.exec(fs.readFileSync(path.join(root, 'social-worker/migrations/0012_going_occ.sql'), 'utf8'));
db.exec(fs.readFileSync(path.join(root, 'social-worker/migrations/0011_going_digests.sql'), 'utf8'));
db.exec(`CREATE TABLE users(id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, lang TEXT NOT NULL DEFAULT 'en',
  verified_at TEXT, city TEXT, role TEXT, created_at TEXT NOT NULL);`);
function D1(database) {
  return { prepare(sql) { const st = database.prepare(sql); let args = []; return {
    bind(...a) { args = a; return this; },
    first(col) { const r = st.get(...args); if (!r) return null; return col ? r[col] ?? null : r; },
    all() { return { results: st.all(...args) }; },
    run() { const r = st.run(...args); return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }; }
  }; } };
}
const CARDS = {
  F1: { email: 'fest@example.com', kind: 'event', start: '2026-09-01', end: '2026-09-03', title: 'Festival', title_zh: '节日' },
  W1: { email: 'org@example.com', kind: 'weekly', weekday: 5, time: '20:30–24:30', title: 'Friday Milonga', title_zh: '周五舞会' },
  W2: { email: 'org2@example.com', kind: 'weekly', weekday: 5, time: '20:30–24:30', title: 'Late Friday', title_zh: '晚到周五' },
  W0: { email: 'org0@example.com', kind: 'weekly', weekday: 5, time: '', title: 'No time' },
  CX: { email: 'orgx@example.com', kind: 'weekly', weekday: 5, time: '20:00–22:00', title: 'Cancelled night', temp_notices: [{ status: 'cancelled', date: '2026-11-13' }] },
  MV: { email: 'orgm@example.com', kind: 'weekly', weekday: 5, time: '20:00–22:00', title: 'Moved night', temp_notices: [{ status: 'changed', date: '2026-11-13', text: '改期' }] }
};
const env = { SDB: D1(db), GOING_CARDS: CARDS, GOING_NOW: monday9, GOING_DIGEST_SEND: 'on' };
const mails = [];
const orig = console.log;
console.log = (...a) => { const s = a.map(x => typeof x === 'string' ? x : String(x)).join(' '); if (s.startsWith('[mail:log]')) mails.push(s); else orig(...a); };
const he = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const kit = {
  EMAIL_RE: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, ID_RE: /^[A-Za-z0-9_-]{1,64}$/, he, now: () => new Date().toISOString(),
  clean: (s, n) => String(s || '').trim().slice(0, n),
  deliver: async (env, to, subject, text, html, headers, opt) => {
    opt = opt || {};
    console.log(`[mail:log] from=${opt.fromName || ''} to=${to}${opt.cc ? ' cc=' + opt.cc : ''}${opt.replyTo ? ' reply-to=' + opt.replyTo : ''} subject=${subject}\n${text}`);
  }
};
function user(email, name, city, role, verified) {
  db.prepare('INSERT INTO users(email,name,city,role,verified_at,created_at) VALUES(?,?,?,?,?,?)').run(email, name, city, role, verified ? '2026-11-01T00:00:00.000Z' : null, '2026-11-01T00:00:00.000Z');
}
function intent(email, card, intentName, date, transport, notify, status, mail, at) {
  db.prepare(`INSERT INTO going_intents(email,card_id,intent,occurrence_date,transport,notify,status,mail_status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)`)
    .run(email, card, intentName, date, transport, notify, status, mail, at, at);
}
user('ana@example.com', 'Ana', 'Seoul', 'leader', true);
user('bea@example.com', 'Bea', 'Osaka', 'follower', true);
user('cy@example.com', 'Cy', 'Busan', 'both', false);
user('old@example.com', 'Old', 'Seoul', 'leader', true);
user('nix@example.com', 'Nix', 'Seoul', 'leader', true);
intent('ana@example.com', 'W1', 'going', '2026-11-13', 1, 1, 'active', 'queued', '2026-11-08T02:00:00.000Z');

const off = await runGoingDigests({ ...env, GOING_DIGEST_SEND: '' }, kit);
check('flag off sends nothing and writes nothing', off.enabled === false && off.approved === false && off.pendingReview === true && mails.length === 0 && db.prepare('SELECT COUNT(*) n FROM going_digests').get().n === 0);

env.GOING_NOW = '2026-11-13T09:00:00.000Z';
const early = await runGoingDigests(env, kit);
check('regular is not sent before the three-hour mark', early.sent === 0 && mails.length === 0 && db.prepare("SELECT mail_status s FROM going_intents WHERE email=? AND card_id='W1'").get('ana@example.com').s === 'queued');

env.GOING_NOW = '2026-11-13T09:30:00.000Z';
const regular = await runGoingDigests(env, kit);
const org = mails.filter(m => m.includes('to=org@example.com'));
check('regular occurrence sends once at three hours before', regular.sent >= 1 && org.length === 1 && org[0].includes('cc=selecttango@gmail.com') && org[0].includes('2026-11-13') && org[0].includes('Directions') && org[0].includes('reply-to=ana@example.com') && org[0].includes('Seoul') && org[0].includes('leader') && org[0].includes('selecttango@gmail.com'));
const regularAgain = await runGoingDigests(env, kit);
check('regular occurrence does not repeat', regularAgain.sent === 0 && mails.filter(m => m.includes('to=org@example.com')).length === 1);
user('dee@example.com', 'Dee', 'Kyoto', 'leader', true);
intent('dee@example.com', 'W1', 'interested', '2026-11-13', 0, 1, 'active', 'queued', '2026-11-13T10:00:00.000Z');
env.GOING_NOW = '2026-11-13T11:30:00.000Z';
const late = await runGoingDigests(env, kit);
check('submitted inside the last three hours does not send another mail', late.sent === 0 && mails.filter(m => m.includes('to=org@example.com')).length === 1 && db.prepare("SELECT mail_status s FROM going_intents WHERE email=? AND card_id='W1'").get('dee@example.com').s === 'queued');

intent('ana@example.com', 'F1', 'going', null, 0, 0, 'active', 'queued', '2026-11-08T02:00:00.000Z');
intent('bea@example.com', 'F1', 'interested', null, 0, 1, 'active', 'queued', '2026-11-08T03:00:00.000Z');
intent('cy@example.com', 'F1', 'going', null, 0, 1, 'active', 'queued', '2026-11-08T03:00:00.000Z');
intent('old@example.com', 'F1', 'going', null, 0, 1, 'active', 'sent', '2026-10-01T00:00:00.000Z');
intent('nix@example.com', 'F1', 'going', null, 0, 1, 'cancelled', 'queued', '2026-11-08T04:00:00.000Z');
env.GOING_NOW = '2026-11-09T06:00:00.000Z';
const featured = await runGoingDigests(env, kit);
const fest = mails.filter(m => m.includes('to=fest@example.com'));
check('featured week sends one summary', featured.sent === 1 && fest.length === 1 && fest[0].includes('cc=selecttango@gmail.com') && fest[0].includes('from=探戈助理') && fest[0].includes('subject=Intent summary:'));
check('summary lists new people with city and role, not the unverified row', fest[0].includes('Ana <ana@example.com>') && fest[0].includes('Bea <bea@example.com>') && fest[0].includes('Going / 要参加') && fest[0].includes('Interested / 感兴趣') && fest[0].includes('Seoul') && fest[0].includes('leader') && fest[0].includes('Osaka') && !fest[0].includes('Cy') && !fest[0].includes('Old') && !fest[0].includes('Nix') && fest[0].includes('要删除资料'));
check('notify off is still forwarded', fest[0].includes('ana@example.com') && db.prepare("SELECT notify n FROM going_intents WHERE email=? AND card_id='F1' AND status='active'").get('ana@example.com').n === 0);
check('sent rows are marked once', db.prepare("SELECT mail_status s, mail_fp f FROM going_intents WHERE email=? AND card_id='F1' AND status='active'").get('ana@example.com').s === 'sent');
const againF = await runGoingDigests(env, kit);
check('same week does not send twice', againF.sent === 0 && mails.filter(m => m.includes('to=fest@example.com')).length === 1);
db.prepare("UPDATE going_intents SET intent='going', mail_status='queued', updated_at='2026-11-09T07:00:00.000Z' WHERE email=? AND card_id='F1'").run('bea@example.com');
const laterSameWeek = await runGoingDigests({ ...env, GOING_NOW: '2026-11-11T02:00:00.000Z' }, kit);
check('a change after the weekly slot waits', laterSameWeek.sent === 0 && mails.filter(m => m.includes('to=fest@example.com')).length === 1 && db.prepare("SELECT mail_status s FROM going_intents WHERE email=? AND card_id='F1'").get('bea@example.com').s === 'queued');
const nextWeek = await runGoingDigests({ ...env, GOING_NOW: '2026-11-16T06:00:00.000Z' }, kit);
const fest2 = mails.filter(m => m.includes('to=fest@example.com'));
check('next week sends only the new change', nextWeek.sent === 1 && fest2.length === 2 && fest2[1].includes('Bea <bea@example.com>') && !fest2[1].includes('Ana <ana@example.com>'));

intent('ana@example.com', 'W0', 'going', '2026-11-20', 0, 1, 'active', 'queued', '2026-11-08T02:00:00.000Z');
intent('ana@example.com', 'CX', 'going', '2026-11-13', 0, 1, 'active', 'queued', '2026-11-08T02:00:00.000Z');
intent('ana@example.com', 'MV', 'going', '2026-11-13', 0, 1, 'active', 'queued', '2026-11-08T02:00:00.000Z');
user('past@example.com', 'Past', 'Seoul', 'leader', true);
intent('past@example.com', 'W1', 'going', '2026-11-06', 0, 1, 'active', 'queued', '2026-10-01T00:00:00.000Z');
const beforeBoundary = mails.length;
env.GOING_NOW = '2026-11-13T12:00:00.000Z';
const boundary = await runGoingDigests(env, kit);
check('missing time is held and not invented', boundary.held >= 1 && db.prepare("SELECT status s, reason r FROM going_digests WHERE digest_key=?").get('regular:W0:2026-11-20').r === 'missing_time' && !mails.slice(beforeBoundary).some(m => m.includes('to=org0@example.com')));
check('cancelled occurrence is not mailed', db.prepare("SELECT status s, reason r FROM going_digests WHERE digest_key=?").get('regular:CX:2026-11-13').r === 'cancelled' && !mails.slice(beforeBoundary).some(m => m.includes('to=orgx@example.com')));
check('rescheduled occurrence is held', db.prepare("SELECT status s, reason r FROM going_digests WHERE digest_key=?").get('regular:MV:2026-11-13').r === 'rescheduled' && !mails.slice(beforeBoundary).some(m => m.includes('to=orgm@example.com')));
check('past occurrence is not backfilled', db.prepare("SELECT reason r FROM going_digests WHERE digest_key=?").get('regular:W1:2026-11-06').r === 'past_start' && mails.filter(m => m.includes('2026-11-06')).length === 0);

const claims = [];
env.GOING_DIGEST_AFTER_CLAIM = async key => { claims.push(key); await new Promise(r => setTimeout(r, 20)); };
user('eve@example.com', 'Eve', 'Taipei', 'follower', true);
intent('eve@example.com', 'W1', 'going', '2026-11-20', 0, 1, 'active', 'queued', '2026-11-08T02:00:00.000Z');
env.GOING_NOW = '2026-11-20T09:30:00.000Z';
CARDS.W1.time = '20:30–24:30';
const pair = await Promise.all([runGoingDigests(env, kit), runGoingDigests(env, kit)]);
const eveMails = mails.filter(m => m.includes('to=org@example.com') && m.includes('Eve <eve@example.com>'));
check('concurrent runs send one mail', eveMails.length === 1 && claims.filter(k => k === 'regular:W1:2026-11-20').length === 1 && pair.filter(r => r.sent > 0).length === 1);
delete env.GOING_DIGEST_AFTER_CLAIM;

let boom = true;
const flaky = { ...kit, deliver: async (...a) => { if (boom) { boom = false; throw new Error('temporary'); } return kit.deliver(...a); } };
user('fay@example.com', 'Fay', 'Manila', 'leader', true);
intent('fay@example.com', 'W1', 'interested', '2026-11-27', 0, 1, 'active', 'queued', '2026-11-08T02:00:00.000Z');
env.GOING_NOW = '2026-11-27T09:30:00.000Z';
const failed = await runGoingDigests(env, flaky);
check('a failed send stays retryable and does not mark sent', failed.failed >= 1 && db.prepare("SELECT status s FROM going_digests WHERE digest_key=?").get('regular:W1:2026-11-27').s === 'failed' && db.prepare("SELECT mail_status s FROM going_intents WHERE email=? AND card_id='W1' AND occurrence_date='2026-11-27'").get('fay@example.com').s === 'queued');
const beforeRetry = mails.filter(m => m.includes('Fay')).length;
const retried = await runGoingDigests(env, flaky);
check('retry sends once and then stops', retried.sent >= 1 && mails.filter(m => m.includes('Fay')).length === beforeRetry + 1 && db.prepare("SELECT mail_status s FROM going_intents WHERE email=? AND card_id='W1' AND occurrence_date='2026-11-27'").get('fay@example.com').s === 'sent');
const retriedAgain = await runGoingDigests(env, flaky);
check('retry does not send a third copy', retriedAgain.sent === 0 && mails.filter(m => m.includes('Fay')).length === beforeRetry + 1);

db.prepare("UPDATE going_digests SET status='sending', created_at='2026-11-20T00:00:00.000Z' WHERE digest_key=?").run('regular:W1:2026-11-20');
db.prepare("UPDATE going_intents SET mail_status='queued' WHERE email=? AND card_id='W1' AND occurrence_date='2026-11-20'").run('eve@example.com');
env.GOING_NOW = '2026-11-20T09:40:00.000Z';
const beforeStale = mails.filter(m => m.includes('Eve')).length;
const reclaimed = await runGoingDigests(env, kit);
check('a stale claim can be retried once', reclaimed.sent >= 1 && mails.filter(m => m.includes('Eve')).length === beforeStale + 1);

user('gia@example.com', 'Gia', 'Hanoi', 'follower', true);
user('hoa@example.com', 'Hoa', 'Hanoi', 'leader', true);
intent('gia@example.com', 'W2', 'going', '2026-12-04', 0, 0, 'active', 'queued', '2026-12-04T11:00:00.000Z');
intent('hoa@example.com', 'W2', 'interested', '2026-12-04', 0, 1, 'active', 'queued', '2026-12-04T11:10:00.000Z');
env.GOING_NOW = '2026-12-04T11:30:00.000Z';
const inside = await runGoingDigests(env, kit);
const lateFirst = mails.filter(m => m.includes('to=org2@example.com'));
check('a first summary inside the last three hours is still one mail', lateFirst.length === 1 && lateFirst[0].includes('Gia <gia@example.com>') && lateFirst[0].includes('Hoa <hoa@example.com>') && lateFirst[0].includes('Hanoi'));

if (fail.length) { console.error('FAIL', fail.join(' | ')); process.exit(1); }
console.log('going digest ok', { mails: mails.length });

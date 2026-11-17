// Monthly subscriber roster mail (2026-11-17, Shiao).
// Once per Beijing calendar month, mail the subscriber lists as CSV text to the
// owner (ROSTER_TO, default shiao.li.chang@gmail.com). A monthly Claude task
// then copies it into a Google Sheet in that account's Drive.
// Runs from the 10-minute cron: the first run of a new month sends it. A failed
// send is retried at most every 6 hours. The log table is created here, so no
// migration is needed. Nothing is sent to anyone but ROSTER_TO.

const DEFAULT_TO = 'shiao.li.chang@gmail.com';
const RETRY_MS = 6 * 3600e3;

export function beijingMonth(d) {
  const t = new Date(d.getTime() + 8 * 3600e3);
  return t.toISOString().slice(0, 7);
}

export function csvCell(v) {
  if (v === null || v === undefined) return '';
  let s = String(v);
  // Keep spreadsheet apps from treating a cell as a formula.
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  if (/[",\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export function toCsv(cols, rows) {
  const out = [cols.join(',')];
  for (const r of rows) out.push(cols.map(c => csvCell(r[c])).join(','));
  return out.join('\n');
}

const SUB_COLS = ['id', 'created_at', 'name', 'email', 'wechat', 'wx_status', 'cities', 'types', 'lang', 'mail_status', 'unsubscribed'];
const USER_COLS = ['id', 'created_at', 'name', 'email', 'contact_email', 'city', 'role', 'lang', 'verified_at', 'unsubscribed'];

async function all(db, sql) {
  try { const r = await db.prepare(sql).all(); return (r && r.results) || []; }
  catch (e) { console.log('roster query', String(e && e.message || e).slice(0, 160)); return null; }
}

export async function buildRoster(env, now) {
  const db = env.SDB || env.DB;
  const unsubRows = (await all(db, 'SELECT email FROM mail_unsub')) || [];
  const unsub = new Set(unsubRows.map(r => String(r.email || '').toLowerCase()));
  const mark = r => Object.assign({}, r, { unsubscribed: r.email && unsub.has(String(r.email).toLowerCase()) ? 'yes' : '' });
  const subs = await all(db, 'SELECT id,created_at,name,email,wechat,wx_status,cities,types,lang,mail_status FROM subs WHERE is_test=0 ORDER BY id');
  const users = await all(db, 'SELECT id,created_at,name,email,contact_email,city,role,lang,verified_at FROM users ORDER BY id');
  const month = beijingMonth(now);
  const stamp = new Date(now.getTime() + 8 * 3600e3).toISOString().slice(0, 16).replace('T', ' ');
  const s = (subs || []).map(mark), u = (users || []).map(mark);
  const subject = `ATM 订阅者名单 ${month}`;
  const text = [
    `亚洲探戈地图（ATM）订阅者名单，${month}，北京时间 ${stamp} 产生。`,
    `网站订阅（subs）${s.length} 笔${subs ? '' : '（读取失败）'}；帐号（users）${u.length} 个${users ? '' : '（读取失败）'}。`,
    'unsubscribed=yes 表示已退订。名单只寄给你，请不要转寄。',
    '',
    '=== subs.csv ===',
    toCsv(SUB_COLS, s),
    '=== end subs.csv ===',
    '',
    '=== users.csv ===',
    toCsv(USER_COLS, u),
    '=== end users.csv ===',
    ''
  ].join('\n');
  return { month, subject, text, subs: s.length, users: u.length };
}

export async function monthlyRoster(env, now = new Date()) {
  const db = env.SDB || env.DB;
  if (!db || !env.SUB_MAIL || typeof env.SUB_MAIL.send !== 'function') return 'no_binding';
  if (env.ROSTER_SEND === 'off') return 'off';
  await db.prepare('CREATE TABLE IF NOT EXISTS roster_log(month TEXT PRIMARY KEY, status TEXT NOT NULL, at INTEGER NOT NULL, note TEXT)').run();
  const month = beijingMonth(now);
  const row = await db.prepare('SELECT status, at FROM roster_log WHERE month=?').bind(month).first();
  if (row && row.status === 'sent') return 'already';
  if (row && now.getTime() - Number(row.at || 0) < RETRY_MS) return 'wait';
  await db.prepare('INSERT INTO roster_log(month,status,at,note) VALUES(?,?,?,NULL) ON CONFLICT(month) DO UPDATE SET status=excluded.status, at=excluded.at').bind(month, 'sending', now.getTime()).run();
  try {
    const r = await buildRoster(env, now);
    const to = String(env.ROSTER_TO || DEFAULT_TO).trim();
    await env.SUB_MAIL.send({ from: { email: env.SENDER || 'subscribe@tangoweekend.org', name: 'Asia Tango Map' }, to, subject: r.subject, text: r.text });
    await db.prepare('UPDATE roster_log SET status=?, at=?, note=? WHERE month=?').bind('sent', now.getTime(), `subs=${r.subs} users=${r.users}`, month).run();
    return 'sent';
  } catch (e) {
    const msg = String(e && e.message || e).slice(0, 160);
    await db.prepare('UPDATE roster_log SET status=?, at=?, note=? WHERE month=?').bind('failed', now.getTime(), msg, month).run();
    console.log('roster', msg);
    return 'failed';
  }
}

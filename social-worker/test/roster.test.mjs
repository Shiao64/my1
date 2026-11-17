// Monthly roster mail: CSV, once per month, retry spacing. No network.
import { beijingMonth, csvCell, toCsv, monthlyRoster } from '../src/roster.js';
const fail = []; const check = (n, ok) => { if (!ok) fail.push(n); };

check('beijing month rolls at 16:00 UTC', beijingMonth(new Date('2026-11-30T16:30:00Z')) === '2026-12' && beijingMonth(new Date('2026-11-30T15:30:00Z')) === '2026-11');
check('csv quotes commas and quotes', csvCell('a,"b"') === '"a,""b"""');
check('csv defuses formulas', csvCell('=HYPERLINK(1)') === "'=HYPERLINK(1)" && csvCell('+86 123') === "'+86 123");
check('csv header and rows', toCsv(['a', 'b'], [{ a: 1, b: null }]) === 'a,b\n1,');

// Fake D1 with just enough SQL.
function fakeDb() {
  const log = new Map();
  const data = {
    subs: [{ id: 1, created_at: '2026-11-01', name: 'A', email: 'a@x.com', wechat: '', wx_status: null, cities: '北京', types: 'milonga', lang: 'zh', mail_status: 'sent' }],
    users: [{ id: 7, created_at: '2026-11-02', name: 'B', email: 'b@x.com', contact_email: '', city: '上海', role: 'leader', lang: 'zh', verified_at: '2026-11-02' }],
    unsub: [{ email: 'B@x.com' }]
  };
  return {
    log,
    prepare(sql) {
      let args = [];
      const st = {
        bind(...a) { args = a; return st; },
        async run() {
          if (sql.startsWith('INSERT INTO roster_log')) log.set(args[0], { status: args[1], at: args[2] });
          else if (sql.startsWith('UPDATE roster_log')) log.set(args[3], { status: args[0], at: args[1], note: args[2] });
          return {};
        },
        async first() { return sql.startsWith('SELECT status') ? (log.get(args[0]) || null) : null; },
        async all() {
          if (sql.includes('FROM mail_unsub')) return { results: data.unsub };
          if (sql.includes('FROM subs')) return { results: data.subs };
          if (sql.includes('FROM users')) return { results: data.users };
          return { results: [] };
        }
      };
      return st;
    }
  };
}
const sent = [];
const db = fakeDb();
const env = { SDB: db, SENDER: 's@x', SUB_MAIL: { send: async m => { sent.push(m); } } };
const t0 = new Date('2026-11-17T13:00:00Z');
check('first run sends', await monthlyRoster(env, t0) === 'sent');
check('to the owner by default', sent[0].to === 'shiao.li.chang@gmail.com' && sent[0].subject === 'ATM 订阅者名单 2026-11');
check('body has both csv blocks', sent[0].text.includes('=== subs.csv ===\nid,created_at,name,email') && sent[0].text.includes('a@x.com') && sent[0].text.includes('=== users.csv ==='));
check('unsubscribed marked', /b@x\.com.*,yes$/m.test(sent[0].text));
check('same month does not resend', await monthlyRoster(env, new Date('2026-11-20T00:00:00Z')) === 'already' && sent.length === 1);
check('next month sends again', await monthlyRoster(env, new Date('2026-11-30T16:10:00Z')) === 'sent' && sent.length === 2);
// Failure then retry spacing.
const db2 = fakeDb(); let n = 0;
const env2 = { SDB: db2, SUB_MAIL: { send: async () => { n++; throw new Error('boom'); } } };
check('failure recorded', await monthlyRoster(env2, t0) === 'failed');
check('no retry within 6 hours', await monthlyRoster(env2, new Date(t0.getTime() + 3600e3)) === 'wait' && n === 1);
check('retry after 6 hours', await monthlyRoster(env2, new Date(t0.getTime() + 7 * 3600e3)) === 'failed' && n === 2);
check('off switch', await monthlyRoster({ ...env, ROSTER_SEND: 'off' }, t0) === 'off');

if (fail.length) { console.log('FAIL', fail); process.exit(1); }
console.log('ok roster');

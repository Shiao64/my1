// Static checks for the deploy file and the merged card behavior. No network, no D1.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const fail = [];
const check = (n, ok) => { if (!ok) fail.push(n); };
const toml = read('subscribe-worker/wrangler.toml');
const en = read('asia/index.html');
const zh = read('zh/asia/index.html');
const data = read('asia/atm-data.js');
const map = read('asia/asia-map.js');
const events = JSON.parse(read('asia/events.json'));
const core = JSON.parse(read('asia/events-core.json'));
const redirects = read('_redirects');
const byId = (list, id) => list.find(e => e.id === id);

check('keep dashboard vars', /keep_vars\s*=\s*true/.test(toml));
check('worker entry is the social live script', /main\s*=\s*"\.\.\/social-worker\/src\/live\.js"/.test(toml));
check('both live crons', toml.includes('"*/10 * * * *"') && toml.includes('"17 3 * * *"'));
check('sample cron is not registered', !toml.includes('30 16 * * *'));
check('going flags are not turned on', !/GOING_NOTICE_SEND\s*=\s*"on"/.test(toml) && !/GOING_STATS\s*=\s*"on"/.test(toml) && !/GOING_DIGEST_SEND\s*=\s*"on"/.test(toml));
check('digest is not on a live cron', !read('social-worker/src/live.js').includes('runGoingDigests'));
check('card mail source is the public data host', read('social-worker/src/going.js').includes("https://data.tangoweekend.org") && !/GOING_ORG_DIR\s*=/.test(toml));
check('DB and SDB share the live database', (toml.match(/1b462639-75a1-4dcf-9b15-eab807e4b295/g) || []).length >= 2 && /binding\s*=\s*"SDB"/.test(toml) && /binding\s*=\s*"DB"/.test(toml));
check('both mail bindings stay', /name\s*=\s*"EMAIL"/.test(toml) && /name\s*=\s*"SUB_MAIL"/.test(toml));
check('gmail user is not hardcoded over production', !/^GMAIL_USER\s*=/m.test(toml));
check('no secret material in wrangler', !/API_KEY|APP_PASSWORD|BEGIN PRIVATE/i.test(toml));

for (const html of [en, zh]) {
  check('r9 data stays and map is newer than the cached r9', html.includes('atm-data.js?v=r9') && html.includes('asia-map.js?v=r12'));
  check('merged card script is newer than either cb144', html.includes('/asia/cardB.js?v=cb145'));
  check('star script', html.includes('/asia/atm-star.js?v=st24'));
  check('E163 leaves the map', html.includes("cid==='E163'") && html.includes('/event/chengdu-2027-ich-tango-festival/'));
  check('no merge markers', !html.includes('<<<<<<<'));
}
check('missing is not ended', data.includes('Missing is not ended') && map.includes('does not mean the event has ended') && map.includes('这不表示活动已结束'));
check('old competition urls redirect', redirects.includes('/event/chengdu-2027-tangotoworldcup-ich-competition/') && redirects.includes('/event/chengdu-2027-ich-tango-festival/'));

const e162 = byId(events, 'E162');
const e163 = byId(events, 'E163');
const e160 = byId(events, 'E160');
check('E162 is the public Chengdu card', e162 && e162.hidden !== true);
check('E163 is hidden in git', e163 && e163.hidden === true);
check('git JSON has no E164', !byId(events, 'E164') && !byId(core, 'E164'));
check('PR35 Wuhan contact is kept', e160 && e160.organizers && e160.organizers.includes('向前') && e160.contacts && e160.contacts.email === '756416106@qq.com');
check('poster query is preserved', data.includes("raw.indexOf('?')") && data.includes('full: pub(q) + (extra || \'\')'));
check('video account text is in the map and the card', map.includes('wechat_channels') && read('asia/cardB.js').includes('微信视频号'));
const weekly = byId(events, 'bQFvmIuY');
check('weekly bQFvmIuY remains', weekly && weekly.hidden !== true && weekly.kind === 'weekly');
for (const id of ['JHeguuQb', 'XsFs5wm8']) {
  const row = byId(events, id);
  check('wutong card ' + id, row && row.hidden !== true);
}

if (fail.length) { console.error('FAIL', fail.join(' | ')); process.exit(1); }
console.log('deploy compat ok', { events: events.length, core: core.length });

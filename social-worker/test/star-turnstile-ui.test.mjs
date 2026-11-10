// Local mock of the star dialog. Not a real Siteverify and not the live widget.
// Run: node social-worker/test/star-turnstile-ui.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const puppeteer = require(process.env.PUPPETEER_CORE || '/tmp/node_modules/puppeteer-core');

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const star = fs.readFileSync(path.join(root, 'asia/atm-star.js'));
const fail = [];
const check = (n, ok) => { if (!ok) fail.push(n); };
const events = JSON.stringify([
  { id: 'A', kind: 'event', name: 'Demo A', name_zh: '演示甲', contacts: { email: 'a@example.com' } },
  { id: 'B', kind: 'event', name: 'Demo B', name_zh: '演示乙', contacts: { email: 'b@example.com' } },
  { id: 'R', kind: 'weekly', name: "Kai's Milonga", name_zh: "Kai's Milonga", contacts: { email: 'k@example.com' }, weekdays: [] }
]);
function page(lang) {
  const zh = lang !== 'en';
  return `<!doctype html><html lang="${zh ? 'zh-CN' : 'en'}" data-asia-lang="${zh ? 'zh' : 'en'}"><body>
<script>
window.ATM_SOCIAL_API='https://api.example.test';
window.ATM_TS_KEY='0xTESTKEY';
window.__posts=[];
window.__urls=[];
window.__mode='ok';
window.__ts={n:0,widgets:{},resets:[],removed:[],persist:false};
window.turnstile={
  render:function(el,opts){var id='w'+(++window.__ts.n);el.innerHTML='<div class="mock-turnstile">Verify you are human</div>';window.__ts.widgets[id]={el:el,opts:opts,token:''};return id;},
  reset:function(id){var w=window.__ts.widgets[id];if(!w)return;w.token='';var inp=w.el.querySelector('[name="cf-turnstile-response"]');if(inp)inp.value='';window.__ts.resets.push(id);if(window.__ts.persist&&w.opts['error-callback'])w.opts['error-callback']('300010');},
  remove:function(id){window.__ts.removed.push(id);delete window.__ts.widgets[id];},
  getResponse:function(id){var w=window.__ts.widgets[id];return w?w.token:'';}
};
window.__issue=function(token){var el=document.querySelector('.asg-ts');var w=window.__ts.widgets[el.dataset.wid];var inp=el.querySelector('[name="cf-turnstile-response"]');if(!inp){inp=document.createElement('input');inp.name='cf-turnstile-response';el.appendChild(inp);}inp.value=token;w.token=token;w.opts.callback(token);return el.dataset.wid;};
window.__fail=function(code){var el=document.querySelector('.asg-ts');window.__ts.widgets[el.dataset.wid].opts['error-callback'](code);};
window.__expire=function(){var el=document.querySelector('.asg-ts');window.__ts.widgets[el.dataset.wid].opts['expired-callback']();};
window.fetch=function(url,opt){
  var u=String(url);
  var json=function(d,status){return Promise.resolve({ok:!status||status<400,status:status||200,json:async function(){return d;}})};
  if(u.indexOf('events.json')>=0) return json(${events});
  if(u.indexOf('/social/going/config')>=0) return json({sitekey:'0xTESTKEY'});
  if(u.indexOf('/social/going/reach')>=0) return json({reach:{}});
  if(u.indexOf('/social/going/mine')>=0){var extra=null;try{extra=JSON.parse(localStorage.getItem('atm_test_mine')||'null')}catch(e){}return json(extra||{items:[],drafts:[]});}
  if(opt&&String(opt.method||'').toUpperCase()==='POST'){
    var body=JSON.parse(opt.body);
    window.__posts.push(body);
    window.__urls.push(u);
    if(window.__mode==='hold') return new Promise(function(){});
    if(window.__mode==='later') return new Promise(function(resolve, reject){ window.__later={ ok:function(d){ resolve({ok:true,status:200,json:async function(){return d;}}); }, fail:function(){ reject(new Error('late')); } }; });
    if(window.__mode==='net') return Promise.reject(new Error('net'));
    if(window.__mode==='turnstile') return json({error:'turnstile'},403);
    if(window.__mode==='other') return json({error:'lookup_failed'},503);
    if(window.__mode==='saved') return json({ok:true,mail:'queued'});
    if(window.__mode==='mailfail') return json({ok:true,mail:'failed'});
    return json({ok:true,confirm:true});
  }
  return Promise.reject(new Error(u));
};
</script><script src="/atm-star.js"></script>
<main style="font-family:system-ui;padding:16px;color:#08343a"><p>Te Amo Tango Lounge</p><h1>Kai's Milonga</h1></main>
<button class="atm-heart" data-fid="A"><svg viewBox="0 0 24 24"><path/></svg></button>
<button class="atm-heart" data-fid="B"><svg viewBox="0 0 24 24"><path/></svg></button>
<button class="atm-heart" data-fid="R"><svg viewBox="0 0 24 24"><path/></svg></button>
</body></html>`;
}
const server = http.createServer((req, res) => {
  if (req.url.startsWith('/atm-star.js')) { res.setHeader('content-type', 'text/javascript; charset=utf-8'); res.end(star); return; }
  const lang = req.url.includes('en') ? 'en' : 'zh';
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.end(page(lang));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const browser = await puppeteer.launch({ executablePath: '/usr/local/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
async function boot(lang) {
  const p = await browser.newPage();
  await p.goto('http://127.0.0.1:' + port + '/' + (lang || 'zh'), { waitUntil: 'domcontentloaded' });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.ATM_STAR && window._atmStarEvents);
  return p;
}
async function openCard(p, id) {
  await p.evaluate(card => window.ATM_STAR.take(document.querySelector('[data-fid="' + card + '"]')), id);
  await p.waitForFunction(() => { const el = document.querySelector('.asg-ts'); return el && el.dataset.wid; });
  await p.click('[data-intent="going"]');
  await p.evaluate(() => { const el = document.querySelector('#asg-email'); if (el) el.value = 'guest@example.com'; });
}
async function posts(p) { return p.evaluate(() => window.__posts.map(x => x.ts)); }
async function errText(p) { return p.evaluate(() => document.querySelector('#asg-err').textContent); }

const wait = await boot('zh');
await openCard(wait, 'A');
await wait.click('#asg-go');
check('not ready does not post', (await posts(wait)).length === 0 && (await errText(wait)) === '请先完成人机验证，再点确认。');
check('not ready leaves the dialog open and the button idle', await wait.evaluate(() => document.querySelector('#atm-star').hidden === false && document.querySelector('#asg-go').getAttribute('aria-busy') === 'false' && document.querySelector('#asg-go').disabled === false));
check('challenge is above confirm and cancel intent is gone', await wait.evaluate(() => {
  const ts = document.querySelector('.asg-ts');
  const go = document.querySelector('#asg-go');
  return !!(ts && go && (ts.compareDocumentPosition(go) & Node.DOCUMENT_POSITION_FOLLOWING) && document.querySelector('#asg-tslab').textContent === '请先完成人机验证，再点确认。' && !document.querySelector('#asg-cancel'));
}));
await wait.close();

const ready = await boot('zh');
await openCard(ready, 'A');
await ready.evaluate(() => window.__issue('token-ready'));
await ready.click('#asg-go');
await ready.waitForFunction(() => document.querySelector('#asg-ok').textContent.length > 0);
check('callback unlocks one post and keeps the confirm copy', JSON.stringify(await posts(ready)) === '["token-ready"]' && (await ready.evaluate(() => document.querySelector('#asg-ok').textContent)) === '确认邮件已发出，请查收。点开邮件里的确认后，再回到这里点「确认」。');
await ready.close();

const expired = await boot('zh');
await openCard(expired, 'A');
await expired.evaluate(() => { window.__issue('token-old'); window.__expire(); });
await expired.click('#asg-go');
check('expired token is not posted', (await posts(expired)).length === 0 && (await errText(expired)) === '验证已过期，请等它重新完成后再试。');
await expired.close();

const client = await boot('zh');
await openCard(client, 'A');
await client.evaluate(() => {
  window.__ts.persist = true;
  const el = document.querySelector('.asg-ts');
  const inp = document.createElement('input');
  inp.name = 'cf-turnstile-response';
  inp.value = 'stale-before-challenge';
  el.appendChild(inp);
  window.__fail('300010');
});
check('300010 mock shows a retry sentence and not the code', (await errText(client)) === '验证暂时没有完成，请稍等后重试。' && !(await errText(client)).includes('300010') && !(await errText(client)).toLowerCase().includes('turnstile'));
await client.click('#asg-go');
check('300010 mock does not post the stale token', (await posts(client)).length === 0);
await client.waitForFunction(() => window.__ts.resets.length >= 3, { timeout: 6000 });
await new Promise(r => setTimeout(r, 1200));
const resets = await client.evaluate(() => window.__ts.resets.length);
check('client challenge reset stops at three', resets === 3 && (await posts(client)).length === 0);
await client.evaluate(() => { window.__ts.persist = false; window.__issue('token-after-challenge'); });
await client.click('#asg-go');
await client.waitForFunction(() => window.__posts.length === 1);
check('a later callback can submit a new token', (await posts(client))[0] === 'token-after-challenge');
await client.close();

const verify = await boot('zh');
await openCard(verify, 'A');
await verify.evaluate(() => { window.__mode = 'turnstile'; window.__issue('token-once'); });
await verify.click('#asg-go');
await verify.waitForFunction(() => document.querySelector('#asg-err').textContent.length > 0);
check('siteverify failure is a different sentence from the client challenge', (await errText(verify)) === '验证没有被接受，请等它重新完成后再试。' && (await errText(verify)) !== '验证暂时没有完成，请稍等后重试。');
check('siteverify failure resets that widget and re-enables the button', await verify.evaluate(() => window.__ts.resets.length === 1 && document.querySelector('#asg-go').disabled === false));
await verify.evaluate(() => window.__issue('token-second'));
await verify.click('#asg-go');
await verify.waitForFunction(() => window.__posts.length === 2);
check('retry after siteverify uses a new token', JSON.stringify(await posts(verify)) === '["token-once","token-second"]');
await verify.close();

const verifyEn = await boot('en');
await openCard(verifyEn, 'A');
await verifyEn.evaluate(() => { window.__mode = 'turnstile'; window.__issue('token-en'); });
await verifyEn.click('#asg-go');
await verifyEn.waitForFunction(() => document.querySelector('#asg-err').textContent.length > 0);
check('english siteverify sentence hides the code', (await errText(verifyEn)) === 'The check was not accepted. Wait until it finishes, then try again.');
await verifyEn.evaluate(() => { window.__mode = 'ok'; document.querySelector('.asg-ts').dataset.phase = 'challenge'; document.querySelector('#asg-err').textContent = ''; window.__fail('300010'); });
check('english client challenge sentence is different', (await errText(verifyEn)) === 'The check did not finish. Wait a moment and try again.');
await verifyEn.close();

const net = await boot('zh');
await openCard(net, 'A');
await net.evaluate(() => { window.__mode = 'net'; window.__issue('token-net'); });
await net.click('#asg-go');
await net.waitForFunction(() => document.querySelector('#asg-err').textContent.length > 0);
check('network failure can be retried', (await errText(net)) === '网络异常，请再试一次。' && await net.evaluate(() => document.querySelector('#asg-go').disabled === false));
await net.evaluate(() => { window.__mode = 'ok'; window.__issue('token-net-2'); });
await net.click('#asg-go');
await net.waitForFunction(() => window.__posts.length === 2);
check('network retry sends a new token', (await posts(net))[1] === 'token-net-2');
await net.close();

const other = await boot('zh');
await openCard(other, 'A');
await other.evaluate(() => { window.__mode = 'other'; window.__issue('token-other'); });
await other.click('#asg-go');
await other.waitForFunction(() => document.querySelector('#asg-err').textContent.length > 0);
check('other server codes are not shown raw', (await errText(other)) === '这次没有提交成功，请再试一次。' && !(await errText(other)).includes('lookup_failed'));
await other.close();

const dbl = await boot('zh');
await openCard(dbl, 'A');
await dbl.evaluate(() => { window.__mode = 'hold'; window.__issue('token-dbl'); });
await dbl.evaluate(() => { const go = document.querySelector('#asg-go'); go.click(); go.click(); });
await new Promise(r => setTimeout(r, 100));
check('a double click posts the token once', JSON.stringify(await posts(dbl)) === '["token-dbl"]');
check('the button waits only while that request is open', await dbl.evaluate(() => document.querySelector('#asg-go').disabled === true && document.querySelector('#asg-go').getAttribute('aria-busy') === 'true' && document.querySelector('#atm-star').hidden === false));
await dbl.close();

const mix = await boot('zh');
await openCard(mix, 'A');
const first = await mix.evaluate(() => window.__issue('token-A'));
await mix.evaluate(() => window.ATM_STAR.take(document.querySelector('[data-fid="B"]')));
await mix.waitForFunction(old => { const el = document.querySelector('.asg-ts'); return el && el.dataset.wid && el.dataset.wid !== old; }, {}, first);
await mix.click('[data-intent="going"]');
await mix.evaluate(() => {
  document.querySelector('#asg-email').value = 'guest@example.com';
  const stray = document.createElement('input');
  stray.name = 'cf-turnstile-response';
  stray.value = 'token-A';
  document.querySelector('.asg-body').insertBefore(stray, document.querySelector('.asg-ts'));
  window.__issue('token-B');
});
await mix.click('#asg-go');
await mix.waitForFunction(() => window.__posts.length === 1);
const mixed = await mix.evaluate(() => ({ ts: window.__posts[0].ts, removed: window.__ts.removed.indexOf('w1') >= 0, wid: document.querySelector('.asg-ts').dataset.wid }));
check('reopening uses the new widget token', mixed.ts === 'token-B' && mixed.removed && mixed.wid !== first);
await mix.close();

const kept = await boot('zh?card=GqufXmMX');
await openCard(kept, 'A');
await kept.evaluate(() => { document.querySelector('#asg-email').value = 'guest@example.com'; document.querySelector('[data-intent="interested"]').click(); window.__mode = 'turnstile'; window.__issue('token-keep'); });
await kept.click('#asg-go');
await kept.waitForFunction(() => document.querySelector('#asg-err').textContent.length > 0);
check('a rejected check keeps the edit and stays open', await kept.evaluate(() => document.querySelector('#atm-star').hidden === false && document.querySelector('#asg-email').value === 'guest@example.com' && document.querySelector('[data-intent="interested"]').getAttribute('aria-pressed') === 'true' && document.querySelector('#asg-go').disabled === false));
await kept.evaluate(() => { window.__mode = 'ok'; window.__issue('token-keep-2'); });
await kept.click('#asg-go');
await kept.waitForFunction(() => window.__posts.length === 2);
check('retry after rejection sends a new token', (await posts(kept))[1] === 'token-keep-2');
await kept.close();

const timed = await boot('zh');
await openCard(timed, 'A');
await timed.evaluate(() => { const el = document.querySelector('.asg-ts'); window.__ts.widgets[el.dataset.wid].opts['timeout-callback'](); });
check('a challenge timeout stays on the dialog and does not post', (await posts(timed)).length === 0 && (await errText(timed)) === '验证超时，请再试一次。' && await timed.evaluate(() => document.querySelector('#atm-star').hidden === false));
await timed.click('#asg-go');
check('confirm during that timeout still does not post', (await posts(timed)).length === 0 && (await errText(timed)) === '验证超时，请再试一次。');
await timed.close();

const saved = await boot('zh?card=GqufXmMX');
await openCard(saved, 'A');
await saved.evaluate(() => { window.__mode = 'saved'; window.__issue('token-saved'); });
await saved.click('#asg-go');
await saved.waitForFunction(() => document.querySelector('#atm-star').hidden && document.querySelector('.atm-toast'));
check('a real save shows the queued sentence and closes', await saved.evaluate(() => document.querySelector('.atm-toast').textContent === '已记录你的意向。会在汇总时通知主办（含抄送）。' && location.search === '?card=GqufXmMX' && !document.querySelector('.asg-ts')));
check('that save posts once and removes its widget', JSON.stringify(await posts(saved)) === '["token-saved"]' && await saved.evaluate(() => window.__ts.removed.length === 1 && window.__ts.resets.length === 0 && Object.keys(window.__ts.widgets).length === 0));
await saved.close();

const mailed = await boot('zh');
await openCard(mailed, 'A');
await mailed.evaluate(() => { document.querySelector('#asg-email').value = 'guest@example.com'; window.__mode = 'mailfail'; window.__issue('token-mail'); });
await mailed.click('#asg-go');
await mailed.waitForFunction(() => document.querySelector('#asg-ok').textContent.length > 0);
check('saved intent with a failed notice stays open for retry', await mailed.evaluate(() => document.querySelector('#atm-star').hidden === false && document.querySelector('#asg-ok').textContent === '意向已保存；通知邮件发送失败，请稍后重试。' && document.querySelector('#asg-email').value === 'guest@example.com' && document.querySelector('#asg-go').disabled === false && window.__ts.resets.length === 1));
await mailed.close();

const reg = await boot('zh');
await openCard(reg, 'R');
check('a regular event uses the same close control', await reg.evaluate(() => !!document.querySelector('#asg-dir') && !!document.querySelector('.asg-x') && !document.querySelector('#asg-cancel') && document.querySelector('#asg-tslab').textContent === '请先完成人机验证，再点确认。'));
await reg.click('.asg-x');
check('the corner close sends nothing', (await posts(reg)).length === 0 && await reg.evaluate(() => document.querySelector('#atm-star').hidden === true && window.__urls.every(u => u.indexOf('/going/cancel') < 0)));
await reg.evaluate(() => window.ATM_STAR.take(document.querySelector('[data-fid="R"]')));
await reg.waitForFunction(() => { const el = document.querySelector('.asg-ts'); return el && el.dataset.wid && Object.keys(window.__ts.widgets).length === 1; });
check('reopen after close has one widget', await reg.evaluate(() => Object.keys(window.__ts.widgets).length === 1));
await reg.close();

const unsaved = await boot('en?card=LxcvweaE');
await openCard(unsaved, 'A');
await unsaved.evaluate(() => { document.querySelector('#asg-email').value = 'guest@example.com'; document.querySelector('[data-intent="interested"]').click(); });
const box = await unsaved.evaluate(() => {
  const x = document.querySelector('.asg-x').getBoundingClientRect();
  const h = document.querySelector('#atm-star h2').getBoundingClientRect();
  const overlap = !(x.right < h.left || x.left > h.right || x.bottom < h.top || x.top > h.bottom);
  return { w: x.width, h: x.height, label: document.querySelector('.asg-x').getAttribute('aria-label'), overlap, above: document.querySelector('#asg-tslab').textContent };
});
check('english close target is 44px and clear of the title', box.w >= 44 && box.h >= 44 && box.label === 'Close' && box.overlap === false && box.above === 'Finish the human check, then tap Confirm.');
await unsaved.keyboard.press('Escape');
check('escape closes without a request', (await posts(unsaved)).length === 0 && await unsaved.evaluate(() => document.querySelector('#atm-star').hidden === true && location.search === '?card=LxcvweaE'));
await unsaved.close();

const mine = await boot('zh');
await mine.evaluate(() => {
  localStorage.setItem('atm_session', 'fixture-session');
  localStorage.setItem('atm_test_mine', JSON.stringify({ email: 'ada@example.com', name: 'Ada', city: 'Seoul', role: 'leader', items: [{ id: 'A', intent: 'going', date: '', notify: 1, transport: 0 }], drafts: [] }));
});
await mine.reload({ waitUntil: 'domcontentloaded' });
await mine.waitForFunction(() => window.ATM_STAR && document.querySelector('[data-fid="A"]').getAttribute('aria-pressed') === 'true');
await openCard(mine, 'A');
check('an existing intent has no cancel button', await mine.evaluate(() => !document.querySelector('#asg-cancel') && document.querySelector('.asg-x').getAttribute('aria-label') === '关闭'));
await mine.click('.asg-x');
check('closing an existing intent does not cancel it', await mine.evaluate(() => document.querySelector('[data-fid="A"]').getAttribute('aria-pressed') === 'true' && window.__posts.length === 0 && window.__urls.every(u => u.indexOf('/going/cancel') < 0)));
await mine.close();

async function armLate(p, id) {
  await openCard(p, id);
  await p.evaluate(() => { window.__mode = 'later'; window.__issue('token-late'); });
  await p.click('#asg-go');
  await p.waitForFunction(() => window.__later && window.__posts.length === 1);
}
async function reopenCard(p, id) {
  await p.click('.asg-x');
  await p.evaluate(card => window.ATM_STAR.take(document.querySelector('[data-fid="' + card + '"]')), id);
  await p.waitForFunction(() => { const el = document.querySelector('.asg-ts'); return el && el.dataset.wid && document.querySelector('#atm-star').hidden === false; });
}
function snap(p) {
  return p.evaluate(() => {
    const ts = document.querySelector('.asg-ts');
    const go = document.querySelector('#asg-go');
    return {
      hidden: document.querySelector('#atm-star').hidden,
      title: document.querySelector('#atm-star h2').textContent,
      email: document.querySelector('#asg-email') ? document.querySelector('#asg-email').value : '',
      interested: document.querySelector('[data-intent="interested"]').getAttribute('aria-pressed'),
      wid: ts ? ts.dataset.wid : '',
      live: !!(ts && window.__ts.widgets[ts.dataset.wid]),
      posts: window.__posts.length,
      resets: window.__ts.resets.slice(),
      removed: window.__ts.removed.slice(),
      toast: document.querySelector('.atm-toast') ? document.querySelector('.atm-toast').textContent : '',
      err: document.querySelector('#asg-err').textContent,
      ok: document.querySelector('#asg-ok').textContent,
      busy: go.getAttribute('aria-busy'),
      disabled: go.disabled
    };
  });
}
function untouched(before, after, title) {
  return after.hidden === false && after.title === title && after.email === 'kept@example.com' && after.interested === 'true' && after.wid === before.wid && after.live && after.posts === 1 && JSON.stringify(after.resets) === JSON.stringify(before.resets) && JSON.stringify(after.removed) === JSON.stringify(before.removed) && after.toast === '' && after.err === '' && after.ok === '' && after.busy === 'false' && after.disabled === false;
}
async function editNew(p) {
  await p.evaluate(() => { document.querySelector('#asg-email').value = 'kept@example.com'; document.querySelector('[data-intent="interested"]').click(); });
}

const sameOk = await boot('zh');
await armLate(sameOk, 'A');
await reopenCard(sameOk, 'A');
await editNew(sameOk);
{
  const before = await snap(sameOk);
  await sameOk.evaluate(() => window.__later.ok({ ok: true, mail: 'queued' }));
  await new Promise(r => setTimeout(r, 80));
  check('late success does not close a reopened card', untouched(before, await snap(sameOk), '演示甲'));
}
await sameOk.close();

const otherOk = await boot('zh');
await armLate(otherOk, 'A');
await reopenCard(otherOk, 'B');
await editNew(otherOk);
{
  const before = await snap(otherOk);
  await otherOk.evaluate(() => window.__later.ok({ ok: true, mail: 'queued' }));
  await new Promise(r => setTimeout(r, 80));
  check('late success is not shown as the next card being confirmed', untouched(before, await snap(otherOk), '演示乙'));
}
await otherOk.close();

const sameErr = await boot('zh');
await armLate(sameErr, 'A');
await reopenCard(sameErr, 'A');
await editNew(sameErr);
{
  const before = await snap(sameErr);
  await sameErr.evaluate(() => window.__later.fail());
  await new Promise(r => setTimeout(r, 80));
  check('a late network error does not mark the reopened card', untouched(before, await snap(sameErr), '演示甲'));
}
await sameErr.close();

const otherErr = await boot('zh');
await armLate(otherErr, 'A');
await reopenCard(otherErr, 'B');
await editNew(otherErr);
{
  const before = await snap(otherErr);
  await otherErr.evaluate(() => window.__later.ok({ ok: false, error: 'lookup_failed' }));
  await new Promise(r => setTimeout(r, 80));
  check('a late server error does not enter the next card', untouched(before, await snap(otherErr), '演示乙'));
}
await otherErr.close();

const stayed = await boot('zh');
await armLate(stayed, 'A');
await stayed.click('.asg-x');
await stayed.evaluate(() => window.__later.ok({ ok: true, mail: 'queued' }));
await new Promise(r => setTimeout(r, 80));
check('a late success after close does not reopen or toast', await stayed.evaluate(() => document.querySelector('#atm-star').hidden === true && !document.querySelector('.atm-toast') && window.__posts.length === 1));
await stayed.close();

await browser.close();
server.close();
if (fail.length) { console.error('FAIL', fail.join(' | ')); process.exit(1); }
console.log('star turnstile ui ok');

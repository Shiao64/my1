// 付款步骤 (Shiao, 2026-11-26): every letter that carries payment codes (确认信, 付款提醒, 报名更新信, and 金额调整 when it asks
// for money) shows the steps right above the codes: ① save the code, ② per attached code (Alipay: 扫一扫 → 相册; WeChat:
// 右上角 + → 扫一扫 → 相册), ③ amount + 「添加备注」 with the number, ④ screenshot and reply; the reminder about the note; what
// to do when the codes do not show; "choose one" only with two codes; first-timers from abroad bind a card first (nothing
// about fees or limits). Letters name only the apps whose code is attached ("微信或支付宝" is gone).
// Run: node social-worker/test/reg-paysteps.test.mjs
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const R = await import(pathToFileURL(path.join(root, 'social-worker/src/register.js')).href);
const env = { API_BASE: 'https://api.tangoweekend.org', REG_QR_KEY: 'k' };
const fail = []; let passed = 0;
const check = (n, ok, info) => { if (ok) passed++; else fail.push(n + (info !== undefined ? ' — ' + JSON.stringify(info).slice(0, 900) : '')); };
const reg = (o = {}) => ({ code: 'BJ27-0012', amount: 1450, due_at: '2026-12-14T17:30:00.000Z', status: 'confirmed', lang: 'zh', domestic: 1,
  data: { people: [{ name: '朱一', amount: 1450, pkg: 'full', extra: [], items: [] }], rooms: [], hotel: false }, ...o });

// --- domestic, Chinese, only the 国内支付宝 code (as live today)
let m = R.letter('conf', reg(), env, null, ['cn-alipay']);
check('zh: pay line names only 支付宝', /用支付宝扫付款码支付 ¥1,450/.test(m.text) && !/微信/.test(m.text.split('付款步骤')[0]), m.text);
check('zh: no-app line names only 支付宝', m.text.includes('如无法使用支付宝，请回复本邮件并附上机票截图'), m.text);
check('zh: no 微信 anywhere (only the Alipay code is attached)', !m.text.includes('微信'), m.text);
const zs = ['付款步骤：', '① 截图或长按，把付款码存到相册', '② 支付宝：扫一扫 → 相册', '③ 输入金额，点「添加备注」填这笔的编号（BJ27-0012）', '④ 截下付款结果，回复本邮件附上截图', '✅ 重要提醒：付款备注一定要填报名编号。', '信里看不到付款码，点「查看报名和付款码」。'];
check('zh: the steps in order, with the number', zs.every((x, i) => m.text.includes(x) && (i === 0 || m.text.indexOf(x) > m.text.indexOf(zs[i - 1]))), m.text);
check('zh: no "choose one" with one code, no bank-card line for domestic', !m.text.includes('选一个') && !m.text.includes('银行卡'), m.text);
check('zh text: steps right after the pay line, before the no-app line', m.text.indexOf('扫付款码支付') < m.text.indexOf('付款步骤') && m.text.indexOf('付款步骤') < m.text.indexOf('如无法使用'), m.text);
check('zh html: steps once, right above the codes (after the button)', m.html.split('付款步骤').length === 2 && m.html.indexOf('查看报名和付款码</a>') < m.html.indexOf('付款步骤') && m.html.indexOf('付款步骤') < m.html.indexOf('/social/reg/qr/cn-alipay'), m.html.slice(0, 200));
check('zh html: the reminder in bold', /<b>✅ 重要提醒：付款备注一定要填报名编号。<\/b>/.test(m.html));
check('zh: uses 你, never 您', !/您/.test(m.text));

// --- international, both codes, every language and every letter that carries codes
const words = { en: ['Alipay or WeChat Pay', 'Alipay: Scan → Album', 'WeChat: + (top right) → Scan → Album', 'choose one and pay once', 'Link a bank card', '"Add note"', 'Important'],
  zh: ['支付宝或微信', '支付宝：扫一扫 → 相册', '微信：右上角 + → 扫一扫 → 相册', '选一个付一次就好', '绑好银行卡', '「添加备注」', '重要提醒'],
  ko: ['알리페이 또는 위챗페이', '알리페이: 스캔 → 앨범', '위챗: 오른쪽 위 + → 스캔 → 앨범', '하나만 골라', '은행 카드', '「메모 추가」', '중요'],
  es: ['Alipay o WeChat Pay', 'Alipay: Escanear → Álbum', 'WeChat: + (arriba a la derecha) → Escanear → Álbum', 'elige uno', 'tarjeta bancaria', '«Añadir nota»', 'Importante'],
  ru: ['Alipay или WeChat Pay', 'Alipay: «Сканировать» → «Альбом»', 'WeChat: «+» справа вверху', 'выберите один', 'банковскую карту', '«Добавить примечание»', 'Важно'] };
for (const lang of Object.keys(words)) for (const kind of ['conf', 'rem', 'upd']) {
  m = R.letter(kind, reg({ lang, domestic: 0 }), env, null, ['intl-alipay', 'intl-wechat']);
  check(`${lang} ${kind}: both apps, both step-2 lines, choose one, bank card, note, reminder`, words[lang].every(w => m.text.includes(w)) && m.text.includes('BJ27-0012'), { miss: words[lang].filter(w => !m.text.includes(w)), text: m.text });
  check(`${lang} ${kind}: steps above both codes, Alipay first`, m.html.indexOf('②') < m.html.indexOf('/qr/intl-alipay') && m.html.indexOf('/qr/intl-alipay') < m.html.indexOf('/qr/intl-wechat'));
  check(`${lang} ${kind}: nothing about fees or limits for cards from abroad`, !/(手续费|fee|수수료|comisión|комисси|限额|limit|한도|límite|лимит)/i.test(m.text.split(words[lang][1])[1].split('\n').slice(0, 7).join('\n')), m.text);
  check(`${lang} ${kind}: no placeholders left`, !/\{[a-z]\}|undefined/.test(m.text + m.subject));
}
// only the WeChat code (should that be all that is uploaded)
m = R.letter('conf', reg({ lang: 'en', domestic: 0 }), env, null, ['intl-wechat']);
check('WeChat only: pay line and step 2 name WeChat only', m.text.includes('with WeChat Pay,') && m.text.includes('② WeChat: + (top right) → Scan → Album') && !m.text.includes('Alipay'), m.text);
// no code uploaded yet: the pay line stays general, no steps (they would point at nothing)
m = R.letter('conf', reg({ lang: 'zh' }), env, null, []);
check('no code yet: general pay line, no steps', m.text.includes('用支付宝或微信扫付款码') && !m.text.includes('付款步骤'), m.text);
// 金额调整 that asks for money carries the codes and so the steps; the others do not
m = R.letter('adj', reg({ rest: 1650, amount: 1650, adj: { d: 200, why: '多住一晚', was: 1450, paid: 0, over: 0 } }), env, null, ['cn-alipay']);
check('金额调整 on a 待付款 one: the steps, with the number', m.text.includes('付款步骤') && m.text.includes('BJ27-0012') && m.html.indexOf('付款步骤') < m.html.indexOf('/qr/cn-alipay'), m.text);
m = R.letter('adj', reg({ status: 'paid', rest: 0, adj: { d: -100, why: '义工', was: 1450, paid: 1450, over: 100 } }), env, null, []);
check('金额调整 on a paid one: no steps', !m.text.includes('付款步骤'), m.text);
m = R.letter('paid', reg({ status: 'paid' }), env, [{ name: '朱一', pass: 'BJ27-0012-1.x' }]);
check('paid letter: no steps', !m.text.includes('付款步骤') && !m.html.includes('付款步骤'));
m = R.letter('recv', reg({ status: 'pending' }), env, null, []);
check('收到报名: no steps', !m.text.includes('付款步骤'));

console.log(`reg-paysteps: ${passed} passed, ${fail.length} failed`);
if (fail.length) { console.log(fail.join('\n')); process.exit(1); }

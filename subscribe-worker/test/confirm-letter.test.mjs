// Confirmation letter copy. Does not send mail. Run: node subscribe-worker/test/confirm-letter.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const fail = [];
const check = (n, ok) => { if (!ok) fail.push(n); };
const enNote = "This link works in WeChat or any web browser. If tapping it doesn't work, copy the full link (starting with https://api.tangoweekend.org/) and open it in WeChat or your browser.";
const zhNote = '此链接可在微信或任何浏览器中打开。点不开时，请复制完整链接（以 https://api.tangoweekend.org/ 开头），到微信或浏览器里打开。';
const link = 'https://api.tangoweekend.org/confirm?t=PLACEHOLDER';
const unsub = 'https://api.tangoweekend.org/unsubscribe?t=PLACEHOLDER';

const dir = '/tmp/atm-sub-letter';
fs.mkdirSync(dir, { recursive: true });
for (const name of ['push.js', 'mime.js']) fs.copyFileSync(path.join(root, 'subscribe-worker/src', name), path.join(dir, name));
const src = fs.readFileSync(path.join(root, 'subscribe-worker/src/index.js'), 'utf8')
  .replace("import { EmailMessage } from 'cloudflare:email';\n", 'class EmailMessage { constructor() {} }\n');
fs.writeFileSync(path.join(dir, 'index.js'), src);
const { confirmLetter } = await import(pathToFileURL(path.join(dir, 'index.js')).href);

const en = confirmLetter('en', link, unsub);
const zh = confirmLetter('zh', link, unsub);
check('subjects stay', en.subject === 'Please confirm: Asia Tango Map event alerts' && zh.subject === '请确认订阅：亚洲探戈地图新活动通知');
check('english note is directly under the link', en.text.includes(link + '\n\n' + enNote + '\n\nThe link is valid for 7 days.') && en.html.includes('>' + link + '</p><p style="margin:8px 0 0;font-size:13px;line-height:1.5;color:#5b5148">' + enNote + '</p>'));
check('chinese note is directly under the link', zh.text.includes(link + '\n\n' + zhNote + '\n\n链接7天内有效。') && zh.html.includes('>' + link + '</p><p style="margin:8px 0 0;font-size:13px;line-height:1.5;color:#5b5148">' + zhNote + '</p>'));
check('english letter has no chinese', !/[\u3400-\u9fff]/.test(en.subject + en.text + en.html));
check('other sentences stay', en.text.includes("Please click the link below to confirm your subscription to Asia Tango Map event alerts:") && en.text.includes("If this wasn't you, just ignore this email and you won't hear from us again.") && zh.text.includes('请点击下面的链接确认订阅亚洲探戈地图的新活动通知：') && zh.text.includes('如果不是您本人操作，请忽略这封邮件，我们不会再发邮件给您。'));
check('html still has the confirm button and the plain link', en.html.includes('>Confirm subscription</a>') && zh.html.includes('>确认订阅</a>') && en.html.includes('href="' + link + '"') && zh.html.includes('href="' + link + '"'));
check('note is not a paragraph above the button', en.html.indexOf(enNote) > en.html.indexOf('>Confirm subscription</a>') && zh.html.indexOf(zhNote) > zh.html.indexOf('>确认订阅</a>'));

if (fail.length) { console.error('FAIL', fail.join(' | ')); process.exit(1); }
console.log('confirm letter ok');

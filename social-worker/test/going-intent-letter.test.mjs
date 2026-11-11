// Organizer intent-letter copy. No network and no send.
// Run: node social-worker/test/going-intent-letter.test.mjs
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const { buildIntentLetter } = await import(pathToFileURL(path.join(root, 'social-worker/src/going.js')).href);
const kit = {
  EMAIL_RE: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
  he: s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
};
const fail = [];
const check = (name, ok) => { if (!ok) fail.push(name); };
const env = { GOING_NOW: '2026-11-11T02:00:00.000Z' };
function letter(card, person, extra) {
  return buildIntentLetter({ ...env, ...(extra || {}) }, kit, card, person);
}
const base = {
  id: 'card-INTERNAL-99', email: 'angel@example.com', kind: 'weekly', time: '20:00–23:00',
  title: 'Red Room Practica', title_zh: '红舞房 Practica', organizers: ['安琪'], organizers_en: ['Angel']
};
const dancer = { email: 'dancer@example.com', name: '张三', role: 'leader', city: '北京', show: '2026-11-07' };
const zhWhen = '11月7日（周六）20:00–23:00（北京时间）';
const enWhen = 'Saturday, 7 Nov, 20:00–23:00 (Beijing time)';

const goingZh = letter({ ...base, region: 'China', country: 'China' }, { ...dancer, intent: 'going', transport: 1 });
check('china going is chinese first', goingZh.zhFirst === true && goingZh.subject === 'ATM 网站 · 活动参加通知');
check('china going text', goingZh.text === [
  '安琪你好，',
  '探友张三（领舞，北京）勾选了要参加你的以下活动：\n「红舞房 Practica」，时间是 ' + zhWhen + '。',
  '探友希望收到交通指引，对方已在抄送里，请「回复全部」。',
  '请注意，这不是购票或正式报名。',
  '探戈助理\n亚洲探戈地图（简称 ATM）',
  '附言：若要停止 ATM 往后的活动参加通知，或删除这封信里的资料，请不要「回复全部」，另寄信到 selecttango@gmail.com，正文写「退订」即可。',
  '————',
  'Hello Angel,',
  'Dancer 张三 (leader, 北京) has selected that they are going to the following event of yours:\n“Red Room Practica”, ' + enWhen + '.',
  'They have asked for directions and are copied on this message; please “Reply all”.',
  'Please note: this is not a ticket or a formal registration.',
  'Tango Assistant\nAsia Tango Map (ATM)',
  'P.S. To stop future ATM attendance notices, or to delete the information in this message, do not “Reply all”; send a separate email to selecttango@gmail.com with the word “UNSUBSCRIBE”.'
].join('\n\n'));
check('html keeps both letters as paragraphs', goingZh.html.includes('<meta charset="utf-8">') && goingZh.html.includes('<p style="margin:0 0 16px;line-height:1.55">安琪你好，</p>') && goingZh.html.includes('探友张三（领舞，北京）勾选了要参加你的以下活动：<br>「红舞房 Practica」，时间是 ' + zhWhen + '。') && goingZh.html.includes('Dancer 张三 (leader, 北京) has selected that they are going to the following event of yours:<br>') && goingZh.html.includes('>————</p>') && !goingZh.html.includes('Card:') && !goingZh.text.includes('card-INTERNAL-99') && !goingZh.html.includes('card-INTERNAL-99'));

const interestedZh = letter({ ...base, region: 'China', country: 'China' }, { ...dancer, intent: 'interested', transport: 0 });
check('china interested changes only the opening', interestedZh.subject === 'ATM 网站 · 活动兴趣通知' && interestedZh.text.includes('探友张三（领舞，北京）勾选了对你的以下活动感兴趣：') && interestedZh.text.includes('has selected that they are interested in the following event of yours:') && !interestedZh.text.includes('要参加') && !interestedZh.text.includes('going to') && interestedZh.text.includes('活动参加通知') && interestedZh.text.includes('attendance notices') && interestedZh.text.includes('对方已在抄送里，请「回复全部」。') && !interestedZh.text.includes('希望收到交通指引'));

const noDir = letter({ ...base, region: 'Hong Kong', country: 'China' }, { ...dancer, intent: 'going', transport: 0 });
check('no directions still asks for reply all', noDir.zhFirst && noDir.text.includes('对方已在抄送里，请「回复全部」。') && noDir.text.includes('They are copied on this message; please “Reply all”.') && !noDir.text.includes('希望收到交通指引') && !noDir.text.includes('asked for directions'));

const korea = letter({ ...base, id: 'SEOUL', region: 'South Korea', country: 'South Korea', email: '' }, { ...dancer, intent: 'going', transport: 1 }, {
  GOING_ORG_DIR: { orgs: { O9: 'angel@example.com' }, links: { SEOUL: ['O9'] }, names: { O9: { name: '安琪', name_en: 'Angel', lang: 'en' } } }
});
check('korea english first even with an english directory lang', korea.zhFirst === false && korea.subject === 'ATM Website · Event Attendance Notice' && korea.text.startsWith('Hello Angel,\n\nDancer 张三 (leader, 北京) has selected that they are going'));
const koreaIn = letter({ ...base, id: 'SEOUL', region: 'South Korea', country: 'South Korea', email: '' }, { ...dancer, intent: 'interested', transport: 0 }, {
  GOING_ORG_DIR: { orgs: { O9: 'angel@example.com' }, links: { SEOUL: ['O9'] }, names: { O9: { name: '安琪', name_en: 'Angel' } } }
});
check('korea interested subject and opening', koreaIn.subject === 'ATM Website · Event Interest Notice' && koreaIn.text.includes('has selected that they are interested') && koreaIn.text.includes('————\n\n安琪你好，') && !koreaIn.text.includes('going to') && !koreaIn.text.includes('要参加'));
const marked = letter({ ...base, id: 'SEOUL', region: 'South Korea', country: 'South Korea', email: '' }, { ...dancer, intent: 'going', transport: 1 }, {
  GOING_ORG_DIR: { orgs: { O9: 'angel@example.com' }, links: { SEOUL: ['O9'] }, names: { O9: { name: '安琪', name_en: 'Angel', lang: 'zh' } } }
});
check('directory lang zh puts chinese first outside those regions', marked.zhFirst === true && marked.subject === 'ATM 网站 · 活动参加通知' && marked.text.startsWith('安琪你好，'));
const chinaEn = letter({ ...base, id: 'BJ', region: 'China', country: 'China', email: '' }, { ...dancer, intent: 'going', transport: 0 }, {
  GOING_ORG_DIR: { orgs: { O9: 'angel@example.com' }, links: { BJ: ['O9'] }, names: { O9: { name: '安琪', name_en: 'Angel', lang: 'en' } } }
});
check('a china event stays chinese first when the directory says en', chinaEn.zhFirst === true && chinaEn.subject === 'ATM 网站 · 活动参加通知');

for (const region of ['Taiwan', 'Macau', 'Macao', 'Hong Kong']) {
  const row = letter({ ...base, region, country: region === 'Hong Kong' ? 'China' : region }, { ...dancer, intent: 'going', transport: 0 });
  check(region + ' is chinese first', row.zhFirst === true);
}
check('japan is english first', letter({ ...base, region: 'Japan', country: 'Japan' }, { ...dancer, intent: 'going', transport: 0 }).zhFirst === false);

const roleOnly = letter({ ...base, region: 'China' }, { ...dancer, city: '', intent: 'going', transport: 0 });
const cityOnly = letter({ ...base, region: 'China' }, { ...dancer, role: '', intent: 'going', transport: 0 });
const bare = letter({ ...base, region: 'China' }, { ...dancer, role: '', city: '', intent: 'going', transport: 0 });
const both = letter({ ...base, region: 'China' }, { ...dancer, role: 'both', intent: 'going', transport: 0 });
check('missing city or role drops only that piece', roleOnly.text.includes('探友张三（领舞）勾选了') && roleOnly.text.includes('Dancer 张三 (leader) has selected') && !roleOnly.text.includes('（领舞，') && cityOnly.text.includes('探友张三（北京）') && cityOnly.text.includes('Dancer 张三 (北京)') && !cityOnly.text.includes('leader') && bare.text.includes('探友张三勾选了') && bare.text.includes('Dancer 张三 has selected') && !bare.text.includes('探友张三（') && !bare.text.includes('Dancer 张三 (') && both.text.includes('探友张三（都可，北京）') && both.text.includes('Dancer 张三 (both, 北京)'));
const noName = letter({ ...base, region: 'China', organizers: [], organizers_en: [] }, { email: 'dancer@example.com', name: '', role: 'follower', city: '上海', intent: 'going', show: '2026-11-07', transport: 0 });
check('missing names use the email and the existing hello', noName.text.startsWith('你好！') && noName.text.includes('探友dancer@example.com（跟舞，上海）') && !noName.text.includes('Hello ,') && noName.text.includes('Dancer dancer@example.com (follower, 上海)') && noName.text.includes('\n\nHi,\n\nDancer dancer@example.com'));

const nextYear = letter({ ...base, region: 'China', time: '20:30-24:30' }, { ...dancer, show: '2027-06-18', intent: 'going', transport: 0 });
check('another year is written out and a late clock is kept', nextYear.text.includes('2027年6月18日（周五）20:30–24:30（北京时间）') && nextYear.text.includes('Friday, 18 Jun 2027, 20:30–24:30 (Beijing time)') && !nextYear.text.includes('2026年'));
const span = letter({ ...base, region: 'China', kind: 'event', time: '', start: '2027-06-18', end: '2027-06-22' }, { ...dancer, show: '', intent: 'interested', transport: 1 });
check('a featured span names both dates', span.text.includes('2027年6月18日（周五）至2027年6月22日（周二）（北京时间）') && span.text.includes('Friday, 18 Jun 2027 – Tuesday, 22 Jun 2027 (Beijing time)') && span.text.includes('希望收到交通指引'));
const sameTitle = letter({ ...base, region: 'China', title: '红舞房 Practica', title_zh: '红舞房 Practica' }, { ...dancer, intent: 'going', transport: 0 });
check('one title is used in both halves', sameTitle.text.includes('「红舞房 Practica」') && sameTitle.text.includes('“红舞房 Practica”'));
const late = letter({ ...base, region: 'Japan', time: '21:00–late' }, { ...dancer, intent: 'going', transport: 0 });
check('an open-ended clock stays', late.text.includes('21:00–late') && late.zhFirst === false);

if (fail.length) { console.error('FAIL\n' + fail.join('\n')); process.exit(1); }
console.log('going intent letter ok');

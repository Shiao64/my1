// Welcome email templates for Asia Tango Map event alerts.
// lang: 'zh' | 'en' | anything else -> bilingual (zh first, then en).
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const T = {
  zh: {
    subject: '欢迎订阅亚洲探戈地图活动提醒',
    hi: '你好！',
    lines: ['感谢订阅亚洲探戈地图活动提醒，很高兴在探戈路上遇见你。',
      '每周你会收到一封新活动邮件。',
      '微信群会不定时发布新活动。',
      '如果你留了微信号，我们会邀请你入群。'],
    unsubPre: '不想再收到邮件？', unsub: '点这里退订',
  },
  en: {
    subject: 'Welcome to Asia Tango Map event alerts',
    hi: 'Hi there,',
    lines: ['Thanks for subscribing to Asia Tango Map event alerts. Glad to have you with us.',
      "You'll get a weekly email with new events.",
      'Our WeChat group also posts new events from time to time.',
      "If you left a WeChat ID, we'll send you a group invite."],
    unsubPre: 'No longer want these emails?', unsub: 'Unsubscribe here',
  },
};
const SIG = 'Asia Tango Map / tangoweekend.org';

function block(k, url) {
  const t = T[k];
  const text = [t.hi, '', t.lines[0], '', ...t.lines.slice(1).map(l => '· ' + l), '', `${t.unsubPre}${k === 'en' ? ' ' : ''}${t.unsub}${k === 'zh' ? '：' : ': '}${url}`].join('\n');
  const html = `<p>${esc(t.hi)}</p><p>${esc(t.lines[0])}</p><ul style="padding-left:20px">${t.lines.slice(1).map(l => `<li>${esc(l)}</li>`).join('')}</ul>`
    + `<p style="color:#666;font-size:13px">${esc(t.unsubPre)} <a href="${esc(url)}" style="color:#0f9b8e">${esc(t.unsub)}</a></p>`;
  return { text, html };
}

export function welcomeEmail(lang, unsubUrl) {
  const keys = lang === 'zh' ? ['zh'] : lang === 'en' ? ['en'] : ['zh', 'en'];
  const parts = keys.map(k => block(k, unsubUrl));
  const subject = keys.map(k => T[k].subject).join(' | ');
  const text = parts.map(p => p.text).join('\n\n———\n\n') + '\n\n' + SIG + '\nhttps://tangoweekend.org\n';
  const html = `<!doctype html><html lang="${keys[0] === 'zh' ? 'zh-CN' : 'en'}"><head><meta charset="utf-8"><title>${esc(subject)}</title></head>`
    + `<body style="margin:0;background:#f5f5f5"><div style="max-width:560px;margin:0 auto;padding:24px;background:#fff;font-family:-apple-system,'PingFang SC','Microsoft YaHei',Arial,sans-serif;font-size:15px;line-height:1.6;color:#222">`
    + parts.map(p => p.html).join('<hr style="border:none;border-top:1px solid #eee;margin:24px 0">')
    + `<p style="margin-top:24px;color:#0f9b8e"><strong>Asia Tango Map</strong> / <a href="https://tangoweekend.org" style="color:#0f9b8e">tangoweekend.org</a></p></div></body></html>`;
  return { subject, html, text };
}

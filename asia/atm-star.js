/* Browsing stays anonymous. Saving, I'm going, and subscribe open one login
   sheet (email + last 4 digits) and then use the account. Favorites live in
   going_favs when a session exists; atm_fav_v1 is only the local mirror and
   merges once on first login. Unsaving does not cancel a going intent.
   The opened card offers a star and I'm going. Interested and Not Going are
   not offered. The count uses GET /social/going/counts field `going`
   (Worker deploy). */
(function () {
  var R = document.documentElement;
  var zh = /^zh/i.test(R.getAttribute('data-asia-lang') || document.body.getAttribute('data-lang') || R.lang || '') || location.pathname.indexOf('/zh/') === 0;
  function apiBase() {
    var host = location.hostname;
    if (host === 'tangoweekend.org' || host === 'www.tangoweekend.org') return 'https://api.tangoweekend.org';
    try {
      var q = new URLSearchParams(location.search).get('api');
      if (q) {
        var u = new URL(q);
        var h = u.hostname;
        var local = (u.protocol === 'http:' && (h === 'localhost' || h === '127.0.0.1'));
        var preview = u.protocol === 'https:' && (h.endsWith('.workers.dev') || h.endsWith('.pages.dev') || h === 'api.tangoweekend.org');
        if (local || preview) return u.origin;
      }
    } catch (e) {}
    return window.ATM_SOCIAL_API || window.TANGO_SUB_API || 'https://api.tangoweekend.org';
  }
  var API = apiBase();
  var STAR = 'M12 2.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.1 6.8 18.6l1-5.8L3.6 8.7l5.8-.8z';
  var L = zh ? {
    grey: '组织者尚未提供邮箱',
    checking: '正在确认组织者邮箱',
    tsWait: '请先完成人机验证，再点确认。',
    tsChallenge: '验证暂时没有完成，请稍等后重试。',
    tsExpired: '验证已过期，请等它重新完成后再试。',
    tsTimeout: '验证超时，请再试一次。',
    tsVerify: '验证没有被接受，请等它重新完成后再试。',
    net: '网络异常，请再试一次。',
    again: '这次没有提交成功，请再试一次。',
    title: '收藏',
    save: '收藏',
    toastOn: '已收藏',
    toastOff: '已取消收藏',
    teach: '星星用来收藏。想让主办知道，请打开活动后点「我要去」。',
    explain: '不是购票或正式报名。',
    going: '我要去', interested: '感兴趣', absent: '去不了',
    meanGoing: '我要去：我们会把你的意向告诉主办（这不是报名或购票）。',
    meanInterested: '',
    promo: '加入 ATM 全站订阅',
    needName: '请填写姓名。', needEmail: '请填写邮箱。', needCity: '请填写城市。', needRole: '请选择角色：引带（Leader）、跟随（follower）或两者皆可（both）。',
    returnHint: '已经订阅过？请输入邮箱和手机末 4 码，不必再等确认信。',
    gateHelp: '邮箱和手机末 4 码<em>必填</em>。第一次会发送确认邮件；在信里点确认以后，手机末 4 码才会生效。已确认过的，填邮箱和手机末 4 码即可继续，不必再等确认信。',
    regHelp: '请完成注册。邮箱和手机末 4 码<em>必填</em>。请补全资料并发送确认邮件。在信里点确认以后，手机末 4 码才会生效。',
    phone: '手机', last4: '手机末 4 码', signIn: '继续', gate: '继续', send: '发送确认邮件', cont: '继续',
    needPhone: '请填写手机。', badPhone: '手机号码不正确。', needLast4: '请输入手机末 4 码。', badLogin: '邮箱或手机末 4 码不正确。',
    later: '请稍后再试。',
    limited: '确认邮件已达上限，请稍后再试。',
    withheld: '已记下。这一场不会交给主办。',
    unfav: '取消收藏',
    unfavAsk: '取消收藏这个活动？',
    unfavKeep: '保留',
    notify: '接收主办方信息',
    scope: '',
    transport: '交通指引（可选）',
    noPromise: '',
    optin: '勾选后，可接收早鸟报名及截止时间、场地交通指引、临时通知和主办方消息。',
    submit: '确认', needIntent: '请选择「我要去」。',
    profileTitle: '',
    profileDesc: '先确认邮箱。确认后会记下意向。',
    req: '以下均为必填',
    name: '姓名', email: '邮箱', city: '城市', role: '角色',
    rl: '引带（Leader）', rf: '跟随（follower）', rb: '两者皆可（both）', rolePh: '请选择',
    once: '同一设备验证通过后，再选 Going／Interested 无需重复验证。',
    verifyBtn: '确认', pending: '确认邮件已发出，请查收。确认后会记下意向。',
    sentHold: '已发送邮件，请到邮箱确认',
    spam: '没收到邮件？请到垃圾邮件箱查看。',
    backHint: '确认链接可能会在浏览器里打开，确认后回到这里就行。',
    confirmed: '已确认',
    resendHint: '请先检查垃圾邮件；1 分钟后可重发一次',
    resendWait: '{n} 秒后可重发',
    resendUsed: '已重发过，请查收或稍后再试。',
    resend: '重新发送验证邮件',
    ready: '邮箱已确认，意向已记下。',
    saved: '邮箱已验证，资料已保存。打开活动后点「我要去」。',
    savedNotify: '已保存，主办方会收到通知',
    savedShort: '已保存',
    noOrg: '已保存，未找到主办方邮箱',
    noRsvp: '暂不支持在线登记，请联系主办方',
    sent: '已保存，主办方会收到通知',
    unchanged: '已保存，主办方会收到通知',
    fail: '已保存，通知邮件未能发出。',
    failWait: '已保存，通知邮件未能发出。请 {n}后再试。',
    queued: '已保存，主办方会收到通知',
    fill: '请补全城市与角色等信息后继续。无需再次验证同一邮箱。',
    bar: '我的收藏', manage: '收藏', cancel: '取消意向',
    me: '我', meSaved: '收藏', meGoing: '我要去', meAlert: '接收活动信息', meEmpty: '还没有收藏。', meNone: '还没有要去的活动。', meNeed: '请先补全姓名、城市和角色。',
    cancelAsk: '取消意向？这不会再发邮件给组织者，也不会撤回已经发出的信。',
    cancelled: '已取消意向。没有新的邮件发给组织者。',
    emailKept: '邮箱已确认',
    unsub: '退订本活动更新（不会取消你的 Going／Interested）',
    date: '参加日期（北京时间 UTC+8）', close: '关闭',
    hint: '星星用来收藏。想让主办知道，请打开活动后点「我要去」。',
    empty: '点活动上的星星即可收藏。',
    notTicket: 'Going 不是购票或正式报名。'
  } : {
    grey: 'Organizer email not available yet',
    checking: 'Checking organizer email',
    tsWait: 'Finish the human check, then tap Confirm.',
    tsChallenge: 'The check did not finish. Wait a moment and try again.',
    tsExpired: 'The check expired. Wait until it finishes, then try again.',
    tsTimeout: 'The check timed out. Please try again.',
    tsVerify: 'The check was not accepted. Wait until it finishes, then try again.',
    net: 'Network error. Please try again.',
    again: 'This did not go through. Please try again.',
    title: 'Save',
    save: 'Save',
    toastOn: 'Saved',
    toastOff: 'Removed from saved',
    teach: 'The star saves an event. To tell the organizer, open the event and tap I\u2019m going.',
    explain: 'Not a ticket or a formal registration.',
    going: 'I\u2019m going', interested: 'Interested', absent: 'Not Going',
    meanGoing: 'I\u2019m going: we\u2019ll tell the organizer you plan to attend (this is not registration or a ticket).',
    meanInterested: '',
    promo: 'Join ATM site-wide subscription',
    needName: 'Please enter your name.', needEmail: 'Please enter your email.', needCity: 'Please enter your city.', needRole: 'Please choose Leader, follower, or both.',
    returnHint: 'Already subscribed? Enter your email and the last 4 digits of your mobile. You don\u2019t need another confirmation email.',
    gateHelp: 'Email and the mobile last 4 digits are <em>required</em>. The first time still sends a confirmation email. The mobile last 4 digits work only after you tap the link in that email. If you already confirmed, enter your email and the mobile last 4 digits to continue. You don\u2019t need another confirmation email.',
    regHelp: 'Finish registration. Email and the mobile last 4 digits are <em>required</em>. Complete your details and send the confirmation email. The mobile last 4 digits work only after you tap the link in that email.',
    phone: 'Phone', last4: 'Mobile last 4 digits', signIn: 'Continue', gate: 'Continue', send: 'Send confirmation email', cont: 'Continue',
    needPhone: 'Please enter your phone number.', badPhone: 'That phone number does not look valid.', needLast4: 'Enter the last 4 digits of your mobile.', badLogin: 'The email or the mobile last 4 digits did not match.',
    later: 'Please try again later.',
    limited: 'Too many confirmation emails. Please try again later.',
    withheld: 'Saved. This one is not sent to the organizer.',
    unfav: 'Unsave',
    unfavAsk: 'Remove this event from favorites?',
    unfavKeep: 'Keep',
    notify: 'Receive organizer updates',
    scope: '',
    transport: 'Directions (optional)',
    noPromise: '',
    optin: 'Get early-bird deadlines, directions and updates from the organizer.',
    submit: 'Confirm', needIntent: 'Choose I\u2019m going.',
    profileTitle: '',
    profileDesc: 'Confirm your email first. Your intent is saved when you confirm.',
    req: 'All fields are required',
    name: 'Name', email: 'Email', city: 'City', role: 'Role',
    rl: 'Leader', rf: 'follower', rb: 'both', rolePh: 'Choose',
    once: 'After one verification on this device, you won’t need to verify again to choose Going or Interested.',
    verifyBtn: 'Confirm', pending: 'Confirmation email sent. Your intent is saved when you confirm.',
    sentHold: 'Email sent — please confirm in your inbox',
    spam: 'Didn\'t get the email? Check your spam or junk folder.',
    backHint: 'The confirmation link may open in your browser. After confirming, just come back here.',
    confirmed: 'Confirmed',
    resendHint: 'Check your spam folder first. You can resend once after 1 minute.',
    resendWait: 'Resend in {n}s',
    resendUsed: 'Already resent. Please check your inbox, or try again later.',
    resend: 'Resend verification email',
    ready: 'Email confirmed. Your intent is saved.',
    saved: 'Email verified. Profile saved. Open an event and tap I\u2019m going.',
    savedNotify: 'Saved. The organizer will be notified.',
    savedShort: 'Saved',
    noOrg: 'Saved. The organizer email was not found.',
    noRsvp: 'RSVP unavailable. Please contact the organizer.',
    sent: 'Saved. The organizer will be notified.',
    unchanged: 'Saved. The organizer will be notified.',
    fail: 'Saved. The notification failed to send.',
    failWait: 'Saved. The notification failed to send. Please try again in {n}.',
    queued: 'Saved. The organizer will be notified.',
    fill: 'Please complete city, role, and any missing fields. No need to re-verify the same email.',
    bar: 'My saved events', manage: 'Save', cancel: 'Cancel intent',
    me: 'Me', meSaved: 'Saved', meGoing: 'I\u2019m going', meAlert: 'Event updates', meEmpty: 'Nothing saved yet.', meNone: 'Nothing here yet.', meNeed: 'Add your name, city, and role first.',
    cancelAsk: 'Cancel this intent? We will not email the organizer again, and mail already sent is not recalled.',
    cancelled: 'Intent cancelled. No new email was sent to the organizer.',
    emailKept: 'Email confirmed',
    unsub: 'Unsubscribe from this event’s updates (keeps your Going / Interested)',
    date: 'Date (Beijing time, UTC+8)', close: 'Close',
    hint: 'The star saves an event. To tell the organizer, open the event and tap I\u2019m going.',
    empty: 'Tap the star on an event to save it.',
    notTicket: 'Going is not a ticket or a formal registration.'
  };
  var css = document.createElement('style');
  css.textContent = '.atm-heart svg path{d:path("' + STAR + '")}.atm-heart path{fill:none;stroke:#b8913a;stroke-width:1.6;stroke-linejoin:round}.atm-heart[aria-pressed="true"] path{fill:#b8913a;stroke:#b8913a}' +
    '.atm-heart.atm-star-off{opacity:1;cursor:pointer}.atm-heart.atm-star-off path{stroke:#b8913a;stroke-width:1.15;fill:none;opacity:.25}' +
    '.atm-heart.atm-star-wait{cursor:pointer;background:transparent}.atm-heart.atm-star-wait path{stroke:#0e6e78;fill:none;stroke-dasharray:2.2 1.4}' +
    'html.atm-p10 #atm-c1bar .p10-heart.atm-star-off{cursor:pointer!important;background:transparent!important;opacity:1!important}html.atm-p10 #atm-c1bar .p10-heart.atm-star-off path{fill:none!important;stroke:#b8913a!important;stroke-width:1.15!important;opacity:.25!important}' +
    'html.atm-p10 #atm-c1bar .p10-heart.atm-star-wait{cursor:pointer!important}html.atm-p10 #atm-c1bar .p10-heart.atm-star-wait path{fill:none!important;stroke:#0e6e78!important;stroke-dasharray:2.2 1.4}' +
    'html.atm-p10 #atm-c1bar .p10-heart,#atm-single .ev-card>.atm-heart,.atm-favfc>.atm-heart,.ah-ly .ah-heart{width:44px!important;height:44px!important;min-width:44px;min-height:44px;box-sizing:border-box}' +
    'html.atm-p10 #atm-c1bar .p10-heart svg,#atm-single .ev-card>.atm-heart svg,.atm-favfc>.atm-heart svg,.ah-ly .ah-heart svg{width:26px!important;height:26px!important}' +
    'html.atm-p10 #atm-c1bar .atm-c1-t{right:56px!important}' +
    '#atm-single .ev-card>.atm-heart path,html.atm-p10 #atm-c1bar .p10-heart path,.atm-favfc>.atm-heart path{fill:none;stroke:#0E6E78;stroke-width:1.8}' +
    '#atm-single .ev-card>.atm-heart[aria-pressed="true"] path,html.atm-p10 #atm-c1bar .p10-heart[aria-pressed="true"] path,.atm-favfc>.atm-heart[aria-pressed="true"] path{fill:#B3261E!important;stroke:#B3261E!important}' +
    '#atm-unfav-ask{position:fixed;inset:0;z-index:12000;display:flex;align-items:flex-end;justify-content:center;background:rgba(6,51,58,.55)}' +
    '#atm-unfav-ask .auf{background:#fffdf8;width:100%;max-width:420px;border-radius:16px 16px 0 0;padding:18px 16px 22px;box-sizing:border-box;color:#2a1a14}' +
    '@media(min-width:700px){#atm-unfav-ask{align-items:center}#atm-unfav-ask .auf{border-radius:16px}}' +
    '#atm-unfav-ask p{margin:0 0 14px;font:700 1.05rem/1.45 "Noto Serif SC",Georgia,serif;color:#0a4f57}' +
    '#atm-unfav-ask .auf-row{display:flex;gap:8px}#atm-unfav-ask button{flex:1;min-height:44px;border-radius:12px;font-weight:700;font-size:1rem;cursor:pointer}' +
    '#atm-unfav-ask .auf-yes{border:0;background:#0e6e78;color:#f6e3b4}#atm-unfav-ask .auf-no{border:1px solid #0e6e78;background:#fff;color:#0e6e78}' +
    '#atm-star{position:fixed;inset:0;z-index:3000;display:flex;align-items:flex-end;justify-content:center;background:rgba(6,51,58,.55)}#atm-star[hidden]{display:none}' +
    '#atm-star .asg{position:relative;background:#fffdf8;width:100%;max-width:480px;max-height:92dvh;overflow:hidden;display:flex;flex-direction:column;border-radius:16px 16px 0 0;padding:16px 16px 22px;box-sizing:border-box;color:#2a1a14}' +
    '@media(min-width:700px){#atm-star{align-items:center}#atm-star .asg{border-radius:16px;max-height:88vh}}' +
    '#atm-star h2{font:700 1.05rem Georgia,serif;color:#0a4f57;margin:0 52px 6px 0;flex:none}#atm-star .asg-body{overflow:auto;min-height:0}#atm-star p{margin:4px 0;line-height:1.4;font-size:.88rem}' +
    '#atm-star .asg-note{color:#5b5148}#atm-star .asg-req{font-size:.78rem;font-weight:700;color:#0a4f57;margin:8px 0 0}#atm-star .asg-dis{font-size:.78rem;color:#5b5148}' +
    '#atm-star .asg-grid{display:flex;flex-wrap:wrap;gap:0 8px}#atm-star .asg-grid .asg-f{flex:1 1 140px;min-width:0}#atm-star .asg{overflow-x:hidden}' +
    '#atm-star label.asg-l{display:block;font-weight:700;color:#0a4f57;margin:10px 0 4px;font-size:.84rem}' +
    '#atm-star input,#atm-star select{width:100%;box-sizing:border-box;min-height:44px;font-size:16px;padding:8px 10px;border:1px solid #ead9b8;border-radius:8px}' +
    '#atm-star .asg-opt{display:flex;gap:6px;margin:8px 0;padding:4px;background:#f3ece0;border-radius:14px}#atm-star .asg-opt button{flex:1;min-height:48px;border:0;background:transparent;color:#0a4f57;border-radius:12px;font-weight:700;font-size:.92rem;padding:4px}' +
    '#atm-star select:disabled,#atm-star input:disabled{opacity:.55;background:#f3ece0}' +
    '.atm-unfav{min-height:44px;margin:6px 0 0;padding:0 12px;border:1px solid #ead9b8;border-radius:999px;background:#fff;color:#2a1a14;font-weight:700}' +
    '#atm-star .asg-opt button[aria-pressed="true"]{background:#0e6e78;color:#f6e3b4}' +
    '#atm-star .asg-mean{margin:4px 2px 8px;color:#5b5148;font-size:.8rem;line-height:1.45}#atm-star .asg-mean:empty{display:none}' +
    '#atm-star .asg-go{min-height:48px;font-weight:700;border:0;width:100%;margin-top:10px;background:#0e6e78;color:#f6e3b4;border-radius:12px}#atm-star .asg-go[aria-busy="true"],#atm-star .asg-go:disabled{opacity:.72}' +
    '#atm-star .asg-alt{min-height:44px;font-weight:700;border:1px solid #0e6e78;width:100%;margin-top:8px;background:#fff;color:#0e6e78;border-radius:12px}#atm-star .asg-alt:disabled{opacity:.72}' +
    '#atm-star .asg-return{font-weight:700;color:#0a4f57}' +
    '#atm-star .asg-need{margin:8px 0 2px;font-size:.88rem;font-weight:700;color:#0a4f57;line-height:1.45}#atm-star .asg-need em{color:#b5654a;font-style:normal}' +
    '#atm-star .asg-star{color:#b5654a;font-weight:700;margin-left:2px}#atm-star input.asg-must{border-color:#c48a6a}' +
    '#atm-star .asg-okbox{margin:12px 0 4px;padding:14px 14px;background:#e5f4ee;border-radius:12px;color:#1b7a46;font-weight:700;line-height:1.5}#atm-star .asg-okbox p{margin:0;font-size:.92rem;color:#1b7a46;font-weight:700}' +
    '#atm-star .asg-hint{margin:10px 2px 0;color:#6b5d52;font-size:.8rem;line-height:1.45}' +
    '#atm-star .asg-tslab{margin:10px 0 4px;color:#0a4f57;font-size:.84rem;font-weight:700}' +
    '#atm-star .asg-ts{min-height:65px;margin:0 0 4px}' +
    '#atm-star .asg-x{position:absolute;top:6px;right:6px;z-index:2;width:44px;height:44px;border:0;border-radius:8px;background:transparent;font-size:28px;line-height:44px;padding:0;color:#7a6255;cursor:pointer}' +
    '#atm-star .asg-x:focus-visible{outline:2px solid #0e6e78;outline-offset:2px}' +
    '#atm-star .asg-err{color:#b5654a;min-height:1.2em}#atm-star .asg-ok{color:#0a4f57;font-weight:700}#atm-star .asg-check{display:flex;gap:8px;align-items:flex-start;margin:8px 0;font-size:.88rem}#atm-star .asg-check input{width:auto;min-height:0;margin-top:3px}#atm-star [hidden]{display:none!important}' +
    '.atm-savebar{box-sizing:border-box;display:block;width:100%;margin:0 0 8px;padding:8px 12px;border-radius:8px;font:600 13px/1.35 system-ui,-apple-system,BlinkMacSystemFont,"PingFang SC","Noto Sans SC","Helvetica Neue",sans-serif;text-align:left;pointer-events:none;-webkit-tap-highlight-color:transparent}' +
    '.atm-savebar-ok{background:#e5f4ee;color:#1b7a46}.atm-savebar-off,.atm-savebar-note{background:#f4efe6;color:#6a5e52}' +
    '.atm-savebar-fixed{position:fixed;z-index:80;left:max(12px,env(safe-area-inset-left,0px));right:max(12px,env(safe-area-inset-right,0px));width:auto;top:var(--atm-save-top,calc(env(safe-area-inset-top,0px) + 8px));margin:0}' +
    '.atm-favbar b{color:#0a4f57}' +
    '#atm-me{position:fixed;inset:0;z-index:3200;display:flex;justify-content:flex-end;background:rgba(6,51,58,.55)}#atm-me[hidden]{display:none}' +
    '#atm-me .atm-me-panel{background:#fffdf8;width:min(100%,420px);height:100%;overflow:auto;padding:12px 16px 28px;box-sizing:border-box;color:#2a1a14}' +
    '#atm-me .atm-me-hd{display:flex;align-items:center;justify-content:space-between}#atm-me .atm-me-hd b{font:700 1.2rem Georgia,serif;color:#0a4f57}#atm-me .atm-me-hd button{width:44px;height:44px;border:0;background:transparent;font-size:28px;color:#7a6255;cursor:pointer}' +
    '#atm-me h3{margin:16px 0 6px;font-size:.95rem;color:#0a4f57}#atm-me a{display:flex;align-items:center;min-height:44px;color:#0a4f57;text-decoration:none;border-bottom:1px solid #ead9b8}#atm-me .atm-me-empty{margin:0;color:#6b5d52;font-size:.88rem}' +
    '#atm-me .atm-me-alert{display:flex;align-items:center;gap:8px;min-height:44px;margin-top:16px;font-weight:700;color:#0a4f57}#atm-me .atm-me-need{margin:4px 0 0;color:#b5654a;font-size:.82rem}';
  document.head.appendChild(css);

  var mine = {}, occ = {}, favs = {}, drafts = {}, me = null, ready = false, eventsP = null, reach = {}, reachWait = {}, reachTries = {}, reachNext = {}, reachTimer = 0, reachWaiters = {}, reopen = '';
  var loginPurpose = '', loginId = '';
  var REACH_MAX = 3;
  function token() { try { return localStorage.getItem('atm_session') || ''; } catch (e) { return ''; } }
  function setToken(t) { try { if (t) localStorage.setItem('atm_session', t); } catch (e) {} }
  function takeSession() {
    var q;
    try { q = new URLSearchParams(location.search); } catch (e) { q = null; }
    var s = q ? (q.get('s') || '') : '';
    if (/^[0-9a-f]{64}$/.test(s)) {
      setToken(s);
      q.delete('s');
      var next = location.pathname + (q.toString() ? '?' + q.toString() : '') + location.hash;
      try { history.replaceState(history.state, '', next); } catch (e2) {}
      return;
    }
    if (token()) return;
    var m = (document.cookie || '').match(/(?:^|; )atm_session=([0-9a-f]{64})/);
    if (m) setToken(m[1]);
  }
  function ctxGet() { try { return JSON.parse(localStorage.getItem('atm_star_ctx') || 'null'); } catch (e) { return null; } }
  function ctxSet(o) { try { localStorage.setItem('atm_star_ctx', JSON.stringify(o)); } catch (e) {} }
  function dev() { var k = 'atm_dev_id', v = ''; try { v = localStorage.getItem(k) || ''; if (!/^[A-Za-z0-9-]{16,64}$/.test(v)) { v = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())); localStorage.setItem(k, v); } } catch (e) { v = 'going-device-web1'; } return v; }
  function api(path, body) {
    var h = { 'Content-Type': 'application/json' }; var t = token(); if (t) h.Authorization = 'Bearer ' + t;
    return fetch(API + path, { method: body ? 'POST' : 'GET', credentials: body ? 'include' : 'same-origin', headers: h, body: body ? JSON.stringify(body) : undefined }).then(function (r) { return r.json().then(function (d) { d._s = r.status; return d; }); });
  }
  function eventLists() { return [window._chinaData, window._atmMore, window._atmFull, window._atmStarEvents]; }
  function eventOf(id) {
    var ls = eventLists();
    for (var i = 0; i < ls.length; i++) { var list = ls[i]; if (!list) continue; for (var j = 0; j < list.length; j++) if (list[j] && String(list[j].id) === id) return list[j]; }
    return null;
  }
  function hasEmail(e) { var c = e && e.contacts; var raw = c && !Array.isArray(c) ? String(c.email || '').trim() : ''; return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(raw); }
  function canIntent(e, id) { if (e && hasEmail(e)) return true; if (reach[id] === true) return true; if (reach[id] === false) return false; return null; }
  function scheduleReach(ms) {
    if (reachTimer) return;
    reachTimer = setTimeout(function () { reachTimer = 0; queueReach(); }, ms);
  }
  function wakeReach(id) {
    var list = reachWaiters[id] || [];
    delete reachWaiters[id];
    list.forEach(function (fn) { fn(reach[id] === true || reach[id] === false ? reach[id] : null); });
  }
  function awaitReach(id) {
    if (reach[id] === true || reach[id] === false) return Promise.resolve(reach[id]);
    queueReach();
    return new Promise(function (resolve) {
      var done = false;
      function finish(v) { if (done) return; done = true; resolve(v); }
      (reachWaiters[id] || (reachWaiters[id] = [])).push(finish);
      setTimeout(function () { finish(reach[id] === true || reach[id] === false ? reach[id] : null); }, 8000);
    });
  }
  function noteReachFail(chunk) {
    var wait = 800;
    chunk.forEach(function (id) {
      delete reachWait[id];
      var n = reachTries[id] || 1;
      wait = Math.max(wait, 700 * Math.pow(2, Math.min(n - 1, 3)));
      reachNext[id] = Date.now() + wait;
    });
    if (chunk.some(function (id) { return (reachTries[id] || 0) < REACH_MAX; })) scheduleReach(wait);
    chunk.forEach(wakeReach);
    paint();
  }
  function queueReach() {
    var now = Date.now(), ids = [];
    document.querySelectorAll('.atm-heart').forEach(function (b) {
      if (!b.querySelector('path')) return;
      var id = idOf(b);
      if (!id || reachWait[id] || reach[id] === true || reach[id] === false) return;
      var e = eventOf(id);
      if (e && hasEmail(e)) return;
      if (!e && !ready) return;
      if ((reachTries[id] || 0) >= REACH_MAX) return;
      if (reachNext[id] && now < reachNext[id]) return;
      if (ids.indexOf(id) < 0) ids.push(id);
    });
    if (!ids.length) return;
    for (var i = 0; i < ids.length; i += 80) {
      (function (chunk) {
        chunk.forEach(function (id) { reachWait[id] = 1; reachTries[id] = (reachTries[id] || 0) + 1; });
        api('/social/going/reach?ids=' + chunk.map(encodeURIComponent).join(',')).then(function (d) {
          if (!d || d._s >= 400 || d.error || !d.reach || typeof d.reach !== 'object') { noteReachFail(chunk); return; }
          var again = false;
          chunk.forEach(function (id) {
            delete reachWait[id];
            if (!Object.prototype.hasOwnProperty.call(d.reach, id)) { again = true; reachNext[id] = Date.now() + 800; return; }
            if (d.reach[id] === true) reach[id] = true;
            else if (d.reach[id] === false) reach[id] = false;
            else { again = true; reachNext[id] = Date.now() + 800; }
          });
          if (again && chunk.some(function (id) { return reach[id] !== true && reach[id] !== false && (reachTries[id] || 0) < REACH_MAX; })) scheduleReach(800);
          chunk.forEach(wakeReach);
          paint();
        }).catch(function () { noteReachFail(chunk); });
      })(ids.slice(i, i + 80));
    }
  }
  function ensureEvents() {
    if (eventsP) return eventsP;
    eventsP = fetch('/asia/events.json?v=e216').then(function (r) { if (!r.ok) throw new Error('http'); return r.json(); }).then(function (d) { window._atmStarEvents = Array.isArray(d) ? d : (d.events || []); ready = true; paint(); }).catch(function () { ready = true; paint(); });
    return eventsP;
  }
  function idOf(b) {
    var li = b.closest && b.closest('.ev-card[data-id]');
    if (li) return li.getAttribute('data-id') || '';
    var host = b.closest && b.closest('[data-fid],[data-sid]');
    if (host && host !== b) return host.getAttribute('data-fid') || host.getAttribute('data-sid') || '';
    return b.getAttribute('data-fid') || b.getAttribute('data-sid') || '';
  }
  function shToday() {
    try { var p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); return p; } catch (e) { return new Date().toISOString().slice(0, 10); }
  }
  function shanghaiMidnight(ymd) { return Date.parse(ymd + 'T00:00:00Z') - 8 * 3600000; }
  function occurrenceEnd(ymd, time) {
    var m = String(time || '').match(/(\d{1,2}):(\d{2})\s*[–\-\u2013\u2014]\s*(\d{1,2}):(\d{2})/);
    var base = shanghaiMidnight(ymd);
    if (!m) return base + 24 * 3600000 - 1000;
    var sh = +m[1], sm = +m[2], eh = +m[3], em = +m[4], extra = 0;
    if (eh >= 24) { extra = Math.floor(eh / 24); eh %= 24; }
    if (sh > 23 || sm > 59 || eh > 23 || em > 59) return base + 24 * 3600000 - 1000;
    var start = sh * 60 + sm, end = eh * 60 + em + extra * 24 * 60;
    if (end <= start) end += 24 * 60;
    return base + end * 60000;
  }
  function datesOf(e) {
    if (!e || e.kind === 'event' || e.kind === 'featured') return [];
    var wds = e.weekdays || (e.weekday != null ? [e.weekday] : []);
    if (!wds.length) return [];
    var today = shToday(), start = new Date(Date.parse(today + 'T00:00:00Z') - 86400000), now = Date.now(), out = [];
    for (var i = 0; i < 210 && out.length < 8; i++) {
      var d = new Date(start.getTime() + i * 86400000), ymd = d.toISOString().slice(0, 10);
      if (wds.indexOf(d.getUTCDay()) < 0) continue;
      if (occurrenceEnd(ymd, e.time) <= now) continue;
      out.push(ymd);
    }
    return out;
  }
  function regular(e) { return e && e.kind !== 'event' && e.kind !== 'featured'; }
  function titleOf(e) {
    if (!e) return '';
    if (window.atmI18n && window.atmI18n.fieldText) {
      var named = window.atmI18n.fieldText(e, 'name', zh ? 'zh' : 'en');
      if (named) return named;
    }
    return (zh && (e.name_zh || e.title_zh)) || e.name || e.title || '';
  }

  var box = document.createElement('div'); box.id = 'atm-star'; box.hidden = true;
  var view = 0;
  box.innerHTML = '<div class="asg" role="dialog" aria-modal="true"><button type="button" class="asg-x" data-x aria-label="' + L.close + '">&times;</button><h2></h2><div class="asg-body"></div></div>';
  document.body.appendChild(box);
  function shut() {
    if (box.hidden) return;
    view++;
    if (resendTick) { clearInterval(resendTick); resendTick = 0; }
    box.hidden = true;
  }
  box.addEventListener('click', function (e) { if (e.target === box || (e.target.closest && e.target.closest('[data-x]'))) shut(); });
  document.addEventListener('keydown', function (e) {
    if (box.hidden || (e.key !== 'Escape' && e.key !== 'Esc')) return;
    e.preventDefault();
    shut();
  });
  function h2() { return box.querySelector('h2'); }
  function body() { return box.querySelector('.asg-body'); }
  function field(label, id, type, max, must) {
    var kind = type === 'email' ? 'email' : 'text';
    var extra = type === 'email' ? ' autocomplete="email"' : (type === 'tel' ? ' inputmode="tel" autocomplete="tel"' : '');
    var star = must ? '<span class="asg-star">*</span>' : '';
    var cls = must ? ' class="asg-must"' : '';
    return '<div class="asg-f"><label class="asg-l" for="' + id + '">' + label + star + '</label><input id="' + id + '"' + cls + ' type="' + kind + '"' + extra + ' maxlength="' + (max || 80) + '"></div>';
  }
  function last4Field(must) {
    var star = must ? '<span class="asg-star">*</span>' : '';
    var cls = must ? ' class="asg-must"' : '';
    return '<div class="asg-f"><label class="asg-l" for="asg-last4">' + L.last4 + star + '</label><input id="asg-last4"' + cls + ' type="text" inputmode="numeric" autocomplete="off" maxlength="4"></div>';
  }
  function loggedLine(intent) {
    var word = L[intent] || L.going;
    if (zh) return '已登录，已记录' + word + '。不必再等确认信。';
    return 'Signed in. ' + word + ' is saved. You don\u2019t need another confirmation email.';
  }
  function roleSelect(disabled) {
    return '<div class="asg-f"><label class="asg-l" for="asg-role">' + L.role + '</label><select id="asg-role"' + (disabled ? ' disabled' : '') + '><option value="">' + L.rolePh + '</option><option value="leader">' + L.rl + '</option><option value="follower">' + L.rf + '</option><option value="both">' + L.rb + '</option></select></div>';
  }
  function roleLabel(role) {
    if (role === 'leader') return L.rl;
    if (role === 'follower') return L.rf;
    if (role === 'both') return L.rb;
    return '';
  }
  function waitPhrase(sec) {
    var s = Math.max(1, Math.ceil(Number(sec) || 1));
    if (s >= 3600) {
      var h = Math.ceil(s / 3600);
      return zh ? (h + ' 小时') : (h === 1 ? '1 hour' : h + ' hours');
    }
    var m = Math.max(1, Math.ceil(s / 60));
    return zh ? (m + ' 分钟') : (m === 1 ? '1 minute' : m + ' minutes');
  }
  function noticeLine(d) {
    var n = d && d.notice;
    if (n === 'sent' || n === 'queued' || n === 'unchanged') return L.savedNotify;
    if (n === 'missing') return L.noOrg;
    if (n === 'failed') {
      var w = Number(d.wait) || 0;
      return w > 0 ? L.failWait.replace('{n}', waitPhrase(w)) : L.fail;
    }
    return L.savedShort;
  }
  function whenAck(fn) {
    if (window.__atmNoticeAck || document.documentElement.classList.contains('atm-notice-ack')) { fn(); return; }
    var go = document.getElementById('atm-notice-go');
    if (!go) { fn(); return; }
    go.addEventListener('click', function () { setTimeout(fn, 0); });
  }
  function readHash() {
    var h = location.hash || '';
    var m = h.match(/atm=([0-9a-f]{64})/);
    if (m) setToken(m[1]);
    var g = (h.match(/going=([a-z]+)/) || [])[1];
    if (m || g) { try { history.replaceState(history.state, '', location.pathname + location.search); } catch (e) {} }
    var card = (h.match(/card=([A-Za-z0-9_-]+)/) || [])[1];
    if (g === 'queued' || g === 'sent' || g === 'unchanged' || g === 'fail') toast(L.savedShort);
    else if (g === 'none') toast(L.saved);
    else if (g === 'ready') toast(L.ready);
    if (card) reopen = card;
    if (m) refreshMine();
  }
  var barEl = null, barTimer = 0, barHold = 0, barAnchor = null;
  function shown(el) {
    var n = el;
    while (n && n !== document.documentElement) {
      if (n.hidden) return false;
      var s = getComputedStyle(n);
      if (s.display === 'none' || s.visibility === 'hidden') return false;
      n = n.parentElement;
    }
    return !!el;
  }
  function sectionSlot(from) {
    if (!from || !from.closest) return null;
    var ly = from.closest('.ah-ly');
    if (ly && shown(ly)) {
      var lyList = ly.querySelector('.ah-list');
      if (lyList) return { parent: lyList.parentNode, before: lyList };
    }
    var home = from.closest('#atm-home');
    if (home && shown(home)) {
      var homeList = home.querySelector('.ah-list');
      if (homeList) return { parent: homeList.parentNode, before: homeList };
    }
    var block = from.closest('.china-city-block, .china-chrono');
    if (block && shown(block)) {
      var title = block.querySelector('.atm-onehead:not(.atm-oh-hide)') || block.querySelector('.china-city-head');
      if (title && shown(title)) {
        var after = title, n = title.nextElementSibling;
        if (n && (n.classList.contains('china-from-line') || n.classList.contains('atm-oh-from'))) after = n;
        return { parent: after.parentNode, before: after.nextSibling };
      }
    }
    return null;
  }
  function bannerSlot() {
    var from = barAnchor && barAnchor.isConnected ? barAnchor : null;
    var local = from ? sectionSlot(from) : null;
    if (local) return local;
    var home = document.getElementById('atm-home');
    if (home && shown(home)) {
      var list = home.querySelector('.ah-list');
      if (list) return { parent: list.parentNode, before: list };
      var note = home.querySelector('.ah-note');
      if (note) return { parent: note.parentNode, before: note.nextSibling };
      var top = home.querySelector('.ah-top');
      if (top) return { parent: top.parentNode, before: top.nextSibling };
    }
    var heads = document.querySelectorAll('.atm-onehead, .china-city-head');
    for (var i = 0; i < heads.length; i++) {
      if (!shown(heads[i]) || heads[i].classList.contains('atm-oh-hide')) continue;
      var after = heads[i], n = after.nextElementSibling;
      if (n && (n.classList.contains('china-from-line') || n.classList.contains('atm-oh-from')) && !n.classList.contains('atm-oh-hide')) after = n;
      return { parent: after.parentNode, before: after.nextSibling };
    }
    return null;
  }
  function placeBar() {
    if (!barEl || !barHold) return;
    var slot = bannerSlot();
    if (slot && slot.parent && slot.before !== barEl) {
      barEl.classList.remove('atm-savebar-fixed');
      if (barEl.parentNode !== slot.parent || barEl.nextSibling !== slot.before) slot.parent.insertBefore(barEl, slot.before);
      return;
    }
    var head = document.querySelector('.china-sticky-top');
    var below = 8;
    if (head && shown(head)) {
      var r = head.getBoundingClientRect();
      if (r.bottom > 0) below = Math.round(r.bottom) + 6;
    }
    document.documentElement.style.setProperty('--atm-save-top', below + 'px');
    barEl.classList.add('atm-savebar-fixed');
    if (barEl.parentNode !== document.body) document.body.appendChild(barEl);
  }
  function revealBar() {
    if (!barEl || !barEl.isConnected || barEl.classList.contains('atm-savebar-fixed')) return;
    var limit = 8, head = document.querySelector('.china-sticky-top'), sticky = document.querySelector('#atm-home .ah-top');
    if (head && shown(head)) { var hb = head.getBoundingClientRect().bottom; if (hb > 0) limit = hb + 4; }
    if (sticky && shown(sticky) && getComputedStyle(sticky).position === 'sticky') {
      var sb = sticky.getBoundingClientRect().bottom;
      if (sb > limit) limit = sb + 4;
    }
    var rect = barEl.getBoundingClientRect();
    if (rect.top < limit - 2 || rect.bottom > window.innerHeight - 12) window.scrollBy(0, rect.top - limit);
  }
  function toast(text, kind, anchor, sub) {
    if (anchor) barAnchor = anchor;
    kind = kind || 'ok';
    if (!barEl) {
      barEl = document.createElement('div');
      barEl.id = 'atm-savebar';
      barEl.setAttribute('role', 'status');
      barEl.setAttribute('aria-live', 'polite');
    }
    barEl.className = 'atm-savebar atm-savebar-' + (kind === 'off' || kind === 'note' ? kind : 'ok');
    barEl.textContent = '';
    var main = document.createElement('div');
    main.textContent = text;
    barEl.appendChild(main);
    var hold = 2000;
    if (sub) {
      var extra = document.createElement('div');
      extra.style.fontWeight = '500';
      extra.style.fontSize = '12px';
      extra.style.marginTop = '4px';
      extra.style.lineHeight = '1.4';
      extra.textContent = sub;
      barEl.appendChild(extra);
      hold = 4500;
    }
    barHold = Date.now() + hold;
    placeBar();
    revealBar();
    clearTimeout(barTimer);
    barTimer = setTimeout(function () {
      barHold = 0;
      if (barEl && barEl.parentNode) barEl.parentNode.removeChild(barEl);
    }, hold);
  }
  function localOcc() { try { var o = JSON.parse(localStorage.getItem('atm_occ_v1') || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } }
  function rememberAbsent(id, anchor) {
    var o = localOcc();
    if (!o[id]) o[id] = {};
    o[id][anchor || ''] = { intent: 'absent' };
    try { localStorage.setItem('atm_occ_v1', JSON.stringify(o)); } catch (e) {}
    if (!occ[id]) occ[id] = {};
    occ[id][anchor || ''] = { id: id, anchor: anchor || '', intent: 'absent', date: '' };
  }
  function forgetLocalCard(id) {
    var o = localOcc();
    delete o[id];
    try { localStorage.setItem('atm_occ_v1', JSON.stringify(o)); } catch (e) {}
  }
  var resendTick = 0;
  var refreshResend = function () {};
  var HOLD_KEY = 'atm_mail_hold_v1';
  function holds() { try { var o = JSON.parse(sessionStorage.getItem(HOLD_KEY) || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } }
  function holdKey(id, anchor, email) { return id + '|' + (anchor || '') + '|' + String(email || '').trim().toLowerCase(); }
  function getHold(id, anchor, email) { return holds()[holdKey(id, anchor, email)] || null; }
  function putHold(id, anchor, email, n, at) {
    var o = holds();
    o[holdKey(id, anchor, email)] = { n: n, at: at || Date.now() };
    try { sessionStorage.setItem(HOLD_KEY, JSON.stringify(o)); } catch (e) {}
  }
  function latestHold(id, anchor) {
    var o = holds(), best = null, email = '', mark = anchor || '';
    Object.keys(o).forEach(function (k) {
      var parts = k.split('|');
      if (parts[0] !== id || parts[1] !== mark) return;
      if (!best || (o[k].at || 0) > best.at) { best = o[k]; email = parts.slice(2).join('|'); }
    });
    return best ? { email: email, n: best.n || 0, at: best.at || 0 } : null;
  }
  function confirmedLabel(intent) {
    var word = intent === 'interested' ? L.interested : intent === 'absent' ? L.absent : L.going;
    return L.confirmed + ' · ' + word;
  }
  function showConfirmed(go, intent) {
    if (!go) return;
    go.disabled = true;
    go.dataset.busy = '';
    go.dataset.sent = '1';
    go.dataset.confirmed = '1';
    go.dataset.savedIntent = intent || 'going';
    go.setAttribute('aria-busy', 'false');
    go.textContent = confirmedLabel(intent);
    var note = go.parentNode && go.parentNode.querySelector('#asg-spam');
    if (note) note.textContent = confirmedLabel(intent);
    var mail = document.getElementById('asg-mailnote');
    if (mail) { mail.hidden = false; mail.textContent = confirmedLabel(intent); }
  }
  function holdSent(go) {
    go.disabled = true;
    go.dataset.busy = '';
    go.dataset.sent = '1';
    go.setAttribute('aria-busy', 'false');
    go.textContent = L.sentHold;
    var note = go.parentNode && go.parentNode.querySelector('#asg-spam');
    if (!note && go.parentNode) {
      note = document.createElement('p');
      note.id = 'asg-spam';
      note.className = 'asg-ok';
      go.insertAdjacentElement('afterend', note);
    }
    if (note) note.textContent = L.spam + ' ' + L.backHint;
  }
  function saveAbsent() {
    return;
  }
  function cardHasIntent(id) {
    if (!id) return false;
    if (drafts[id] && drafts[id].intent) return true;
    if (mine[id] && mine[id].intent) return true;
    var bag = occ[id];
    if (!bag) return false;
    return Object.keys(bag).some(function (k) {
      var st = bag[k];
      return !!(st && (st.intent === 'going' || st.intent === 'interested' || st.intent === 'absent'));
    });
  }
  function meanOf(intent) {
    if (intent === 'going') return L.meanGoing;
    if (intent === 'interested') return L.meanInterested;
    return '';
  }
  function open(b, opt) {
    opt = opt || {};
    var accountOnly = opt.login === 'fav' || opt.login === 'sub' || opt.login === 'me';
    var id = idOf(b); if (!id) return;
    var e = eventOf(id);
    if (!e && !accountOnly) { ensureEvents().then(function () { open(b, opt); }); return; }
    if (!accountOnly && canIntent(e, id) === false) { toast(L.noRsvp, 'off', b); return; }
    if (!accountOnly && canIntent(e, id) !== true) { awaitReach(id).then(function (v) { if (v === true) open(b, opt); else if (v === false) toast(L.noRsvp, 'off', b); }); return; }
    var dates = datesOf(e), reg = regular(e);
    var anchor0 = reg ? (dates[0] || '') : '';
    var saved = (occ[id] && occ[id][anchor0]) || null;
    var pending = drafts[id] || null;
    var draft = pending && (pending.intent === 'going' || pending.intent === 'interested' || pending.intent === 'absent')
      ? { id: id, anchor: pending.anchor || anchor0, intent: pending.intent, date: pending.intent === 'going' ? (pending.date || pending.anchor || anchor0) : '', notify: pending.intent === 'absent' ? false : pending.notify !== false, transport: pending.intent === 'going' && !!pending.transport }
      : saved
      ? { id: id, anchor: anchor0, intent: saved.intent, date: saved.intent === 'going' ? (saved.date || anchor0) : '', notify: saved.intent === 'absent' ? false : saved.notify !== false, transport: saved.intent === 'going' && !!saved.transport }
      : { id: id, anchor: anchor0, intent: 'going', date: reg ? anchor0 : '', notify: true, transport: false };
    if (opt.draft && opt.draft.id === id && (opt.draft.intent === 'going' || opt.draft.intent === 'interested' || opt.draft.intent === 'absent')) draft = opt.draft;
    draft.intent = 'going';
    ctxSet(draft);
    h2().textContent = titleOf(e) || L.title;
    var verified = !!token();
    var phase = opt.phase || (verified ? 'in' : 'start');
    if (verified && phase === 'start') phase = 'in';
    var kept = opt.kept || {};
    var needProfile = phase === 'in' && (!me || !me.city || !me.role || !me.name);
    var showFilled = phase === 'in' && !needProfile && !!opt.resume;
    var action = phase === 'register' ? L.send : (phase === 'start' ? L.gate : L.submit);
    var html = '';
    if (phase === 'start' || phase === 'register' || phase === 'saved' || needProfile) html += '<p class="asg-note">' + L.explain + '</p>';
    if (opt.login) loginPurpose = opt.login;
    if (accountOnly) h2().textContent = L.cont;
    if (!accountOnly) {
      html += '<div class="asg-opt">';
      html += '<button type="button" data-intent="going" aria-pressed="true">' + L.going + '</button>';
      html += '</div><p class="asg-mean" id="asg-mean">' + esc(meanOf('going')) + '</p>';
    }
    html += '<div id="asg-rest"' + (draft.intent ? '' : ' hidden') + '>';
    if (reg && dates.length) {
      html += '<label class="asg-l" for="asg-date">' + L.date + '</label><select id="asg-date"' + (draft.intent === 'going' ? '' : ' disabled') + '>';
      dates.forEach(function (d) { html += '<option value="' + d + '"' + ((draft.date || anchor0) === d ? ' selected' : '') + '>' + d + '</option>'; });
      html += '</select>';
    }
    html += '<label class="asg-check"><input type="checkbox" id="asg-notify"' + (draft.intent !== 'absent' && draft.notify !== false ? ' checked' : '') + (draft.intent === 'absent' ? ' disabled' : '') + '>' + L.notify + '</label>';
    if (reg) html += '<label class="asg-check"><input type="checkbox" id="asg-dir"' + (draft.intent === 'going' && draft.transport ? ' checked' : '') + (draft.intent === 'going' ? '' : ' disabled') + '>' + L.transport + '</label>';
    if (phase === 'saved') {
      html += '<div class="asg-okbox"><p>' + (opt.line || loggedLine(draft.intent)) + '</p></div>';
    } else if (phase === 'start') {
      html += '<p class="asg-need" id="asg-mailnote">' + L.gateHelp + '</p>';
      html += field(L.email, 'asg-email', 'email', 80, true);
      html += last4Field(true);
    } else if (phase === 'register') {
      html += '<p class="asg-need" id="asg-mailnote">' + L.regHelp + '</p>';
      html += field(L.email, 'asg-email', 'email', 80, true);
      html += last4Field(true);
      html += '<p class="asg-req">' + L.req + '</p><div id="asg-profile">';
      html += '<div class="asg-grid">' + field(L.name, 'asg-name') + roleSelect(false) + field(L.city, 'asg-city') + '</div></div>';
      html += '<label class="asg-check" id="asg-promolab"><input type="checkbox" id="asg-promo" checked>' + L.promo + '</label>';
      if (loginPurpose === 'fav' || loginPurpose === 'sub' || loginPurpose === 'me') html += '<div class="asg-ts" id="asg-ts"></div>';
    } else if (needProfile) {
      html += '<div id="asg-profile"><p class="asg-note">' + L.fill + '</p>';
      if (me && me.email) html += '<p class="asg-note">' + L.emailKept + (zh ? '：' : ': ') + esc(me.email) + '</p>';
      html += '<p class="asg-req">' + L.req + '</p><div class="asg-grid">' + field(L.name, 'asg-name') + field(L.city, 'asg-city') + roleSelect(false) + '</div></div>';
    } else if (showFilled) {
      html += '<div id="asg-profile"><p class="asg-note">' + L.emailKept + (zh ? '：' : ': ') + esc(me.email || '') + '</p>';
      html += '<div class="asg-grid">' + field(L.name, 'asg-name') + field(L.city, 'asg-city') + roleSelect(true) + '</div></div>';
    }
    html += '<p class="asg-err" id="asg-err"></p><p class="asg-ok" id="asg-ok"></p>';
    if (phase !== 'saved') html += '<button type="button" class="asg-go" id="asg-go" data-phase="' + phase + '" aria-busy="false">' + action + '</button>';
    if (phase === 'in') html += '<p class="asg-hint">' + L.optin + '</p>';
    html += '</div>';
    if (cardHasIntent(id)) html += '<button type="button" class="asg-alt" id="asg-clear">' + esc(L.cancel) + '</button>';
    view++;
    body().innerHTML = html;
    if (me && phase === 'in') { var n = body().querySelector('#asg-name'); if (n && me.name) n.value = me.name; var c = body().querySelector('#asg-city'); if (c && me.city) c.value = me.city; var rr = body().querySelector('#asg-role'); if (rr && me.role) rr.value = me.role; }
    var keptEmail = body().querySelector('#asg-email');
    if (keptEmail && kept.email) keptEmail.value = kept.email;
    var keptTail = body().querySelector('#asg-last4');
    if (keptTail && kept.last4) keptTail.value = kept.last4;
    var dateEl = body().querySelector('#asg-date');
    var dirEl0 = body().querySelector('#asg-dir');
    function lockFields() {
      var going = draft.intent === 'going';
      var away = draft.intent === 'absent';
      if (dateEl) dateEl.disabled = !going;
      if (dirEl0) { dirEl0.disabled = !going; if (!going) dirEl0.checked = false; }
      var note = body().querySelector('#asg-notify');
      if (note) {
        note.disabled = away;
        if (away) note.checked = false;
        else if (!note.disabled) note.checked = draft.notify !== false;
      }
      var email = body().querySelector('#asg-email');
      if (email && phase === 'in') email.disabled = away;
      ['#asg-name', '#asg-city', '#asg-role'].forEach(function (sel) {
        var el = body().querySelector(sel);
        if (el) el.disabled = (away && phase !== 'register') || showFilled;
      });
      var promo = body().querySelector('#asg-promo');
      if (promo) {
        if (away) {
          if (!promo.disabled) promo.dataset.was = promo.checked ? '1' : '0';
          promo.disabled = true;
          promo.checked = false;
        } else {
          promo.disabled = false;
          if (promo.dataset.was) { promo.checked = promo.dataset.was === '1'; promo.dataset.was = ''; }
        }
      }
      var mailNote = body().querySelector('#asg-mailnote');
      var promoLab = body().querySelector('#asg-promolab');
      var profile = body().querySelector('#asg-profile');
      if (mailNote) mailNote.hidden = away && phase === 'in';
      if (promoLab) promoLab.hidden = away && phase !== 'register';
      if (profile) profile.hidden = away && phase !== 'register';
    }
    body().querySelectorAll('[data-intent]').forEach(function (btn) { btn.onclick = function () {
      var next = btn.getAttribute('data-intent');
      if (next !== 'going' && next !== 'interested') return;
      var wasAway = draft.intent === 'absent';
      if (draft.intent === 'going' && dateEl) { draft.anchor = dateEl.value; draft.date = dateEl.value; }
      draft.intent = next;
      if (!draft.anchor) draft.anchor = anchor0;
      if (draft.intent === 'going') {
        if (dateEl && !dateEl.value) dateEl.value = anchor0;
        if (dateEl) { draft.date = dateEl.value; draft.anchor = dateEl.value; }
      } else draft.date = '';
      if (draft.intent === 'absent') draft.notify = false;
      else if (wasAway) draft.notify = true;
      var rest = body().querySelector('#asg-rest'); if (rest) rest.hidden = false;
      lockFields();
      var goNow = body().querySelector('#asg-go');
      if (goNow && goNow.dataset.confirmed === '1') showConfirmed(goNow, goNow.dataset.savedIntent || draft.intent);
      else if (goNow && goNow.dataset.sent === '1') holdSent(goNow);
      else paintResend();
      ctxSet(draft);
      var mean = body().querySelector('#asg-mean');
      if (mean) mean.textContent = meanOf(draft.intent);
      body().querySelectorAll('[data-intent]').forEach(function (x) { x.setAttribute('aria-pressed', x === btn ? 'true' : 'false'); });
    }; });
    if (dateEl) dateEl.onchange = function () { if (draft.intent !== 'going') return; draft.date = dateEl.value; draft.anchor = dateEl.value; ctxSet(draft); paintResend(); };
    var noteEl = body().querySelector('#asg-notify'); if (noteEl) noteEl.onchange = function () { draft.notify = noteEl.checked; ctxSet(draft); };
    var dirEl = body().querySelector('#asg-dir'); if (dirEl) dirEl.onchange = function () { draft.transport = dirEl.checked; ctxSet(draft); };
    var emailEl = body().querySelector('#asg-email');
    if (emailEl) emailEl.oninput = function () { paintResend(); };
    var known = latestHold(id, draft.anchor || '');
    if (emailEl && known && known.email && !emailEl.value) emailEl.value = known.email;
    var go = body().querySelector('#asg-go');
    function paintResend() {
      if (resendTick) { clearInterval(resendTick); resendTick = 0; }
      var btn = body().querySelector('#asg-go');
      if (!btn || btn.dataset.sent === '1') return;
      if (phase !== 'register') {
        var idleNote = body().querySelector('#asg-resend');
        if (idleNote) idleNote.hidden = true;
        btn.disabled = false;
        btn.textContent = phase === 'start' ? L.gate : L.submit;
        return;
      }
      if (draft.intent === 'absent') {
        var awayNote = body().querySelector('#asg-resend');
        if (awayNote) awayNote.hidden = true;
        btn.disabled = false;
        btn.textContent = L.send;
        return;
      }
      var mail = body().querySelector('#asg-email');
      var addr = mail ? mail.value.trim().toLowerCase() : '';
      var row = addr ? getHold(id, draft.anchor || '', addr) : null;
      var hint = body().querySelector('#asg-resend');
      if (!row) {
        if (hint) hint.hidden = true;
        btn.disabled = false;
        btn.textContent = L.send;
        return;
      }
      if (!hint) {
        hint = document.createElement('p');
        hint.id = 'asg-resend';
        hint.className = 'asg-note';
        btn.parentNode.insertBefore(hint, btn);
      }
      hint.hidden = false;
      if ((row.n || 0) >= 2) {
        hint.textContent = L.resendUsed;
        btn.disabled = true;
        btn.textContent = L.resendUsed;
        return;
      }
      hint.textContent = L.resendHint;
      var left = Math.ceil((60000 - (Date.now() - row.at)) / 1000);
      if (left > 0) {
        btn.disabled = true;
        btn.textContent = L.resendWait.replace('{n}', String(left));
        resendTick = setInterval(function () {
          if (!btn.isConnected || box.hidden || btn.dataset.sent === '1') { if (resendTick) { clearInterval(resendTick); resendTick = 0; } return; }
          var n = Math.ceil((60000 - (Date.now() - row.at)) / 1000);
          if (n > 0) btn.textContent = L.resendWait.replace('{n}', String(n));
          else { clearInterval(resendTick); resendTick = 0; btn.disabled = false; btn.textContent = L.send; }
        }, 250);
      } else {
        btn.disabled = false;
        btn.textContent = L.send;
      }
    }
    if (go) go.onclick = function () {
      if (phase === 'start') gate(e, draft, go);
      else submit(e, draft, go, phase);
    };
    var clearBtn = body().querySelector('#asg-clear');
    if (clearBtn) clearBtn.onclick = function () {
      if (clearBtn.dataset.sure !== '1') {
        clearBtn.dataset.sure = '1';
        var note = body().querySelector('#asg-err');
        if (note) note.textContent = L.cancelAsk;
        return;
      }
      function dropped() {
        forgetLocalCard(id);
        delete occ[id];
        delete mine[id];
        delete drafts[id];
        toast(L.cancelled);
        shut();
        paint();
        paintBar();
      }
      if (!token()) { dropped(); return; }
      clearBtn.disabled = true;
      api('/social/going/cancel', { id: id, explicit: 1 }).then(function (d) {
        if (d && (d.ok || d.cancelled === false)) { dropped(); refreshMine(); return; }
        toast(L.later, 'note');
        clearBtn.disabled = false;
      }).catch(function () { toast(L.later, 'note'); clearBtn.disabled = false; });
    };
    refreshResend = paintResend;
    lockFields();
    paintResend();
    if (document.getElementById('asg-ts')) mountStarTs();
    box.hidden = false;
  }
  function mountStarTs() {
    var el = document.getElementById('asg-ts');
    if (!el || el.dataset.ts) return;
    var key = window.ATM_TS_KEY || '';
    function render() {
      if (!window.turnstile || !el.isConnected || el.dataset.ts) return;
      el.dataset.ts = '1';
      window.turnstile.render(el, { sitekey: key, action: 'profile' });
    }
    function start(k) {
      key = k || key;
      if (!key) return;
      if (window.turnstile) render();
      else {
        var s = document.createElement('script');
        s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        s.async = true;
        s.onload = render;
        document.head.appendChild(s);
      }
    }
    if (key) start(key);
    else fetch(API + '/social/going/config').then(function (r) { return r.json(); }).then(function (d) {
      if (d && d.sitekey) { window.ATM_TS_KEY = d.sitekey; start(d.sitekey); }
    }).catch(function () {});
  }
  function gate(ev, draft, btn) {
    var err = body().querySelector('#asg-err');
    if (!err || !btn || btn.disabled) return;
    var em = String((body().querySelector('#asg-email') || {}).value || '').trim();
    var tail = String((body().querySelector('#asg-last4') || {}).value || '').replace(/\D/g, '');
    err.textContent = '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) { err.textContent = L.needEmail; return; }
    if (!/^\d{4}$/.test(tail)) { err.textContent = L.needLast4; return; }
    var dateEl = body().querySelector('#asg-date');
    var going = draft.intent === 'going';
    var note = body().querySelector('#asg-notify');
    var dir = body().querySelector('#asg-dir');
    if (going && dateEl) { draft.date = dateEl.value; draft.anchor = dateEl.value; }
    var account = loginPurpose === 'fav' || loginPurpose === 'sub' || loginPurpose === 'me';
    var payload = { email: em, last4: tail, lang: zh ? 'zh' : 'en', ret: location.href.split('#')[0], dev: dev() };
    if (!account) {
      payload.id = ev.id;
      payload.intent = 'going';
      payload.explicit = 1;
      payload.disclose = 1;
      payload.notify = note && note.checked ? 1 : 0;
      payload.transport = going && dir && dir.checked ? 1 : 0;
      payload.anchor = draft.anchor || '';
      payload.date = going ? (draft.date || '') : '';
    }
    btn.disabled = true;
    api('/social/going/phone', payload).then(function (d) {
      if (d && d.register) {
        open(stub(ev && ev.id || loginId), { phase: 'register', kept: { email: em, last4: tail }, draft: draft, login: loginPurpose || '' });
        return;
      }
      if (d && d.session && d.ok && !d.error) {
        setToken(d.session);
        var purpose = loginPurpose, pid = loginId || (ev && ev.id);
        if (account) { afterSession(purpose, pid); return; }
        mergeLocalFavs().then(function () { return refreshMine(); }).then(function () {
          open(stub(ev && ev.id), { phase: 'saved', line: loggedLine('going'), draft: draft });
        });
        return;
      }
      if (d && d.session) setToken(d.session);
      err.textContent = d && d.error === 'rate_limited' ? L.later : (d && d.error === 'phone_login' ? L.badLogin : L.again);
      btn.disabled = false;
    }).catch(function () { err.textContent = L.net; btn.disabled = false; });
  }
  function submit(e, draft, go, phase) {
    var err = body().querySelector('#asg-err'), ok = body().querySelector('#asg-ok');
    if (!err || !ok) return;
    if (go.dataset.busy === '1' || go.dataset.sent === '1') return;
    err.textContent = ''; ok.textContent = '';
    if (draft.intent !== 'going') { err.textContent = L.needIntent; return; }
    if (phase === 'register') {
      var nm = (body().querySelector('#asg-name') || {}).value || '';
      var em = (body().querySelector('#asg-email') || {}).value || '';
      var cy = (body().querySelector('#asg-city') || {}).value || '';
      var rl = (body().querySelector('#asg-role') || {}).value || '';
      var tail = String((body().querySelector('#asg-last4') || {}).value || '').replace(/\D/g, '');
      if (!String(nm).trim()) { err.textContent = L.needName; return; }
      if (!String(em).trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(em).trim())) { err.textContent = L.needEmail; return; }
      if (!/^\d{4}$/.test(tail)) { err.textContent = L.needLast4; return; }
      if (!String(cy).trim()) { err.textContent = L.needCity; return; }
      if (rl !== 'leader' && rl !== 'follower' && rl !== 'both') { err.textContent = L.needRole; return; }
    }
    go.dataset.busy = '1';
    var dateEl = body().querySelector('#asg-date');
    var going = draft.intent === 'going';
    var promo = body().querySelector('#asg-promo');
    var payload = { id: e.id, intent: draft.intent, explicit: 1, disclose: 1, notify: body().querySelector('#asg-notify').checked ? 1 : 0, transport: (going && body().querySelector('#asg-dir') && body().querySelector('#asg-dir').checked) ? 1 : 0, anchor: draft.anchor || '', date: going ? ((dateEl && dateEl.value) || draft.date || '') : '', alert: promo && promo.checked ? 1 : 0, lang: zh ? 'zh' : 'en', ret: location.href.split('#')[0], dev: dev() };
    ['name', 'email', 'city'].forEach(function (k) { var el = body().querySelector('#asg-' + k); if (el && String(el.value || '').trim()) payload[k] = el.value.trim(); });
    var tailEl = body().querySelector('#asg-last4');
    if (tailEl && String(tailEl.value || '').replace(/\D/g, '')) payload.last4 = String(tailEl.value).replace(/\D/g, '');
    var role = body().querySelector('#asg-role'); if (role) payload.role = role.value;
    ctxSet({ id: e.id, intent: draft.intent, date: payload.date, notify: payload.notify !== 0, transport: !!payload.transport });
    go.disabled = true;
    go.setAttribute('aria-busy', 'true');
    var seen = view;
    var settled = false;
    function sameView() { return seen === view && go.isConnected && !box.hidden; }
    function finish(stay) {
      if (settled) return;
      settled = true;
      if (!sameView()) return;
      if (!stay) { shut(); return; }
      go.disabled = false;
      go.dataset.busy = '';
      go.setAttribute('aria-busy', 'false');
    }
    function unlock() {
      go.disabled = false;
      go.dataset.busy = '';
      go.setAttribute('aria-busy', 'false');
    }
    var accountReg = (loginPurpose === 'fav' || loginPurpose === 'sub' || loginPurpose === 'me') && phase === 'register';
    var postUrl = accountReg ? '/social/profile' : '/social/going';
    if (accountReg) {
      payload = { name: payload.name, email: payload.email, city: payload.city, role: payload.role, lang: payload.lang, alert: loginPurpose === 'sub' ? 1 : 0, ret: payload.ret, last4: payload.last4, dev: payload.dev, website: '' };
      var tsEl = body().querySelector('#asg-ts [name="cf-turnstile-response"]');
      payload.ts = tsEl ? String(tsEl.value || '').trim() : '';
      if (!payload.ts) { err.textContent = L.tsWait; go.disabled = false; go.dataset.busy = ''; go.setAttribute('aria-busy', 'false'); return; }
    }
    api(postUrl, payload).then(function (d) {
      var here = sameView();
      var savedOk = !!(d && d.ok && !d.confirm && !d.need_profile && !d.error);
      if (d && d.ok && !d.confirm) refreshMine();
      if (d && d.confirm) {
        var prev = getHold(e.id, payload.anchor, payload.email) || { n: 0 };
        putHold(e.id, payload.anchor, payload.email, (prev.n || 0) + 1, Date.now());
      }
      if (!here) return;
      if (d && d.confirm) {
        holdSent(go);
        var recorded = payload.intent;
        if (d.nonce && window.ATM_CLAIM) window.ATM_CLAIM.watch(d.nonce, function () {
          var purpose = loginPurpose, pid = loginId || (e && e.id);
          if (purpose === 'fav' || purpose === 'sub' || purpose === 'me') { afterSession(purpose, pid); return; }
          showConfirmed(go, recorded);
          refreshMine();
        });
        return;
      }
      if (d && (d.error === 'resend_wait' || d.error === 'resend_used')) {
        if (d.error === 'resend_used') putHold(e.id, payload.anchor, payload.email, 2, Date.now());
        else putHold(e.id, payload.anchor, payload.email, Math.max(1, ((getHold(e.id, payload.anchor, payload.email) || {}).n) || 1), Date.now() - Math.max(0, 60000 - (Number(d.wait) || 1) * 1000));
        if (err.isConnected) err.textContent = '';
        go.dataset.busy = '';
        go.setAttribute('aria-busy', 'false');
        settled = true;
        refreshResend();
        return;
      }
      if (err.isConnected) {
        if (d.need_profile || d.error === 'need_city' || d.error === 'need_role' || d.error === 'need_name') err.textContent = L.fill;
        else if (d.error === 'no_organizer') err.textContent = L.grey;
        else if (d.error === 'rate_limited') err.textContent = L.limited;
        else if (!d.ok) err.textContent = L.again;
      }
      if (savedOk) {
        var line = noticeLine(d);
        toast(line, d.notice === 'failed' || d.notice === 'missing' ? 'note' : 'ok', document.querySelector('.atm-heart[data-fid="' + e.id + '"], .atm-heart[data-sid="' + e.id + '"]'));
        unlock();
        finish(false);
        return;
      }
      finish(true);
    }).catch(function () { if (sameView() && err.isConnected) err.textContent = L.net; if (sameView()) finish(true); });
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var painting = false;
  function paint() {
    if (painting) return;
    painting = true;
    try { paintHearts(); placeBar(); } finally { painting = false; }
  }
  function paintHearts() {
    document.querySelectorAll('.atm-heart').forEach(function (b) {
      if (!b.querySelector('path')) return;
      var path = b.querySelector('path'); if (path && path.getAttribute('d') !== STAR) path.setAttribute('d', STAR);
      var id = idOf(b); if (!id) return;
      var on = !!token() && !!favs[id];
      var lab = on ? L.unfav : L.save;
      b.classList.remove('atm-star-off', 'atm-star-wait');
      b.setAttribute('aria-disabled', 'false');
      b.setAttribute('aria-busy', 'false');
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.title = lab;
      b.setAttribute('aria-label', lab);
    });
    document.querySelectorAll('.atm-star-n').forEach(function (n) { n.remove(); });
  }
  function nextAnchor(e) { if (!e || !regular(e)) return ''; var ds = datesOf(e); return ds[0] || ''; }
  function occNow(id, e) { var bag = occ[id]; if (!bag) return null; return bag[nextAnchor(e)] || null; }
  function showSolid(id, e) { if (favs[id]) return true; var st = occNow(id, e); return !!(st && (st.intent === 'going' || st.intent === 'interested')); }
  function mergeLocalOcc() {
    var o = localOcc();
    Object.keys(o).forEach(function (id) {
      var bag = o[id] || {};
      if (!occ[id]) occ[id] = {};
      Object.keys(bag).forEach(function (anchor) {
        if (!occ[id][anchor]) occ[id][anchor] = { id: id, anchor: anchor, intent: bag[anchor].intent, date: '' };
      });
    });
  }
  function loadRemoved() {
    try { var a = JSON.parse(localStorage.getItem('atm_fav_removed_v1') || '[]'); return Array.isArray(a) ? a.filter(function (id) { return typeof id === 'string'; }) : []; } catch (e) { return []; }
  }
  function saveRemoved(a) {
    try { localStorage.setItem('atm_fav_removed_v1', JSON.stringify(a)); } catch (e) {}
  }
  function isRemoved(id) { return loadRemoved().indexOf(id) >= 0; }
  function markRemoved(id) {
    var a = loadRemoved();
    if (a.indexOf(id) < 0) { a.push(id); saveRemoved(a); }
  }
  function unmarkRemoved(id) {
    saveRemoved(loadRemoved().filter(function (x) { return x !== id; }));
  }
  function seriesFavIds(id) {
    var out = [id], seen = {};
    seen[id] = 1;
    eventLists().forEach(function (list) {
      if (!list) return;
      for (var i = 0; i < list.length; i++) {
        var e = list[i];
        if (e && e.theme_of === id && e.id && !seen[e.id]) { seen[e.id] = 1; out.push(e.id); }
      }
    });
    return out;
  }
  function loadLocalFavs() {
    favs = {};
    try {
      var rem = loadRemoved();
      var a = JSON.parse(localStorage.getItem('atm_fav_v1') || '[]');
      if (!Array.isArray(a)) a = [];
      a = a.filter(function (id) { return typeof id === 'string' && rem.indexOf(id) < 0; });
      a.forEach(function (id) { favs[id] = 1; });
      localStorage.setItem('atm_fav_v1', JSON.stringify(a));
    } catch (e) {}
  }
  function addLocalFav(id) {
    if (!id) return;
    unmarkRemoved(id);
    favs[id] = 1;
    try { var a = JSON.parse(localStorage.getItem('atm_fav_v1') || '[]'); if (!Array.isArray(a)) a = []; if (a.indexOf(id) < 0) a.unshift(id); localStorage.setItem('atm_fav_v1', JSON.stringify(a)); } catch (e) {}
    if (window.ATM_FAV && window.ATM_FAV.refresh) window.ATM_FAV.refresh();
  }
  function dropLocalOne(id) {
    markRemoved(id);
    delete favs[id]; delete occ[id]; delete mine[id];
    forgetLocalCard(id);
    try { var a = JSON.parse(localStorage.getItem('atm_fav_v1') || '[]'); localStorage.setItem('atm_fav_v1', JSON.stringify((a || []).filter(function (x) { return x !== id; }))); } catch (e) {}
  }
  function dropLocalFav(id, skipPaint) {
    seriesFavIds(id).forEach(dropLocalOne);
    if (!skipPaint) {
      paint(); paintBar();
      if (window.ATM_FAV && window.ATM_FAV.refresh) window.ATM_FAV.refresh();
    }
  }
  function removeLocalFav(id) {
    if (!id) return;
    seriesFavIds(id).forEach(function (one) {
      markRemoved(one);
      delete favs[one];
      try {
        var a = JSON.parse(localStorage.getItem('atm_fav_v1') || '[]');
        localStorage.setItem('atm_fav_v1', JSON.stringify((a || []).filter(function (x) { return x !== one; })));
      } catch (e) {}
    });
    paint();
    paintBar();
    if (window.ATM_FAV && window.ATM_FAV.refresh) window.ATM_FAV.refresh();
  }
  var TEACH = 'atm_star_taught_v1';
  function localFavIds() {
    try { var a = JSON.parse(localStorage.getItem('atm_fav_v1') || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  }
  function mergeLocalFavs() {
    var flag = '';
    try { flag = localStorage.getItem('atm_fav_merged_v1') || ''; } catch (e) {}
    if (flag === '1') return Promise.resolve();
    var ids = localFavIds().filter(function (id) { return /^[A-Za-z0-9_-]{1,64}$/.test(id); }).slice(0, 100);
    if (!ids.length) { try { localStorage.setItem('atm_fav_merged_v1', '1'); } catch (e) {} return Promise.resolve(); }
    return api('/social/going/fav', { ids: ids, explicit: 1 }).then(function (d) {
      if (d && d.ok) { try { localStorage.setItem('atm_fav_merged_v1', '1'); } catch (e) {} }
    });
  }
  function applyServerFavs(list) {
    favs = {};
    var ids = [];
    (list || []).forEach(function (id) { if (typeof id === 'string' && ids.indexOf(id) < 0) { favs[id] = 1; ids.push(id); } });
    try { localStorage.setItem('atm_fav_v1', JSON.stringify(ids)); } catch (e) {}
  }
  function accountFav(id, anchor) {
    if (!id || !token()) return;
    var off = !!favs[id];
    api(off ? '/social/going/unfav' : '/social/going/fav', { id: id, explicit: 1 }).then(function (d) {
      if (!(d && d.ok)) { toast(L.later, 'note', anchor); return; }
      if (off) { removeLocalFav(id); toast(L.toastOff, 'ok', anchor); return; }
      addLocalFav(id);
      var teach = false;
      try { if (localStorage.getItem(TEACH) !== '1') { localStorage.setItem(TEACH, '1'); teach = true; } } catch (e) {}
      paint(); paintBar();
      toast(L.toastOn, 'ok', anchor, teach ? L.teach : '');
    }).catch(function () { toast(L.net, 'note', anchor); });
  }
  function afterSession(purpose, id) {
    loginPurpose = '';
    mergeLocalFavs().then(function () { return refreshMine(); }).then(function () {
      if (window.ATM_MENU && window.ATM_MENU.paintMe) window.ATM_MENU.paintMe();
      if (purpose === 'fav') { shut(); accountFav(id); }
      else if (purpose === 'sub') { shut(); var t = document.getElementById('tsub-open'); if (t) t.click(); }
      else if (purpose === 'me') { shut(); openMe(); }
      else shut();
    });
  }
  function askLogin(purpose, id) {
    loginPurpose = purpose || '';
    loginId = id || '';
    if (token()) return Promise.resolve(true);
    open(stub(id || 'login'), { intent: 'going', login: loginPurpose });
    return Promise.resolve(false);
  }
  function openedFavStar(b, id) {
    if (!b || !id || !favs[id]) return false;
    if (b.classList.contains('p10-heart')) return true;
    return !!(b.closest && b.closest('#atm-single'));
  }
  var askEl = null;
  function closeAsk() {
    if (askEl) { askEl.remove(); askEl = null; }
    document.removeEventListener('keydown', onAskKey, true);
  }
  function onAskKey(e) {
    if (e.key !== 'Escape' || !askEl) return;
    e.preventDefault();
    closeAsk();
  }
  function confirmUnfav(id) {
    if (!id) return;
    closeAsk();
    var box = document.createElement('div');
    box.id = 'atm-unfav-ask';
    box.innerHTML = '<div class="auf" role="dialog" aria-modal="true" aria-labelledby="atm-unfav-q"><p id="atm-unfav-q">' + esc(L.unfavAsk) + '</p><div class="auf-row"><button type="button" class="auf-yes">' + esc(L.unfav) + '</button><button type="button" class="auf-no">' + esc(L.unfavKeep) + '</button></div></div>';
    askEl = box;
    document.body.appendChild(box);
    var no = box.querySelector('.auf-no');
    if (no) no.focus();
    box.addEventListener('click', function (ev) {
      if (ev.target === box || (ev.target.closest && ev.target.closest('.auf-no'))) { closeAsk(); return; }
      if (ev.target.closest && ev.target.closest('.auf-yes')) { closeAsk(); requestUnfav(id); }
    });
    document.addEventListener('keydown', onAskKey, true);
  }
  function requestUnfav(id) {
    removeLocalFav(id);
    toast(L.toastOff);
  }
  function savedText(n) { return zh ? ('☆ 已收藏 ' + n + ' 个活动') : ('☆ ' + n + ' saved event' + (n === 1 ? '' : 's')); }
  function favCount() { return Object.keys(favs).length; }
  function syncSaved() {
    var t = savedText(favCount());
    document.querySelectorAll('[data-atm-saved]').forEach(function (el) { if (el.textContent !== t) el.textContent = t; });
    if (window.ATM_HOME && typeof window.ATM_HOME.render === 'function') {
      try { window.ATM_HOME.render(); } catch (e) {}
    }
  }
  function paintBar() {
    var bar = document.querySelector('.atm-favbar'); if (!bar) { syncSaved(); return false; }
    var grid = document.querySelector('.atm-favgrid');
    var items = Object.keys(favs);
    var n = items.length;
    bar.classList.toggle('atm-on', n > 0);
    bar.innerHTML = '<b>' + L.bar + '</b><span class="atm-hint" data-atm-saved="1">' + savedText(n) + '</span>';
    syncSaved();
    if (!token() || !n) { if (grid) { grid.hidden = true; grid.innerHTML = ''; } return true; }
    if (grid) {
      grid.hidden = false; grid.innerHTML = '';
      items.forEach(function (id) {
        var e = eventOf(id), a = document.createElement('a');
        a.className = 'tw-fc atm-favfc'; a.href = location.pathname + '?card=' + encodeURIComponent(id); a.setAttribute('data-fid', id);
        var name = titleOf(e) || id;
        var meta = zh ? '已收藏' : 'Saved';
        a.innerHTML = '<span class="tw-fc-body"><strong>' + esc(name) + '</strong><span class="tw-fc-meta">' + esc(meta) + '</span></span>';
        var btn = document.createElement('span'); btn.className = 'atm-heart'; btn.setAttribute('role', 'button'); btn.tabIndex = 0; btn.setAttribute('aria-pressed', favs[id] ? 'true' : 'false'); btn.title = favs[id] ? L.unfav : L.save; btn.setAttribute('aria-label', favs[id] ? L.unfav : L.save); btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + STAR + '"/></svg>';
        var ux = document.createElement('button'); ux.type = 'button'; ux.className = 'atm-unfav'; ux.setAttribute('data-unfav', id); ux.textContent = L.unfav;
        a.appendChild(btn); a.appendChild(ux); grid.appendChild(a);
      });
    }
    return true;
  }
  function refreshMine() {
    var back = resumeId || reopen;
    resumeId = '';
    reopen = '';
    if (!token()) { me = null; mine = {}; occ = {}; drafts = {}; favs = {}; mergeLocalOcc(); paint(); paintBar(); if (window.ATM_MENU && window.ATM_MENU.paintMe) window.ATM_MENU.paintMe(); return Promise.resolve(); }
    return mergeLocalFavs().then(function () { return api('/social/going/mine'); }).then(function (d) {
      if (d._s === 401) {
        try { localStorage.removeItem('atm_session'); localStorage.removeItem('atm_fav_v1'); localStorage.removeItem('atm_fav_merged_v1'); } catch (e) {}
        me = null; mine = {}; occ = {}; drafts = {}; favs = {};
      }
      else {
        me = { email: d.email, name: d.name, city: d.city, role: d.role, sitewide: !!d.sitewide };
        mine = {}; occ = {}; drafts = {};
        (d.items || []).forEach(function (it) { mine[it.id] = it; if (!occ[it.id]) occ[it.id] = {}; occ[it.id][it.anchor || ''] = it; });
        (d.drafts || []).forEach(function (it) { drafts[it.id] = it; });
        applyServerFavs(d.favs || []);
        mergeLocalOcc();
      }
      if (window.ATM_MENU && window.ATM_MENU.paintMe) window.ATM_MENU.paintMe();
      paint(); paintBar();
      if (back) whenAck(function () { openId(back, { resume: true }); });
    }).catch(function () {});
  }
  var resumeId = '';
  function openId(id, opt) {
    var b = document.querySelector('[data-fid="' + id + '"], [data-sid="' + id + '"]');
    if (!b) { b = document.createElement('button'); b.setAttribute('data-fid', id); }
    open(b, opt);
  }
  function stub(id) {
    var b = document.querySelector('.atm-heart[data-fid="' + id + '"], .atm-heart[data-sid="' + id + '"], [data-fid="' + id + '"]');
    if (b) return b;
    b = document.createElement('button');
    b.setAttribute('data-fid', id);
    return b;
  }
  function openIntent(id) {
    if (!id) return;
    var b = stub(id);
    var e = eventOf(id);
    if (e && canIntent(e, id) === false) { toast(L.noRsvp, 'off', b); return; }
    if (!token()) { loginPurpose = 'going'; loginId = id; open(b, { intent: 'going' }); return; }
    loginPurpose = '';
    open(b, { intent: 'going' });
  }
  function paintGoing(el, id) {
    if (!el || !id) return;
    el.hidden = true;
    el.textContent = '';
    fetch(API + '/social/going/counts?ids=' + encodeURIComponent(id), { credentials: 'omit' }).then(function (r) { return r.json(); }).then(function (d) {
      var n = d && d.going && typeof d.going[id] === 'number' ? d.going[id] : 0;
      if (!n) { el.hidden = true; el.textContent = ''; return; }
      el.hidden = false;
      el.textContent = zh ? ('要去 ' + n) : (n + ' going');
    }).catch(function () { el.hidden = true; });
  }
  function openMe() {
    if (!token()) { askLogin('me'); return; }
    var box = document.getElementById('atm-me');
    if (!box) {
      box = document.createElement('div');
      box.id = 'atm-me';
      document.body.appendChild(box);
    }
    var saved = Object.keys(favs);
    var going = [];
    Object.keys(occ).forEach(function (id) {
      var bag = occ[id] || {};
      Object.keys(bag).forEach(function (k) { if (bag[k] && bag[k].intent === 'going') going.push(bag[k]); });
    });
    function rows(list, empty) {
      if (!list.length) return '<p class="atm-me-empty">' + empty + '</p>';
      return list.map(function (item) {
        var id = item.id || item;
        var e = eventOf(id);
        return '<a href="' + location.pathname + '?card=' + encodeURIComponent(id) + '">' + esc(titleOf(e) || id) + '</a>';
      }).join('');
    }
    var alertOn = !!(me && me.sitewide);
    box.innerHTML = '<div class="atm-me-bg" data-x></div><div class="atm-me-panel" role="dialog" aria-modal="true" aria-label="' + esc(L.me) + '"><div class="atm-me-hd"><b>' + esc(L.me) + '</b><button type="button" data-x aria-label="' + esc(L.close) + '">×</button></div>' +
      '<h3>' + esc(L.meSaved) + '</h3>' + rows(saved, L.meEmpty) +
      '<h3>' + esc(L.meGoing) + '</h3>' + rows(going, L.meNone) +
      '<label class="atm-me-alert"><input type="checkbox" id="atm-me-alert"' + (alertOn ? ' checked' : '') + '>' + esc(L.meAlert) + '</label><p class="atm-me-need" id="atm-me-need"></p></div>';
    box.hidden = false;
    box.onclick = function (ev) { if (ev.target === box || (ev.target.closest && ev.target.closest('[data-x]'))) box.hidden = true; };
    var toggle = box.querySelector('#atm-me-alert');
    if (toggle) toggle.onchange = function () {
      var need = box.querySelector('#atm-me-need');
      if (!me || !me.name || !me.city || !me.role) { if (need) need.textContent = L.meNeed; toggle.checked = alertOn; return; }
      api('/social/profile', { name: me.name, email: me.email, city: me.city, role: me.role, alert: toggle.checked ? 1 : 0, lang: zh ? 'zh' : 'en', ret: location.href.split('#')[0] }).then(function (d) {
        if (d && d.ok) { me.sitewide = !!toggle.checked; if (need) need.textContent = ''; }
        else { toggle.checked = !toggle.checked; if (need) need.textContent = L.later; }
      }).catch(function () { toggle.checked = !toggle.checked; });
    };
  }
  window.ATM_STAR = {
    refresh: function () { return refreshMine(); },
    take: function (b) {
      if (!b || (b.closest && b.closest('[data-unfav]'))) return false;
      var id = idOf(b);
      if (!id) return false;
      if (!token()) { askLogin('fav', id); return true; }
      accountFav(id, b);
      return true;
    },
    askLogin: askLogin,
    openMe: openMe,
    openIntent: openIntent,
    paintGoing: paintGoing,
    paintBar: paintBar, paint: paint, listed: function () { return Object.keys(favs).length; }
  };
  document.addEventListener('click', function (e) {
    var u = e.target.closest && e.target.closest('[data-unfav]');
    if (!u) return;
    e.preventDefault(); e.stopPropagation();
    var id = u.getAttribute('data-unfav');
    if (!id) return;
    if (!token()) { askLogin('fav', id); return; }
    accountFav(id, u);
  }, true);
  document.addEventListener('atm-more', function () { paint(); });
  (function () {
    var q;
    try { q = new URLSearchParams(location.search); } catch (e) { return; }
    if (q.get('intent') === 'resume') {
      var card = q.get('card') || '';
      if (/^[A-Za-z0-9_-]{1,64}$/.test(card)) resumeId = card;
    }
  })();
  takeSession();
  readHash();
  ensureEvents();
  loadLocalFavs();
  refreshMine();
  var mo = new MutationObserver(function () { if (!painting) paint(); });
  mo.observe(document.documentElement, { childList: true, subtree: true });
})();

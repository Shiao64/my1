/* ATM visual unification, plan A (approved by Shiao 2026-11-15), TEST version.
   ?ui=2 turns it on for this device (remembered), ?ui=0 turns it off.
   One palette (Argentine light blue + navy, sun gold only as decoration), all sans-serif,
   sizes 12/14/16/18/22, 44px tap targets, same look on the home page and the event page.
   Plan: project doc ATM-视觉统一方案.md */
(function () {
  var D = document, R = D.documentElement, on = false;
  try {
    if (/[?&]ui=2\b/.test(location.search)) localStorage.setItem('atm_ui2', '1');
    if (/[?&]ui=0\b/.test(location.search)) localStorage.removeItem('atm_ui2');
    on = localStorage.getItem('atm_ui2') === '1';
  } catch (e) {}
  if (!on) return;
  R.classList.add('atm-ui2');

  var U = 'html.atm-ui2';
  var SANS = '-apple-system,"PingFang SC","HarmonyOS Sans SC","MiSans","Noto Sans SC","Source Han Sans SC","Microsoft YaHei",system-ui,sans-serif';
  var NAVY = '#0B2440', TEXT2 = '#4A5D73', ACT = '#2A6FA8', LINK = '#1F5A8A', BRAND = '#74ACDF', TINT = '#EAF3FB', LINE = '#BCD8EF', CTRL = '#7FA6C9', PAGE = '#FAFCFF', GOLD = '#F6B40E', BROWN = '#85340A', SCRIM = 'rgba(11,36,64,.55)', SHADOW = '0 2px 6px rgba(11,36,64,.10)';
  var css = [
    /* page + type */
    U + '{background:' + PAGE + '!important}',
    U + ' body.china-page{background:' + PAGE + '!important;color:' + NAVY + '}',
    U + ' body.china-page,' + U + ' body.china-page *{font-family:' + SANS + '!important}',
    U + ' body.china-page :focus-visible{outline:2px solid ' + ACT + '!important;outline-offset:2px!important}',
    U + ' #atm-notice,' + U + ' #atm-star{background:' + SCRIM + '!important}',

    /* home */
    U + ' #atm-home{color:' + TEXT2 + '}',
    U + ' #atm-home .ah-wd{font-size:18px!important;font-weight:700!important;color:' + NAVY + '!important}',
    U + ' #atm-home .ah-uph b{font-size:18px!important;font-weight:700!important;color:' + NAVY + '!important}',
    U + ' #atm-home .ah-upall{font-size:14px!important;min-height:44px;color:' + LINK + '!important}',
    U + ' #atm-home .ah-uc{color:' + NAVY + '}',
    U + ' #atm-home .ah-card{border:1px solid ' + LINE + '!important;box-shadow:' + SHADOW + '!important;background:#fff!important;color:' + TEXT2 + '!important}',
    U + ' #atm-home .ah-tx,' + U + ' #atm-home .ah-tx span,' + U + ' #atm-home .ah-dj{color:' + TEXT2 + '!important;font-size:14px!important}',
    U + ' #atm-home .ah-tx b{color:' + NAVY + '!important;font-size:16px!important;font-weight:700!important}',
    U + ' #atm-home .ah-noev{color:' + TEXT2 + '!important;font-size:14px!important}',
    U + ' #atm-home .ah-kind,' + U + ' #atm-home .ah-ctag,' + U + ' #atm-home .ah-prev,' + U + ' #atm-home .ah-day i,' + U + ' #atm-home .v2-car{font-size:12px!important}',
    U + ' #atm-home .ah-prev{background:rgba(11,36,64,.8)!important;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    U + ' #atm-home .ah-rn,' + U + ' #atm-home .ah-mv{border-color:' + CTRL + '!important;color:' + LINK + '!important;min-height:44px}',
    U + ' #atm-home .ah-rn:disabled,' + U + ' #atm-home .ah-rn[aria-disabled=true]{color:#9AA8B6!important;border-color:#D5DEE7!important}',
    U + ' #atm-home .ah-day,' + U + ' #atm-home .ah-md{border-color:' + CTRL + '!important}',
    U + ' #atm-home .v2-c{border-color:' + CTRL + ';min-height:36px}',
    U + ' #atm-home .v2-c::before{content:"";position:absolute;left:-2px;right:-2px;top:-5px;bottom:-5px}',
    U + ' #atm-home .v2-tl button{min-height:44px}',
    U + ' #atm-home .v2-tl button[aria-selected=true]{border-bottom-color:' + ACT + '!important}',
    U + ' #atm-home .ah-thx{background:' + TINT + '}',

    /* event page */
    U + ' #atm-c1bar{background:' + BRAND + '!important;box-shadow:inset 0 -3px 0 ' + GOLD + '!important;color:' + NAVY + '!important;border:0!important}',
    U + ' #atm-c1bar .atm-c1-back,' + U + ' #atm-c1bar button{color:' + NAVY + '!important;min-height:44px}',
    U + ' #atm-c1bar .atm-c1-t{color:' + NAVY + '!important;font-size:16px!important;font-weight:700!important}',
    U + ' #atm-single{padding-bottom:120px}',
    U + ' #atm-single .b-card{background:#fff!important;border:1px solid ' + LINE + '!important;box-shadow:' + SHADOW + '!important}',
    U + ' #atm-single .b-label,' + U + ' #atm-single .atm-mk{color:' + BROWN + '!important;font-size:14px!important;font-weight:700!important}',
    U + ' #atm-single .atm-mk i{background:' + BROWN + '!important}',
    U + ' #atm-single .ev-name,' + U + ' #atm-single .b-name{font-size:22px!important;font-weight:700!important;line-height:1.3!important;color:' + NAVY + '!important;letter-spacing:0!important}',
    U + ' #atm-single .b-meta,' + U + ' #atm-single .b-m,' + U + ' #atm-single .b-v{color:' + NAVY + '!important;font-size:14px!important}',
    U + ' #atm-single .b-l,' + U + ' #atm-single .b-row b{color:' + TEXT2 + '!important;font-size:12px!important;font-weight:700!important}',
    U + ' #atm-single .b-in,' + U + ' #atm-single .b-row,' + U + ' #atm-single .b-row span,' + U + ' #atm-single .ev-line{color:' + NAVY + '!important;font-size:14px!important}',
    U + ' #atm-single .atm-note-t{color:' + NAVY + '!important;font-size:16px!important;line-height:1.6!important}',
    U + ' #atm-single a{color:' + LINK + '}',
    U + ' #atm-single .b-more summary{background:' + TINT + '!important;color:' + LINK + '!important;font-size:14px!important;font-weight:700!important;min-height:44px}',
    U + ' #atm-single .atm-det{color:' + LINK + '!important;border-color:' + ACT + '!important;background:#fff!important;font-size:16px!important;font-weight:700!important;min-height:44px}',
    U + ' #atm-intentbar{background:#fff!important;border-top:3px solid ' + BRAND + '!important;box-shadow:0 -2px 10px rgba(11,36,64,.12)!important}',
    U + ' #atm-intentbar button{color:' + LINK + '!important;border:1.5px solid ' + ACT + '!important;background:#fff!important;font-size:16px!important;font-weight:700!important;min-height:46px;border-radius:23px!important}',
    U + ' #atm-intentbar button[aria-pressed=true]{background:' + ACT + '!important;color:#fff!important}',
    U + ' #atm-intentbar .aib-n{color:' + TEXT2 + '!important;font-size:12px!important}',

    /* dialogs + menu */
    U + ' #atm-star h2,' + U + ' #tsub-modal h2,' + U + ' #tsub-t{color:' + NAVY + '!important}',
    U + ' #atm-star .asg-opt{background:' + TINT + '!important}',
    U + ' #atm-star .asg-opt button{color:' + LINK + '!important;border-color:' + CTRL + '!important}',
    U + ' #atm-star .asg-opt button[aria-pressed="true"]{background:' + ACT + '!important;color:#fff!important;border-color:' + ACT + '!important}',
    U + ' #atm-star .asg-go,' + U + ' .tsub-go{background:' + ACT + '!important;color:#fff!important}',
    U + ' #tsub-modal .tsub-need{color:' + LINK + '!important}',
    U + ' #tsub-modal .tsub-desc{color:' + NAVY + '!important}',
    U + ' #tsub-modal input,' + U + ' #atm-star input{border-color:' + CTRL + '!important}',
    U + ' #atm-menu .atm-mi{color:' + NAVY + '!important}',
    U + ' #atm-menu .atm-mg{color:' + TEXT2 + '!important}',
    U + ' #atm-menu .atm-seg .on{color:' + NAVY + '!important}',
    U + ' #atm-notice button{background:' + ACT + '!important;color:#fff!important}'
  ].join('');

  function put() {
    var s = D.getElementById('atm-ui2-css');
    if (!s) { s = D.createElement('style'); s.id = 'atm-ui2-css'; s.textContent = css; }
    (D.body || D.head || R).appendChild(s); /* keep it last so it wins over styles injected earlier */
  }
  put();
  D.addEventListener('DOMContentLoaded', put);
  window.addEventListener('load', put);

  /* a poster that fails to load shows a calm tint instead of a broken-image icon */
  D.addEventListener('error', function (e) {
    var t = e.target;
    if (t && t.tagName === 'IMG' && t.classList && t.classList.contains('ah-th')) {
      t.style.visibility = 'hidden';
      if (t.parentNode && t.parentNode.classList) t.parentNode.classList.add('ah-thx');
    }
  }, true);
})();

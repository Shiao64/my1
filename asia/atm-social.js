/* Asia Tango Map: 👍 likes under a single event card (?card=ID), on the map and on DJ/organizer pages.
   Likes: no login, one per device (localStorage id + server dedupe), tap again to un-like. No daily limit.
   API: /social/likes and /social/like on the subscribe Worker. */
(function () {
  var R = document.documentElement, zh = /^zh/i.test(R.getAttribute('data-asia-lang') || document.body.getAttribute('data-lang') || R.lang || '');
  var API = (window.ATM_SOCIAL_API || 'https://api.tangoweekend.org') + '/social';
  var cardId = ''; try { cardId = new URLSearchParams(location.search).get('card') || ''; } catch (e) {}
  var pm = location.pathname.match(/^\/(?:zh\/|en\/)?(organizer|dj)\/([a-z0-9-]{1,48})\/?(?:index\.html)?$/i);
  if (pm && document.querySelector('.dj-main')) cardId = (pm[1].toLowerCase() === 'dj' ? 'dj:' : 'org:') + pm[2].toLowerCase();
  if (!/^(?:(?:org|dj):)?[A-Za-z0-9_-]{1,64}$/.test(cardId)) return;
  var likeLabel = zh ? '赞' : 'Like';
  function dev() { var k = 'atm_dev_id', v = ''; try { v = localStorage.getItem(k) || ''; if (!/^[A-Za-z0-9-]{16,64}$/.test(v)) { v = (crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2))); localStorage.setItem(k, v); } } catch (e) { v = v || 'anon-' + Date.now().toString(36) + '0000000000'; } return v; }
  function api(path, body) {
    var o = { method: body ? 'POST' : 'GET', headers: {} };
    if (body) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(body); }
    return fetch(API + path, o).then(function (r) { return r.json().then(function (d) { d._s = r.status; return d; }); });
  }
  var css = '#atm-soc{max-width:560px;margin:6px auto 14px;padding:0 12px;box-sizing:border-box;font-family:inherit;color:#2a1a14}' +
    '#atm-soc .as-bar{display:flex;align-items:center;gap:4px;padding:2px 0;border-top:1px solid #ead9b8}' +
    '#atm-soc .as-btn{display:inline-flex;align-items:center;gap:4px;background:none;border:0;border-radius:6px;padding:4px 8px;font-size:.82rem;font-weight:600;color:#7a6255;cursor:pointer}' +
    '#atm-soc .as-btn:hover{background:#f3ece0}#atm-soc .as-like[aria-pressed="true"]{color:#0e6e78}#atm-soc .as-like[aria-pressed="true"] .as-ic{filter:none}' +
    '#atm-soc .as-ic{font-size:.95rem;line-height:1;filter:grayscale(1)}#atm-soc .as-n{font-variant-numeric:tabular-nums;font-weight:500}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  var box = document.createElement('section'); box.id = 'atm-soc'; box.setAttribute('data-card', cardId);
  box.innerHTML = '<div class="as-bar"><button type="button" class="as-btn as-like" aria-pressed="false"><span class="as-ic">👍</span><span class="as-l">' + likeLabel + '</span><span class="as-n" data-n="0"></span></button></div>';
  var placed = false;
  function place() {
    if (placed) return true;
    var single = document.getElementById('atm-single'), anchor = single && single.querySelector('ul.china-list');
    if (anchor && anchor.querySelector('.ev-card')) { anchor.parentNode.insertBefore(box, anchor.nextSibling); placed = true; }
    else if (pm && document.querySelector('.dj-main')) { var mm = document.querySelector('.dj-main'); mm.insertBefore(box, mm.querySelector('section') || null); placed = true; }
    if (placed) init(); return placed;
  }
  var likeB = box.querySelector('.as-like'), nEl = likeB.querySelector('.as-n');
  function setLike(n, on) { nEl.textContent = n > 0 ? n : ''; likeB.setAttribute('aria-pressed', on ? 'true' : 'false'); }
  function refreshLike() { api('/likes?ids=' + encodeURIComponent(cardId) + '&dev=' + encodeURIComponent(dev())).then(function (d) { setLike((d.counts || {})[cardId] || 0, (d.mine || []).indexOf(cardId) >= 0); }).catch(function () {}); }
  function init() {
    likeB.onclick = function () {
      var on = likeB.getAttribute('aria-pressed') !== 'true', n = +(nEl.textContent || 0);
      setLike(n + (on ? 1 : -1), on);
      api('/like', { id: cardId, dev: dev() }).then(function (d) { if (d.id) setLike(d.n, d.liked); else setLike(n, !on); }).catch(function () { setLike(n, !on); });
    };
    refreshLike();
  }
  if (!place()) { var mo = new MutationObserver(function () { if (place()) mo.disconnect(); }); mo.observe(document.documentElement, { childList: true, subtree: true }); setTimeout(function () { mo.disconnect(); }, 20000); }
})();

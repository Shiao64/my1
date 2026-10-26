/* Asia Tango Map: simple 3-step how-to card above the search form (preview). Dismiss remembered in localStorage; ?intro=1 forces. */
(function () {
  var KEY = 'atmHowtoOk';
  function run() {
    var form = document.querySelector('.atm-form');
    if (!form || document.querySelector('.atm-howto')) return;
    var force = /[?&]intro=1/.test(location.search);
    try { if (!force && localStorage.getItem(KEY)) return; } catch (e) {}
    var zh = (document.documentElement.lang || '').toLowerCase().indexOf('zh') === 0;
    var steps = zh
      ? ['选「大型活动」或「常规活动」<small>（常规要选城市）</small>', '选开始日期<small>（默认今天）</small>', '点「搜索」']
      : ['Pick <b>Event</b> or <b>Regular</b><small> (Regular: choose a city)</small>', 'Pick a start date<small> (today by default)</small>', 'Tap <b>Search</b>'];
    var css = '.atm-howto{position:relative;margin:0 0 12px;padding:12px 14px 10px;border:2px solid #e8c06a;border-radius:14px;background:#fff8e6;color:#0a4f57;font-size:15px;line-height:1.35;box-shadow:0 2px 8px rgba(0,0,0,.08)}' +
      '.atm-howto h3{margin:0 0 8px!important;font-size:16px!important;color:#0a4f57!important;font-weight:800}' +
      '.atm-howto ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}' +
      '.atm-howto li{display:flex;align-items:center;gap:10px;background:#fff;border:1px solid #f0dca8;border-radius:10px;padding:8px 10px;font-weight:700}' +
      '.atm-howto li i{flex:0 0 28px;height:28px;border-radius:50%;background:#0e6e78;color:#fff;font:800 15px/28px sans-serif;text-align:center;font-style:normal}' +
      '.atm-howto li small{font-weight:500;color:#5d7a7e;font-size:13px}' +
      '.atm-howto .atm-hn{margin:8px 2px 0;font-size:12.5px;color:#7a8a8c}' +
      '.atm-howto .atm-hx{position:absolute;top:8px;right:8px;border:0;background:#0e6e78;color:#fff;border-radius:999px;padding:5px 12px;font-size:13px;font-weight:700;cursor:pointer}' +
      '@media(min-width:700px){.atm-howto{max-width:860px;margin:0 auto 14px}.atm-howto ol{flex-direction:row}.atm-howto li{flex:1}}';
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var c = document.createElement('div'); c.className = 'atm-howto'; c.setAttribute('role', 'note');
    c.innerHTML = '<button type="button" class="atm-hx">× ' + (zh ? '我知道了' : 'Got it') + '</button><h3>' + (zh ? '3步找到探戈活动' : 'Find tango in 3 steps') + '</h3><ol>' +
      steps.map(function (s, i) { return '<li><i>' + (i + 1) + '</i><span>' + s + '</span></li>'; }).join('') + '</ol>' +
      '<p class="atm-hn">' + (zh ? '可加选：过期或日期未定的活动' : 'Optional: also include past or TBA events') + '</p>';
    form.parentNode.insertBefore(c, form);
    c.querySelector('.atm-hx').addEventListener('click', function () { try { localStorage.setItem(KEY, '1'); } catch (e) {} c.remove(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();

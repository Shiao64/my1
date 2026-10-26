/* Asia Tango Map: simple 3-step how-to card above the search form (preview). Got it = this visit (sessionStorage), with Don't show again ticked = permanent (localStorage); ?intro=1 forces. */
(function () {
  var KEY = 'atmHowtoOk';
  function run() {
    var form = document.querySelector('.atm-form');
    if (!form || document.querySelector('.atm-howto')) return;
    var force = /[?&]intro=1/.test(location.search);
    try { if (!force && (localStorage.getItem(KEY) || sessionStorage.getItem(KEY))) return; } catch (e) {}
    var zh = (document.documentElement.lang || '').toLowerCase().indexOf('zh') === 0;
    var steps = zh
      ? ['选「大型活动」或「常规活动」<small>（常规要选城市）</small>', '可选日期<small>（默认今天）</small>', '点「搜索」']
      : ['Pick <b>Event</b> or <b>Regular</b><small> (Regular: choose a city)</small>', 'Date is optional<small> (today by default)</small>', 'Tap <b>Search</b>'];
    var css = '.atm-howto{position:relative;margin:0 0 12px;padding:12px 14px 10px;border:2px solid #e8c06a;border-radius:14px;background:#fff8e6;color:#0a4f57;font-size:15px;line-height:1.35;box-shadow:0 2px 8px rgba(0,0,0,.08)}' +
      '.atm-howto h3{margin:0 0 8px!important;font-size:16px!important;color:#0a4f57!important;font-weight:800}' +
      '.atm-howto ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}' +
      '.atm-howto li:nth-child(1){align-self:flex-start}.atm-howto li:nth-child(2){align-self:center}.atm-howto li:nth-child(3){align-self:flex-end}.atm-howto li{max-width:80%;display:flex;align-items:center;gap:10px;background:#fff;border:1px solid #f0dca8;border-radius:10px;padding:8px 10px;font-weight:700}' +
      '.atm-howto li i{flex:0 0 28px;height:28px;border-radius:50%;background:#0e6e78;color:#fff;font:800 15px/28px sans-serif;text-align:center;font-style:normal}' +
      '.atm-howto li small{font-weight:500;color:#5d7a7e;font-size:13px}' +
      '.atm-howto .atm-hn{margin:8px 2px 0;font-size:12.5px;color:#7a8a8c}' +
      '.atm-hhd{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px;margin:0 0 8px}.atm-hhd h3{margin:0!important}.atm-hbt{display:flex;align-items:center;gap:8px;margin-left:auto}.atm-howto .atm-hns{display:flex;align-items:center;gap:4px;padding:4px 2px;font-size:12.5px;color:#4d6366;cursor:pointer;margin:0}.atm-howto .atm-hns input{width:15px;height:15px;margin:0;accent-color:#0e5a5e;cursor:pointer}.atm-howto .atm-hx{border:0;background:#0e6e78;color:#fff;border-radius:999px;padding:5px 12px;font-size:13px;font-weight:700;cursor:pointer}' +
      '.atm-howto{z-index:9992}.atm-hdim{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9990}.atm-hsvg{position:absolute;left:0;top:0;pointer-events:none;z-index:9993;overflow:visible}' +
      '.atm-hx.atm-pulse{animation:atmP .7s ease-in-out 3}@keyframes atmP{0%,100%{box-shadow:0 0 0 0 rgba(255,214,102,0)}50%{box-shadow:0 0 0 8px rgba(255,214,102,.9);transform:scale(1.08)}}' +
      '@media(min-width:700px){.atm-howto{max-width:860px;margin:0 auto 14px}.atm-howto ol{flex-direction:row}.atm-howto li{flex:1}}';
    var COL = ['#d93a3a', '#e8821e', '#2e9e4f'];
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var c = document.createElement('div'); c.className = 'atm-howto'; c.setAttribute('role', 'note');
    c.innerHTML = '<div class="atm-hhd"><h3>' + (zh ? '3步找到探戈活动' : 'Find tango in 3 steps') + '</h3><span class="atm-hbt"><label class="atm-hns"><input type="checkbox">' + (zh ? '不再显示' : "Don't show again") + '</label><button type="button" class="atm-hx">× ' + (zh ? '我知道了' : 'Got it') + '</button></span></div><ol>' +
      steps.map(function (s, i) { return '<li><i style="background:' + COL[i] + '">' + (i + 1) + '</i><span>' + s + '</span></li>'; }).join('') + '</ol>' +
      '<p class="atm-hn">' + (zh ? '可加选：过期或日期未定的活动' : 'Optional: also include past or TBA events') + '</p>';
    form.parentNode.insertBefore(c, form);
    var dim = document.createElement('div'); dim.className = 'atm-hdim'; document.body.appendChild(dim);
    var bx = c.querySelector('.atm-hx'), svg = null;
    dim.addEventListener('click', function () { bx.classList.remove('atm-pulse'); void bx.offsetWidth; bx.classList.add('atm-pulse'); });
    function R_(e) { var r = e.getBoundingClientRect(); return { l: r.left + scrollX, r: r.right + scrollX, t: r.top + scrollY, b: r.bottom + scrollY, cx: r.left + scrollX + r.width / 2, cy: r.top + scrollY + r.height / 2 }; }
    function draw() {
      if (svg) svg.remove();
      try {
        var li = c.querySelectorAll('li'), C = R_(c), a = R_(li[0]), b = R_(li[1]), d = R_(li[2]);
        var dt = R_(document.getElementById('china-from')), sb = R_(document.getElementById('china-search'));
        ev = R_(document.querySelector('.atm-row-ev label')); var rg = R_(document.querySelector('.atm-row-reg label')), nt = document.querySelector('.atm-ev-note'), nr = nt ? R_(nt) : null;
        var x1 = (a.l + C.l) / 2, x2 = Math.round(Math.min(b.cx, d.l - 12)), x3 = (d.r + C.r) / 2, gp = '';
        [c.querySelector('.atm-hn'), nt, document.getElementById('china-city')].forEach(function (e) { if (!e) return; var q = R_(e); if (x2 > q.l - 3 && x2 < q.r + 3 && q.t > b.b) gp += 'V' + (q.t - 3) + 'M' + x2 + ' ' + (q.b + 3); });
        var gl = Math.min(ev.l, rg.l) - 5, gt = ev.t - 4, gr = Math.max(ev.r, rg.r) + 5, gb = rg.b + 4;
        var G = '<rect x="' + gl + '" y="' + gt + '" width="' + (gr - gl) + '" height="' + (gb - gt) + '" rx="12" fill="none" stroke="#ff3b3b" stroke-width="2.5" stroke-dasharray="7 4"/>';
        var P = ['M' + a.l + ' ' + a.cy + 'H' + x1 + 'V' + rg.cy + 'H' + (gl - 1) + 'M' + x1 + ' ' + ev.cy + 'H' + (gl - 1),
                 'M' + x2 + ' ' + b.b + gp + (x2 >= dt.l && x2 <= dt.r ? 'V' + (dt.t - 1) : 'V' + dt.cy + 'H' + (dt.r + 2)),
                 'M' + d.r + ' ' + d.cy + 'H' + x3 + 'V' + sb.cy + 'H' + (sb.r + 2)];
        var H = document.documentElement.scrollHeight, W = document.documentElement.scrollWidth, m = '', p = ''; p += G;
        COL.forEach(function (col, i) {
          m += '<marker id="atmA' + i + '" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="' + col + '"/></marker>';
          p += '<path d="' + P[i] + '" fill="none" stroke="' + col + '" stroke-width="3" stroke-linejoin="round"/>';
        });
        document.body.insertAdjacentHTML('beforeend', '<svg class="atm-hsvg" width="' + W + '" height="' + H + '" aria-hidden="true"><defs>' + m + '</defs>' + p + '</svg>');
        svg = document.body.lastElementChild;
      } catch (e) {}
    }
    draw(); addEventListener('resize', draw); setTimeout(draw, 400);
    function close(perm) { try { (perm ? localStorage : sessionStorage).setItem(KEY, '1'); } catch (e) {} c.remove(); dim.remove(); if (svg) svg.remove(); removeEventListener('resize', draw); }
    bx.addEventListener('click', function () { close(c.querySelector('.atm-hns input').checked); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();

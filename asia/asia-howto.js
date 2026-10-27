/* Asia Tango Map: simple 3-step how-to card above the search form. Got it = this visit (sessionStorage), with Don't show again ticked = permanent (localStorage); ?intro=1 forces. */
(function () {
  var KEY = 'atmHowtoOk';
  function run() {
    var form = document.querySelector('.atm-form');
    if (!form || document.querySelector('.atm-howto')) return;
    var force = /[?&]intro=1/.test(location.search);
    try { if (!force && (localStorage.getItem(KEY) || sessionStorage.getItem(KEY))) return; } catch (e) {}
    var zh = (document.documentElement.lang || '').toLowerCase().indexOf('zh') === 0;
    var steps = zh
      ? ['特色活动：活动按时间排序<br>常规活动：列出城市每周活动', '可选日期<small>（默认今天）</small>', '点「搜索」']
      : ['Featured: sorted by time<br>Regular: weekly schedule', 'Date is optional<small> (today by default)</small>', 'Tap <b>Search</b>'];
    var css = '.atm-howto{position:relative;margin:0 0 12px;padding:12px 14px 10px;border:2px solid #e8c06a;border-radius:14px;background:#fff8e6;color:#0a4f57;font-size:15px;line-height:1.35;box-shadow:0 2px 8px rgba(0,0,0,.08)}' +
      '.atm-howto h3{margin:0 0 8px!important;font-size:16px!important;color:#0a4f57!important;font-weight:800}' +
      '.atm-howto ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}' +
      '.atm-howto li:nth-child(1){align-self:flex-start}.atm-howto li:nth-child(2){align-self:center}.atm-howto li:nth-child(3){align-self:flex-end}.atm-howto li{max-width:80%;display:flex;align-items:center;gap:10px;background:#fff;border:1px solid #f0dca8;border-radius:10px;padding:8px 10px;font-weight:700}' +
      '.atm-howto li i{flex:0 0 28px;height:28px;border-radius:50%;background:#0e6e78;color:#fff;font:800 15px/28px sans-serif;text-align:center;font-style:normal}' +
      '.atm-howto li small{font-weight:500;color:#5d7a7e;font-size:13px}' +
      '.atm-howto .atm-hn{margin:8px 2px 0;font-size:12.5px;color:#7a8a8c}' +
      '.atm-hhd{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px;margin:0 0 8px}.atm-hhd h3{margin:0!important}.atm-hbt{display:flex;align-items:center;gap:8px;margin-left:auto}.atm-howto .atm-hns{display:flex;align-items:center;gap:4px;padding:4px 2px;font-size:12.5px;color:#4d6366;cursor:pointer;margin:0}.atm-howto .atm-hns input{width:15px;height:15px;margin:0;accent-color:#0e5a5e;cursor:pointer}.atm-howto .atm-hx{border:0;background:#0e6e78;color:#fff;border-radius:999px;padding:5px 12px;font-size:13px;font-weight:700;cursor:pointer}' +
      '.atm-howto{z-index:9992}.atm-hdim{position:absolute;left:0;top:0;background:rgba(0,0,0,.8);z-index:9990}.atm-hblk{position:fixed;inset:0;z-index:9991;background:transparent}.atm-hsvg{position:absolute;left:0;top:0;pointer-events:none;z-index:9993;overflow:visible}' +
      '.atm-hx.atm-pulse{animation:atmP .7s ease-in-out 3}@keyframes atmP{0%,100%{box-shadow:0 0 0 0 rgba(255,214,102,0)}50%{box-shadow:0 0 0 8px rgba(255,214,102,.9);transform:scale(1.08)}}' +
      '@keyframes atmFl{0%,22%{transform:scale(1.3);filter:brightness(1.3);box-shadow:0 0 0 6px rgba(255,255,255,.8)}25%,100%{transform:none;filter:none}}.atm-fl{animation:atmFl 4s infinite}.atm-sub{opacity:.4!important;filter:grayscale(1)}.atm-hnb{position:absolute;z-index:9994;pointer-events:none;background:#fff;border:1px solid #e8c77a;border-radius:8px;padding:2px 8px;font-size:12.5px;color:#7a8a8c;white-space:nowrap}.atm-h2t{position:absolute;z-index:9994;pointer-events:none;background:#fff;border:2px solid #e8821e;border-radius:8px;padding:2px 8px;font-weight:700;font-size:14px;color:#0a4f57;white-space:nowrap}.atm-h3{position:absolute;z-index:9994;pointer-events:none}.atm-h3 i{display:block;width:30px;height:30px;border-radius:50%;border:2px solid #fff;color:#fff;font:800 16px/26px sans-serif;text-align:center;font-style:normal;box-shadow:0 1px 4px rgba(0,0,0,.35)}' +
      '@media(min-width:700px){.atm-howto{max-width:860px;margin:0 auto 14px}.atm-howto ol{flex-direction:row}.atm-howto li{flex:1}}';
    var COL = ['#d93a3a', '#e8821e', '#2e9e4f'];
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var c = document.createElement('div'); c.className = 'atm-howto'; c.setAttribute('role', 'note');
    c.innerHTML = '<div class="atm-hhd"><h3>' + (zh ? '3步找到探戈活动' : 'Find tango in 3 steps') + '</h3><span class="atm-hbt"><button type="button" class="atm-hx">× ' + (zh ? '不再显示' : 'Got it') + '</button></span></div><ol>' +
      steps.map(function (s, i) { return '<li><i style="background:' + COL[i] + '">' + (i + 1) + '</i><span>' + s + '</span></li>'; }).join('') + '</ol>' +
      '<p class="atm-hn">' + (zh ? '可加选：过期或日期未定的活动' : 'Optionally include past or TBA events') + '</p>';
    form.parentNode.insertBefore(c, form);
    var l3 = c.querySelectorAll('li')[2], s3 = document.createElement('div'); s3.className = 'atm-h3'; s3.innerHTML = l3.querySelector('i').outerHTML; l3.remove(); document.body.appendChild(s3);
    var s2 = null, t2 = null, hn = null, ha = null; if (true) { c.querySelectorAll('li')[0].style.whiteSpace = 'nowrap'; if (!zh) { c.querySelectorAll('li')[0].style.maxWidth = '100%'; c.querySelectorAll('li')[0].style.alignSelf = 'flex-start'; } var l2 = c.querySelectorAll('li')[1]; s2 = document.createElement('div'); s2.className = 'atm-h3'; s2.innerHTML = l2.querySelector('i').outerHTML; t2 = document.createElement('div'); t2.className = 'atm-h2t'; t2.textContent = zh ? '默认今天' : 'default as today'; l2.remove(); document.body.appendChild(s2); document.body.appendChild(t2); hn = c.querySelector('.atm-hn'); hn.className = 'atm-hnb'; document.body.appendChild(hn); var sr = document.querySelector('.china-showall-row'); if (sr) { sr.classList.add('atm-sub'); } var cs = document.getElementById('china-city'), co = cs && cs.options[cs.selectedIndex]; if (co && co.textContent.trim() === (zh ? '所有城市' : 'All cities')) { co.dataset.atmTxt = co.textContent; co.textContent = zh ? '城市' : 'City'; } ha = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); [c.querySelector('li i'), s2.querySelector('i'), s3.querySelector('i'), c.querySelector('.atm-hbt button')].forEach(function (e, k) { if (!e) return; e.classList.add('atm-fl'); e.style.animationDelay = k + 's'; }); ha.setAttribute('style', 'position:absolute;z-index:9994;pointer-events:none;overflow:visible'); document.body.appendChild(ha); }
    var dim = document.createElement('div'); dim.className = 'atm-hdim'; document.body.appendChild(dim); var blk = document.createElement('div'); blk.className = 'atm-hblk'; document.body.appendChild(blk);
    var bx = c.querySelector('.atm-hx'), svg = null;
    [dim, blk].forEach(function (L) { L.addEventListener('click', function () { bx.classList.remove('atm-pulse'); void bx.offsetWidth; bx.classList.add('atm-pulse'); }); });
    function R_(e) { var r = e.getBoundingClientRect(); return { l: r.left + scrollX, r: r.right + scrollX, t: r.top + scrollY, b: r.bottom + scrollY, cx: r.left + scrollX + r.width / 2, cy: r.top + scrollY + r.height / 2 }; }
    function draw() {
      var F = R_(form), rr = parseFloat(getComputedStyle(form).borderTopLeftRadius) || 0, DW = document.documentElement.scrollWidth, DH = document.documentElement.scrollHeight;
      dim.style.width = DW + 'px'; dim.style.height = DH + 'px';
      dim.style.clipPath = "path(evenodd, 'M0 0H" + DW + "V" + DH + "H0Z M" + (F.l + rr) + " " + F.t + "H" + (F.r - rr) + "A" + rr + " " + rr + " 0 0 1 " + F.r + " " + (F.t + rr) + "V" + (F.b - rr) + "A" + rr + " " + rr + " 0 0 1 " + (F.r - rr) + " " + F.b + "H" + (F.l + rr) + "A" + rr + " " + rr + " 0 0 1 " + F.l + " " + (F.b - rr) + "V" + (F.t + rr) + "A" + rr + " " + rr + " 0 0 1 " + (F.l + rr) + " " + F.t + "Z')";
      if (svg) svg.remove();
      try {
        var li = c.querySelectorAll('li'), C = R_(c), a = R_(li[0]), b = li[1] ? R_(li[1]) : a;
        var dt = R_(document.getElementById('china-from')), sb = R_(document.getElementById('china-search'));
        ev = R_(document.querySelector('.atm-row-ev label')); var rg = R_(document.querySelector('.atm-row-reg label')), nt = document.querySelector('.atm-ev-note'), nr = nt ? R_(nt) : null;
        var x1 = (a.l + C.l) / 2, x2 = Math.round(Math.min(b.cx, C.r - 40)), gp = '';
        var P3 = '';
        s3.style.left = (sb.l - 4) + 'px'; s3.style.top = (sb.cy - 15) + 'px';
        if (hn) { var sa = R_(document.querySelector('.china-showall-row')); hn.style.left = Math.round(sa.cx - hn.offsetWidth / 2) + 'px'; hn.style.top = (sa.b + 4) + 'px'; var cbx = (document.querySelector('.china-showall-row .china-check') || document.querySelector('.china-showall-row .m-chip')) , cq = R_(cbx), hq = R_(hn), x0 = Math.max(hq.l + 8, Math.min(hq.r - 8, cq.cx)), y0 = hq.t - 1, xa = cq.cx, ya = cq.b + 3, L = Math.min(x0, xa) - 10, T = ya - 4; ha.style.left = L + 'px'; ha.style.top = T + 'px'; ha.setAttribute('width', Math.max(x0, xa) - L + 10); ha.setAttribute('height', y0 - T + 6); ha.innerHTML = '<defs><marker id="atmA5" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="#e8a21e"/></marker></defs><path d="M' + (x0 - L) + ' ' + (y0 - T) + 'L' + (xa - L) + ' ' + (ya - T) + '" fill="none" stroke="#e8a21e" stroke-width="2.5" marker-end="url(#atmA5)"/>'; } if (s2) { s2.style.left = (dt.l - 22) + 'px'; s2.style.top = (dt.cy - 15) + 'px'; t2.style.left = (dt.r + 8) + 'px'; t2.style.top = (dt.cy - t2.offsetHeight / 2) + 'px'; }
        [c.querySelector('.atm-hn'), nt, document.getElementById('china-city')].forEach(function (e) { if (!e || innerWidth > 640) return; var q = R_(e); if (x2 > q.l - 3 && x2 < q.r + 3 && q.t > b.b) gp += 'V' + (q.t - 3) + 'M' + x2 + ' ' + (q.b + 3); });
        var gl = Math.min(ev.l, rg.l) - 5, gt = ev.t - 4, gr = Math.max(ev.r, rg.r) + 5, gb = rg.b + 4;
        var G = '<rect x="' + gl + '" y="' + gt + '" width="' + (gr - gl) + '" height="' + (gb - gt) + '" rx="12" fill="none" stroke="#ff3b3b" stroke-width="2.5" stroke-dasharray="7 4"/>';
        var P = ['M' + a.l + ' ' + a.cy + 'H' + x1 + 'V' + rg.cy + 'H' + (gl - 1) + 'M' + x1 + ' ' + ev.cy + 'H' + (gl - 1),
                 s2 ? '' : 'M' + x2 + ' ' + b.b + gp + (x2 >= dt.l && x2 <= dt.r && innerWidth <= 640 ? 'V' + (dt.t - 1) : innerWidth > 640 ? 'V' + (F.t - 14) + 'H' + (F.r + 16) + 'V' + dt.cy + 'H' + (dt.r + 2) : 'V' + dt.cy + 'H' + (dt.r + 2)),
                 P3];
        var H = document.documentElement.scrollHeight, W = document.documentElement.scrollWidth, m = '', p = ''; p += G;
        COL.forEach(function (col, i) {
          m += '<marker id="atmA' + i + '" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="' + col + '"/></marker>';
          if (P[i]) p += '<path d="' + P[i] + '" fill="none" stroke="' + col + '" stroke-width="3" stroke-linejoin="round"' + (i === 2 ? ' marker-end="url(#atmA2)"' : '') + '/>';
        });
        document.body.insertAdjacentHTML('beforeend', '<svg class="atm-hsvg" width="' + W + '" height="' + H + '" aria-hidden="true"><defs>' + m + '</defs>' + p + '</svg>');
        svg = document.body.lastElementChild;
      } catch (e) {}
    }
    draw(); addEventListener('resize', draw); setTimeout(draw, 400);
    var autoT = 0; function close(perm) { clearTimeout(autoT); if (!c.isConnected) return; try { (perm ? localStorage : sessionStorage).setItem(KEY, '1'); } catch (e) {} c.remove(); s3.remove(); if (s2) { s2.remove(); t2.remove(); hn.remove(); ha.remove(); var sr2 = document.querySelector('.atm-sub'); if (sr2) sr2.classList.remove('atm-sub'); var co2 = document.querySelector('#china-city option[data-atm-txt]'); if (co2) { co2.textContent = co2.dataset.atmTxt; delete co2.dataset.atmTxt; } } dim.remove(); blk.remove(); if (svg) svg.remove(); removeEventListener('resize', draw); }
    bx.addEventListener('click', function () { close(true); });
    autoT = setTimeout(function () { close(false); }, 8000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();

/* 2026-11-19: brand page for tango shoes / clothing (Shiao). Data: /asia/vendors.json. ATM only shows; buying is done with the seller directly. */
(function () {
  var body = document.body, id = body.getAttribute('data-id') || '', zh = body.getAttribute('data-lang') === 'zh';
  var back = document.querySelector('.dj-back');
  if (back) back.innerHTML = '<svg width="14" height="28" viewBox="0 0 14 28" aria-hidden="true"><path d="M11.5 2.5L2.8 14l8.7 11.5" fill="none" stroke="#0A4F57" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  if (back) back.addEventListener('click', function (ev) { if (history.length > 1 && document.referrer && new URL(document.referrer).origin === location.origin) { ev.preventDefault(); history.back(); } });
  function H(x) { return String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function pick(o, k) { return zh ? (o[k + '_zh'] || o[k] || '') : (o[k] || o[k + '_zh'] || ''); }
  var CZ = { Shanghai: '上海', Beijing: '北京', Shenzhen: '深圳', Guangzhou: '广州', Hangzhou: '杭州', Chengdu: '成都', Suzhou: '苏州', 'Hong Kong': '香港', Taipei: '台北' };
  var main = document.getElementById('sh-main'); if (!main) return;
  fetch('/asia/vendors.json?v=v1').then(function (r) { return r.json(); }).then(function (list) {
    var v = (list || []).filter(function (x) { return x.id === id; })[0]; if (!v) return;
    var name = pick(v, 'name'), h1 = document.querySelector('.dj-bar h1'); if (h1) h1.textContent = name;
    var out = [];
    if (v.sample) out.push('<p class="sh-sample">' + (zh ? '示例页面：品牌、照片、价格都是占位，不是真的商品。' : 'Sample page: brand, photos and prices are placeholders, not real products.') + '</p>');
    var tags = (zh ? v.tags_zh : v.tags) || [];
    out.push('<div class="sh-hero"><div class="sh-logo">' + (v.logo ? '<img src="' + H(v.logo) + '" alt="">' : '') + '</div><div><h2>' + H(name) + '</h2>' +
      '<p class="sh-meta">' + H([pick(v, 'city'), v.price].filter(Boolean).join(' · ')) + '</p>' +
      (tags.length ? '<p class="sh-tags">' + tags.map(function (t) { return '<span>' + H(t) + '</span>'; }).join('') + '</p>' : '') + '</div></div>');
    var bio = pick(v, 'bio'); if (bio) out.push('<p class="sh-bio">' + H(bio) + '</p>');
    if ((v.products || []).length) {
      out.push('<h2>' + (zh ? '产品' : 'Products') + '</h2><div class="sh-grid sh-' + H(v.kind || '') + '">' + v.products.map(function (p) {
        return '<figure class="sh-item"><img loading="lazy" src="' + H(p.photo) + '" alt=""><figcaption><b>' + H(pick(p, 'name')) + '</b><span>' + H(p.price || '') + '</span></figcaption></figure>';
      }).join('') + '</div>');
    }
    var b = v.buy || {}, rows = [];
    function row(k, val) { if (val) rows.push('<div><dt>' + k + '</dt><dd>' + val + '</dd></div>'); }
    function link(u) { return '<a href="' + H(u) + '" target="_blank" rel="noopener">' + H(u.replace(/^https?:\/\//, '').replace(/\/$/, '')) + '</a>'; }
    row(zh ? '尺码' : 'Sizes', H(pick(v, 'sizes')));
    row(zh ? '微信' : 'WeChat', b.wechat ? H(b.wechat) + '<button type="button" class="sh-copy" data-copy="' + H(b.wechat) + '">' + (zh ? '复制' : 'Copy') + '</button>' : '');
    row(zh ? '淘宝' : 'Taobao', b.taobao ? link(b.taobao) : '');
    row('Instagram', b.instagram ? link(b.instagram) : '');
    row(zh ? '网站' : 'Website', b.website ? link(b.website) : '');
    row(zh ? '寄到国外' : 'Ships abroad', H(pick(b, 'ships_abroad')));
    if (rows.length) out.push('<h2>' + (zh ? '怎么买' : 'How to buy') + '</h2><dl class="dj-fields">' + rows.join('') + '</dl>');
    out.push('<h2>' + (zh ? '会出现在这些活动' : 'At these events') + '</h2><div id="sh-ev" class="dj-events"><p class="dj-empty">' + (zh ? '暂无' : 'None yet') + '</p></div>');
    out.push('<p class="sh-note">' + (zh ? 'ATM 只展示商品，不经手买卖。尺码、付款、寄送请直接联系卖家。' : 'ATM only shows the products and does not handle sales. Contact the seller directly about sizes, payment and shipping.') + '</p>');
    main.innerHTML = out.join('');
    main.addEventListener('click', function (e) { var c = e.target.closest && e.target.closest('.sh-copy'); if (!c) return; var t = c.getAttribute('data-copy'); try { navigator.clipboard.writeText(t); c.textContent = zh ? '已复制' : 'Copied'; } catch (x) {} });
    if (!(v.events || []).length) return;
    return fetch('/asia/events.json').then(function (r) { return r.json(); }).then(function (evs) {
      var by = {}; (evs || []).forEach(function (e) { if (e && e.id) by[e.id] = e; });
      var home = zh ? '/zh/asia/' : '/asia/';
      var html = v.events.map(function (eid) { var e = by[eid]; if (!e || e.hidden) return ''; var t = (zh && e.name_zh) || e.name || '';
        var d = e.start ? e.start.replace(/-/g, '/') + (e.end && e.end !== e.start ? '–' + (e.end.slice(0, 4) === e.start.slice(0, 4) ? e.end.slice(5) : e.end).replace(/-/g, '/') : '') : '';
        return '<a href="' + home + '?card=' + encodeURIComponent(eid) + '"><b>' + H(t) + '</b><span>' + H([d, (zh && CZ[e.city]) || e.city].filter(Boolean).join(' · ')) + '</span></a>'; }).join('');
      if (html) document.getElementById('sh-ev').innerHTML = html;
    });
  }).catch(function () {});
})();

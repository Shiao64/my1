/* v11.9.22: shared field fallback for name / venue / venue_address / dj.
   Non-Chinese locales: field_<lang> || field_en || field.
   Chinese locale: field_zh || field (do not prefer _en over a Chinese original).
   Placeholders such as "Address not found" are skipped. */
(function (root) {
  var HAN = /[\u3400-\u9fff\uf900-\ufaff]/;
  var BAD = /^\s*(address not found|not found|没找到|未找到|unknown|未知|tba|待定)\s*$/i;

  function langOf(opts) {
    var doc = (opts && opts.document) || (typeof document !== 'undefined' ? document : null);
    var el = doc && doc.documentElement;
    var raw = '';
    if (el) raw = (el.getAttribute('data-asia-lang') || el.lang || '');
    raw = String(raw || '').toLowerCase();
    if (/^zh/.test(raw)) return 'zh';
    if (/^es/.test(raw)) return 'es';
    if (/^ko/.test(raw)) return 'ko';
    if (/^en/.test(raw)) return 'en';
    var path = '';
    try { path = (opts && opts.pathname) || (typeof location !== 'undefined' && location.pathname) || ''; } catch (e) {}
    if (/(^|\/)zh(\/|$)/.test(path)) return 'zh';
    if (opts && opts.zhHint) return 'zh';
    return 'en';
  }

  function nonempty(v) {
    if (v == null) return false;
    if (Array.isArray(v)) return v.some(function (x) { return String(x == null ? '' : x).trim(); });
    return String(v).trim() !== '';
  }

  function usable(v) {
    if (!nonempty(v)) return false;
    if (Array.isArray(v)) return true;
    return !BAD.test(String(v).trim());
  }

  function keysFor(field, lang) {
    lang = lang || 'en';
    if (lang === 'zh') return [field + '_zh', field];
    var keys = [field + '_' + lang];
    if (lang !== 'en') keys.push(field + '_en');
    keys.push(field);
    return keys;
  }

  function pick(e, field, lang) {
    if (!e) return '';
    var keys = keysFor(field, lang || 'en');
    for (var i = 0; i < keys.length; i++) {
      var v = e[keys[i]];
      if (usable(v)) return v;
    }
    return '';
  }

  function asText(v) {
    if (v == null || v === '') return '';
    if (Array.isArray(v)) return v.map(function (x) { return String(x == null ? '' : x).trim(); }).filter(Boolean).join(' / ');
    return String(v).trim();
  }

  function fieldText(e, field, lang) {
    return asText(pick(e, field, lang));
  }

  function addressLines(e, lang) {
    lang = lang || 'en';
    var orig = usable(e && e.venue_address) ? String(e.venue_address).trim() : '';
    var chosen = fieldText(e, 'venue_address', lang);
    var en = usable(e && e.venue_address_en) ? String(e.venue_address_en).trim() : '';
    var mainland = !!(e && e.country === 'China' && (e.region || 'China') === 'China');
    var lines = [];
    if (lang === 'zh') {
      if (orig) lines.push(orig);
      if (en && en !== orig && (!mainland || e.addr_en_zh || !orig)) lines.push(en);
    } else {
      if (chosen) lines.push(chosen);
      if (orig && HAN.test(orig) && orig !== chosen) lines.push(orig);
    }
    return {
      lines: lines,
      display: lines[0] || '',
      original: lang === 'zh' ? '' : (lines[1] || ''),
      mapQuery: orig || chosen || ''
    };
  }

  var api = { langOf: langOf, pick: pick, fieldText: fieldText, addressLines: addressLines, hasHan: function (s) { return HAN.test(String(s || '')); } };
  if (root) root.atmI18n = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));

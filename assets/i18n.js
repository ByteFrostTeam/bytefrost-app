/* Locale loader: picks ?lang=, then a saved choice, then the browser language; loads i18n/<lang>.json and fills data-i18n* attributes. */
(function () {
  var SUPPORTED = ['cs', 'da', 'de', 'el', 'en', 'es', 'fi', 'fr', 'hi', 'hr', 'hu', 'id', 'it', 'ja', 'ko', 'ms', 'nb', 'nl', 'pl', 'pt', 'ro', 'ru', 'sk', 'sv', 'th', 'tr', 'uk', 'vi', 'zh-Hans', 'zh-Hant'];
  function norm(l) {
    if (!l) return null;
    var low = String(l).replace('_', '-').toLowerCase();
    if (low.indexOf('zh') === 0) return /tw|hk|mo|hant/.test(low) ? 'zh-Hant' : 'zh-Hans';
    if (low === 'no' || low.indexOf('nn') === 0 || low.indexOf('nb') === 0) return 'nb';
    var base = low.split('-')[0];
    return SUPPORTED.indexOf(base) >= 0 ? base : null;
  }
  var q = null; try { q = new URLSearchParams(location.search).get('lang'); } catch (e) {}
  var stored = null; try { stored = localStorage.getItem('lang'); } catch (e) {}
  var lang = norm(q) || norm(stored);
  if (!lang) { var ls = navigator.languages || [navigator.language]; for (var i = 0; i < ls.length && !lang; i++) lang = norm(ls[i]); }
  lang = lang || 'en';
  if (q) { try { localStorage.setItem('lang', lang); } catch (e) {} }
  window.LANG = lang;
  var base = (document.currentScript && document.currentScript.getAttribute('data-base')) || '';
  var root = document.documentElement;

  function ready(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  function apply(dict) {
    window.I18N = dict;
    root.lang = lang;
    var each = function (sel, fn) { var els = document.querySelectorAll(sel); for (var i = 0; i < els.length; i++) fn(els[i]); };
    each('[data-i18n]', function (el) { var v = dict[el.getAttribute('data-i18n')]; if (v != null) el.textContent = v; });
    each('[data-i18n-html]', function (el) { var v = dict[el.getAttribute('data-i18n-html')]; if (v != null) el.innerHTML = v; });
    each('[data-i18n-alt]', function (el) { var v = dict[el.getAttribute('data-i18n-alt')]; if (v != null) el.setAttribute('alt', v); });
    each('[data-i18n-aria]', function (el) { var v = dict[el.getAttribute('data-i18n-aria')]; if (v != null) el.setAttribute('aria-label', v); });
    if (dict['meta.title'] && !document.querySelector('title[data-i18n]')) document.title = dict['meta.title'];
    var m = document.querySelector('meta[name="description"]'); if (m && dict['meta.desc']) m.setAttribute('content', dict['meta.desc']);
    var og = document.querySelector('meta[property="og:title"]'); if (og && dict['meta.og_title']) og.setAttribute('content', dict['meta.og_title']);
    var ogd = document.querySelector('meta[property="og:description"]'); if (ogd && dict['meta.og_desc']) ogd.setAttribute('content', dict['meta.og_desc']);
  }
  function done(dict) {
    if (dict) apply(dict);
    var sel = document.getElementById('lang-select'); if (sel) sel.value = lang;
    root.classList.remove('i18n-loading');
    window.I18N_READY = true;
    try { dispatchEvent(new Event('i18n:ready')); } catch (e) {}
  }
  if (lang === 'en') { ready(function () { done(null); }); return; }
  root.classList.add('i18n-loading');
  var timer = setTimeout(function () { ready(function () { done(null); }); }, 2500);
  fetch(base + 'i18n/' + lang + '.json').then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) { clearTimeout(timer); ready(function () { done(d); }); })
    .catch(function () { clearTimeout(timer); ready(function () { done(null); }); });
})();

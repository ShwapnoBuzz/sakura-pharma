/* সাকুরা ফার্মা — বাংলা/English ভাষা বদল (i18n)
   বাংলা মূল ভাষা। English চালু থাকলে পাতার সব বাংলা লেখা নিচের অভিধান (js/i18n_en.js) দেখে
   স্বয়ংক্রিয়ভাবে ইংরেজিতে বদলে যায়। ব্যবহারকারীর লেখা ডেটা (ওষুধ/গ্রাহকের নাম) যেমন আছে তেমন থাকে। */
(function () {
'use strict';
const KEY = 'sp_lang';
const BN = /[\u0980-\u09F2\u09F4-\u09FF]/;             // ৳ (U+09F3) বাদে বাংলা অক্ষর
const SK = s => s.replace(/[^\u0980-\u09F2\u09F4-\u09FF]/g, '');
const NORM = s => s.replace(/[\u200c\u200d]/g, '').replace(/\s+/g, ' ').trim();
const DIG = s => s.replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d));
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
let lang = 'bn';
try { lang = localStorage.getItem(KEY) === 'en' ? 'en' : 'bn'; } catch (e) { /* ignore */ }
const EN = window.I18N_EN || {};
const buckets = new Map();
for (const [k0, v] of Object.entries(EN)) {
  const k = NORM(k0); const sk = SK(k); let re = null; const ids = [];
  if (/\{\d+\}/.test(k)) re = new RegExp('^' + k.split(/(\{\d+\})/).map(p => { const m = /^\{(\d+)\}$/.exec(p); if (m) { ids.push(+m[1]); return '(.*?)'; } return reEsc(p); }).join('') + '$');
  if (!buckets.has(sk)) buckets.set(sk, []);
  buckets.get(sk).push({ k, v, re, ids });
}
buckets.forEach(b => b.sort((x, y) => (x.re ? 1 : 0) - (y.re ? 1 : 0) || y.k.length - x.k.length));
const cache = new Map();
const miss = window.__i18nMiss = new Set();
function lookup(text) {
  const n = NORM(text); if (!BN.test(n)) return n;
  if (cache.has(n)) return cache.get(n);
  let out = null; const b = buckets.get(SK(n));
  if (b) for (const e of b) {
    if (!e.re) { if (e.k === n) { out = e.v; break; } continue; }
    const m = e.re.exec(n); if (m) { out = e.v.replace(/\{(\d+)\}/g, (_, i) => { const j = e.ids.indexOf(+i); return j >= 0 ? m[j + 1] : ''; }); break; }
  }
  if (out == null) { miss.add(n); out = DIG(n); }
  out = DIG(out);
  if (cache.size > 5000) cache.clear();
  cache.set(n, out); return out;
}
function trString(s) {
  if (lang !== 'en' || !s || !BN.test(s)) return s;
  const lead = /^\s*/.exec(s)[0], trail = /\s*$/.exec(s)[0];
  return lead + lookup(s) + trail;
}
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'NOSCRIPT']);
const skipEl = el => { for (let e = el; e && e.nodeType === 1; e = e.parentElement) { if (SKIP.has(e.tagName) || e.getAttribute('translate') === 'no') return true; } return false; };
const ATTRS = ['placeholder', 'title', 'aria-label'];
function trText(node) {
  if (!node.parentElement || skipEl(node.parentElement)) return;
  const v = node.nodeValue; if (!BN.test(v)) return;
  const t = trString(v); if (t !== v) node.nodeValue = t;
}
function trAttrs(el) {
  if (skipEl(el)) return;
  for (const a of ATTRS) { const v = el.getAttribute(a); if (v && BN.test(v)) { const t = trString(v); if (t !== v) el.setAttribute(a, t); } }
}
function tr(root) {
  if (lang !== 'en' || !root) return;
  if (root.nodeType === 3) return trText(root);
  if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
  if (root.nodeType === 1) { if (skipEl(root)) return; trAttrs(root); }
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode: n => (n.nodeType === 1 && (SKIP.has(n.tagName) || n.getAttribute('translate') === 'no')) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
  let n; while ((n = w.nextNode())) { if (n.nodeType === 3) { const v = n.nodeValue; if (BN.test(v)) { const t = trString(v); if (t !== v) n.nodeValue = t; } } else trAttrs(n); }
}
const obs = new MutationObserver(muts => {
  if (lang !== 'en') return;
  for (const m of muts) {
    if (m.type === 'childList') m.addedNodes.forEach(n => tr(n));
    else if (m.type === 'characterData') trText(m.target);
    else if (m.type === 'attributes') trAttrs(m.target);
  }
});
function apply() {
  document.documentElement.lang = lang;
  document.title = lang === 'en' ? 'Sakura Pharma — Medicine Shop Software' : 'সাকুরা ফার্মা — মেডিসিন শপ সফটওয়্যার';
  if (lang === 'en') tr(document.body);
}
function start() {
  obs.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  apply();
}
window.SP_I18N = {
  lang: () => lang,
  set(l, quiet) { lang = l === 'en' ? 'en' : 'bn'; try { localStorage.setItem(KEY, lang); } catch (e) { /* ignore */ } if (!quiet) apply(); },
  apply,
  /* উৎস-কোডে সরাসরি অনুবাদ: t('বাংলা {0}', x) */
  t(s, ...a) { const fill = x => String(x).replace(/\{(\d+)\}/g, (_, i) => a[i] ?? ''); if (lang === 'en' && BN.test(s)) { const v = EN[s]; return v != null ? fill(v) : trString(fill(s)); } return fill(s); },
  tr, lookup,
};
if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();

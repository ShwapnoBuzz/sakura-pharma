/* সাকুরা ফার্মা — অফলাইন মেডিসিন শপ ম্যানেজমেন্ট সফটওয়্যার
   সব ডেটা এই ব্রাউজারের IndexedDB-তে থাকে; কোনো সার্ভার বা ইন্টারনেট লাগে না। */
(function () {
'use strict';
const APP_VER = '1.2.0';
const STORES = ['medicines', 'batches', 'purchases', 'sales', 'deliveries', 'customers', 'suppliers', 'ledger', 'interactions', 'adr', 'users', 'settings'];
const FORMS = ['ট্যাবলেট', 'ক্যাপসুল', 'সিরাপ', 'সাসপেনশন', 'ইনজেকশন', 'সাপোজিটরি', 'ড্রপ', 'ক্রিম', 'মলম', 'জেল', 'ইনহেলার', 'পাউডার', 'স্যাশে', 'স্প্রে', 'অন্যান্য'];
const FORM_EN = { 'ট্যাবলেট': 'Tablet', 'ক্যাপসুল': 'Capsule', 'সিরাপ': 'Syrup', 'সাসপেনশন': 'Suspension', 'ইনজেকশন': 'Injection', 'সাপোজিটরি': 'Suppository', 'ড্রপ': 'Drop', 'ক্রিম': 'Cream', 'মলম': 'Ointment', 'জেল': 'Gel', 'ইনহেলার': 'Inhaler', 'পাউডার': 'Powder', 'স্যাশে': 'Sachet', 'স্প্রে': 'Spray', 'অন্যান্য': 'Other' };
const SEV = ['গুরুতর', 'মাঝারি', 'সামান্য'];
const DSTAT = ['নতুন', 'প্রস্তুত', 'পথে', 'পৌঁছেছে', 'বাতিল'];

/* ---------- ছোট সহায়ক ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const num = v => { const n = parseFloat(String(v ?? '').replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d)).replace(/,/g, '')); return isNaN(n) ? 0 : n; };
const r2 = n => Math.round(n * 100) / 100;
const LG = () => (window.SP_I18N ? window.SP_I18N.lang() : 'bn');
const tt = (s, ...a) => (window.SP_I18N ? window.SP_I18N.t(s, ...a) : s);
const formL = f => LG() === 'en' ? (FORM_EN[f] || f) : f;
const STAT_EN = { 'নতুন': 'New', 'প্রস্তুত': 'Ready', 'পথে': 'On the way', 'পৌঁছেছে': 'Delivered', 'বাতিল': 'Cancelled' };
const statL = s => LG() === 'en' ? (STAT_EN[s] || s) : s;
const bnNum = (n, d = 2) => Number(n || 0).toLocaleString(LG() === 'en' ? 'en-IN' : 'bn-BD', { maximumFractionDigits: d });
const tk = n => '৳' + bnNum(r2(n));
const pad = n => String(n).padStart(2, '0');
const isoDate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => isoDate();
const addDays = (s, n) => { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return isoDate(d); };
const daysBetween = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
const bnDate = s => { if (!s) return '—'; const d = new Date(s.length <= 10 ? s + 'T00:00:00' : s); return d.toLocaleDateString(LG() === 'en' ? 'en-GB' : 'bn-BD', { day: 'numeric', month: 'short', year: 'numeric' }); };
const bnDateTime = s => { const d = new Date(s); const en = LG() === 'en'; return d.toLocaleDateString(en ? 'en-GB' : 'bn-BD', { day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString(en ? 'en-US' : 'bn-BD', { hour: 'numeric', minute: '2-digit' }); };
const norm = s => String(s || '').toLowerCase().replace(/[\s\-_.]+/g, ' ').trim();
/* বাংলা বানানে খোঁজা: বাংলা ও ইংরেজি নামকে আনুমানিক ব্যঞ্জনবর্ণ-কাঠামোয় এনে মেলানো (যেমন "সেকলো" ≈ "Seclo") */
const BNC = { 'ক': 'k', 'খ': 'k', 'গ': 'g', 'ঘ': 'g', 'ঙ': 'ng', 'চ': 'c', 'ছ': 'c', 'জ': 'j', 'ঝ': 'j', 'ঞ': 'n', 'ট': 't', 'ঠ': 't', 'ড': 'd', 'ঢ': 'd', 'ণ': 'n', 'ত': 't', 'থ': 't', 'দ': 'd', 'ধ': 'd', 'ন': 'n', 'প': 'p', 'ফ': 'f', 'ব': 'b', 'ভ': 'b', 'ম': 'm', 'য': 'j', 'র': 'r', 'ল': 'l', 'শ': 's', 'ষ': 's', 'স': 's', 'ৎ': 't', 'ং': 'ng', 'R': 'r' };
const dedup = s => s.replace(/(.)\1+/g, '$1');
function bnSkel(s) {
  s = String(s || '').replace(/[ডঢ]\u09BC|[\u09DC\u09DD]/g, 'R').replace(/য\u09BC|\u09DF/g, '').replace(/\u09CDয/g, '');
  return dedup([...s].map(c => BNC[c] || '').join(''));
}
function latSkel(s) {
  s = String(s || '').toLowerCase().replace(/[^a-z]/g, '')
    .replace(/sh/g, 's').replace(/ch/g, 'C').replace(/ph/g, 'f').replace(/th/g, 't').replace(/dh/g, 'd').replace(/kh/g, 'k').replace(/gh/g, 'g').replace(/bh/g, 'b').replace(/ck/g, 'k').replace(/qu/g, 'k')
    .replace(/x/g, 'ks').replace(/z/g, 'j').replace(/v/g, 'b').replace(/q/g, 'k').replace(/c(?=[eiy])/g, 's').replace(/g(?=[eiy])/g, 'j').replace(/c/g, 'k').replace(/C/g, 'c')
    .replace(/[aeiouyhw]/g, '');
  return dedup(s);
}
const hasBn = s => /[\u0980-\u09F2\u09F4-\u09FF]/.test(s);
function hashPin(p) { let h = 2166136261; const s = 'sakura:' + p; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); }

/* ---------- আইকন (ইনলাইন SVG) ---------- */
const P = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2.5 3h3l2.6 12.2a1.5 1.5 0 0 0 1.5 1.2h8.3a1.5 1.5 0 0 0 1.5-1.1L21.5 8H6.4"/>',
  pill: '<path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5V8Z"/><path d="m3 8 9 5 9-5"/><path d="M12 13v8"/>',
  truck: '<path d="M3 6h11v10H3z"/><path d="M14 9h4l3 3v4h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  wallet: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M16 15h2"/><path d="M6 6V5a2 2 0 0 1 2-2h9"/>',
  bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
  chart: '<path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6"/><rect x="12" y="8" width="3" height="10"/><rect x="17" y="5" width="3" height="13"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z"/>',
  print: '<path d="M6 9V2h12v7"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v8H6z"/>',
  alert: '<path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  money: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
  trend: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
};
const ic = (n, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${P[n] || ''}</svg>`;

/* ---------- IndexedDB ---------- */
let idb;
function openDB() {
  return new Promise((res, rej) => {
    const rq = indexedDB.open('sakura_pharma_db', 1);
    rq.onupgradeneeded = () => { const db = rq.result; STORES.forEach(s => { if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' }); }); };
    rq.onsuccess = () => res(rq.result);
    rq.onerror = () => rej(rq.error);
  });
}
const tx = (store, mode = 'readonly') => idb.transaction(store, mode).objectStore(store);
const reqP = rq => new Promise((res, rej) => { rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });
const D = {}; // মেমরি ক্যাশ
async function loadAll() { for (const s of STORES) D[s] = await reqP(tx(s).getAll()); VER.medicines++; VER.batches++; }
const VER = { medicines: 0, batches: 0 }; // ডেটা বদলালে ক্যাশ (সার্চ ইনডেক্স/স্টক) নতুন করে বানাতে
const bump = st => { if (st in VER) VER[st]++; };
async function put(store, obj) {
  if (!obj.id) obj.id = uid();
  await reqP(tx(store, 'readwrite').put(obj));
  const arr = D[store]; const i = arr.findIndex(x => x.id === obj.id);
  if (i >= 0) arr[i] = obj; else arr.push(obj);
  bump(store); return obj;
}
async function putMany(store, list) {
  return new Promise((res, rej) => {
    const t = idb.transaction(store, 'readwrite'); const os = t.objectStore(store);
    list.forEach(o => { if (!o.id) o.id = uid(); os.put(o); });
    t.oncomplete = () => { const map = new Map(D[store].map(x => [x.id, x])); list.forEach(o => map.set(o.id, o)); D[store] = [...map.values()]; bump(store); res(); };
    t.onerror = () => rej(t.error);
  });
}
async function del(store, id) { await reqP(tx(store, 'readwrite').delete(id)); D[store] = D[store].filter(x => x.id !== id); bump(store); }
async function clearStore(store) { await reqP(tx(store, 'readwrite').clear()); D[store] = []; bump(store); }
async function delMany(store, ids) {
  const set = new Set(ids); if (!set.size) return;
  await new Promise((res, rej) => { const t = idb.transaction(store, 'readwrite'); const os = t.objectStore(store); set.forEach(id => os.delete(id)); t.oncomplete = res; t.onerror = () => rej(t.error); });
  D[store] = D[store].filter(x => !set.has(x.id)); bump(store);
}
const byId = (store, id) => store === 'medicines' ? medIdx().id.get(id) : D[store].find(x => x.id === id);
/* ২৫ হাজার ওষুধেও দ্রুত খোঁজার জন্য ইনডেক্স (ডেটা বদলালে নিজে থেকে নতুন হয়) */
let MI = { v: -1 };
function medIdx() {
  if (MI.v !== VER.medicines || MI.n !== D.medicines.length) {
    const list = D.medicines.map(m => ({ m, b: norm(m.brand), g: norm(m.generic), bn: norm(m.nameBn), c: norm(m.company), bs: null, gs: null }));
    list.sort((a, b) => a.b < b.b ? -1 : a.b > b.b ? 1 : 0);
    const gm = new Map(); list.forEach(e => { const a = gm.get(e.g); if (a) a.push(e.m); else gm.set(e.g, [e.m]); });
    MI = { v: VER.medicines, n: D.medicines.length, list, gm, id: new Map(D.medicines.map(m => [m.id, m])) };
  }
  return MI;
}
const bSk = e => e.bs ?? (e.bs = latSkel(e.m.brand)); const gSk = e => e.gs ?? (e.gs = latSkel(e.m.generic));
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const bigList = () => D.medicines.length > 2000;
const setting = k => (D.settings.find(x => x.id === k) || {}).value;
const setSetting = (k, v) => put('settings', { id: k, value: v });

/* ---------- দোকানের তথ্য (বাংলা/English) ---------- */
const SHOP_EN = { nameEn: 'Sakura Pharma', typeEn: 'Model Medicine Shop', addressEn: 'Malibag Mor, Bakshiganj, Jamalpur', sloganEn: 'Quality medicine, humane service', footerEn: 'Thank you, please come again. Antibiotics are not sold without a prescription.' };
function shopL() {
  const s = { ...(setting('shop') || {}) };
  if (LG() === 'en') ['name', 'type', 'address', 'slogan', 'footer'].forEach(k => { const e = s[k + 'En'] || (!hasBn(s[k] || '') && s[k]) || SHOP_EN[k + 'En']; s[k] = e; });
  return s;
}

/* ---------- নমুনা ডেটা ---------- */
async function seedIfEmpty() {
  if (setting('seeded')) return;
  const S = window.SEED; const t = today();
  await setSetting('shop', { name: 'সাকুরা ফার্মা', type: 'মডেল মেডিসিন শপ', address: 'মালিবাগ মোড়, বকশীগঞ্জ, জামালপুর', phone: '01333-884455', slogan: 'গুণগত ঔষধ, মানবিক সেবা', footer: 'ধন্যবাদ, আবার আসবেন। প্রেসক্রিপশন ছাড়া অ্যান্টিবায়োটিক বিক্রি করা হয় না।', ...SHOP_EN });
  const sups = S.S.map(s => ({ id: uid(), name: s[0], phone: s[1], companies: s[2], terms: s[3], sample: true }));
  await putMany('suppliers', sups);
  const meds = S.M.map((m, i) => ({ id: 'M' + String(i + 1).padStart(4, '0'), brand: m[0], nameBn: (S.BN || {})[m[0]] || '', generic: m[1], strength: m[2], form: m[3], company: m[4], rack: m[5], purchasePrice: m[6], marketPrice: m[7], wholesalePrice: m[8], mrp: m[9], reorder: m[10], antibiotic: !!m[11], rx: !!m[12], packSize: '', dar: '', barcode: '', sample: true, created: t }));
  await putMany('medicines', meds);
  // নমুনা ব্যাচ — কিছু মেয়াদ কাছাকাছি/শেষ, যাতে সতর্কতা দেখা যায়
  const batches = []; let k = 0;
  meds.forEach((m, i) => {
    const sup = sups.find(s => s.companies.includes(m.company)) || sups[2];
    let exp = addDays(t, 200 + (i * 37) % 500); let qty = Math.max(5, m.reorder * 2 + (i * 13) % 50);
    if (i % 11 === 3) exp = addDays(t, 20 + i % 9);
    if (i % 11 === 7) exp = addDays(t, 50 + i % 9);
    if (i === 29) exp = addDays(t, -10);
    if (i % 9 === 5) qty = Math.max(2, Math.floor(m.reorder / 3));
    batches.push({ id: uid(), medId: m.id, batchNo: 'NB' + (1000 + (++k)), expiry: exp, qty, initQty: qty, purchasePrice: m.purchasePrice, supplierId: sup.id, purchaseId: 'opening', date: addDays(t, -20), sample: true });
  });
  await putMany('batches', batches);
  await putMany('interactions', S.I.map(x => ({ id: uid(), a: x[0], b: x[1], severity: x[2], note: x[3], source: x[4], reviewedBy: '', sample: true })));
  await putMany('adr', S.A.map(x => ({ id: uid(), generic: x[0], common: x[1], serious: x[2], caution: x[3], source: x[4], sample: true })));
  // গত ১৪ দিনের কিছু নমুনা বিক্রি (ড্যাশবোর্ড দেখার জন্য)
  const custs = [{ id: uid(), name: 'রহিম উদ্দিন (নমুনা)', phone: '01800-000001', address: 'বকশীগঞ্জ বাজার', type: 'retail', sample: true },
                 { id: uid(), name: 'নিউ লাইফ ফার্মেসী (নমুনা পাইকারি)', phone: '01800-000002', address: 'দেওয়ানগঞ্জ', type: 'wholesale', sample: true }];
  await putMany('customers', custs);
  let no = 0; const sales = [];
  for (let d = 13; d >= 0; d--) {
    const n = 2 + (d * 7) % 4;
    for (let j = 0; j < n; j++) {
      const items = [];
      for (let q = 0; q < 1 + (d + j) % 3; q++) {
        const m = meds[(d * 5 + j * 3 + q * 7) % meds.length]; const qty = m.mrp < 5 ? 10 : 1 + (j % 2);
        items.push({ medId: m.id, name: m.brand, generic: m.generic, strength: m.strength, form: m.form, qty, price: m.mrp, cost: m.purchasePrice, allocs: [] });
      }
      const sub = r2(items.reduce((a, b) => a + b.qty * b.price, 0));
      sales.push({ id: uid(), no: 'S-' + String(++no).padStart(5, '0'), date: addDays(t, -d) + 'T' + pad(9 + j * 2) + ':15:00', mode: 'retail', items, subtotal: sub, discount: 0, total: sub, paid: sub, due: 0, custName: '', custPhone: '', customerId: '', user: 'নমুনা', sample: true });
    }
  }
  await putMany('sales', sales);
  await setSetting('saleNo', no);
  await setSetting('seeded', true);
  await setSetting('hasSample', true);
}

/* ---------- স্টক ---------- */
let SC = { v: -1 };
function stockMap() { // ওষুধ অনুযায়ী বর্তমান স্টক (মেয়াদ আছে এমন) — একবার হিসাব করে রাখা
  const t = today();
  if (SC.v !== VER.batches || SC.d !== t || SC.n !== D.batches.length) {
    const m = new Map(), any = new Set();
    for (const b of D.batches) { any.add(b.medId); if (b.qty > 0 && b.expiry >= t) m.set(b.medId, (m.get(b.medId) || 0) + b.qty); }
    SC = { v: VER.batches, d: t, n: D.batches.length, m, any };
  }
  return SC;
}
function stockOf(medId, includeExpired = false) {
  if (includeExpired) return D.batches.filter(b => b.medId === medId && b.qty > 0).reduce((a, b) => a + b.qty, 0);
  return stockMap().m.get(medId) || 0;
}
// ডাটাবেস থেকে আনা যে ওষুধ কখনও কেনা হয়নি, তাকে "কম স্টক" সতর্কতায় ধরা হবে না
const tracked = m => !m.catalog || stockMap().any.has(m.id);
const isLow = m => tracked(m) && stockOf(m.id) <= (m.reorder || 0);
function nearestExpiry(medId) {
  const t = today(); const bs = D.batches.filter(b => b.medId === medId && b.qty > 0 && b.expiry >= t).sort((a, b) => a.expiry.localeCompare(b.expiry));
  return bs[0]?.expiry;
}
const medLabel = m => `${m.brand} ${m.strength || ''} ${m.form ? '(' + formL(m.form) + ')' : ''}`.replace(/\s+/g, ' ').trim();
function alertCounts() {
  const t = today(); const low = D.medicines.filter(isLow).length;
  const exp = D.batches.filter(b => b.qty > 0 && b.expiry < t).length;
  const soon = D.batches.filter(b => b.qty > 0 && b.expiry >= t && b.expiry <= addDays(t, 90)).length;
  return { low, exp, soon, total: low + exp + soon };
}

/* ---------- ইন্টার‍্যাকশন ---------- */
function genericParts(g) { return norm(g).split(/\s*\+\s*|\s*\/\s*|,\s*/).filter(Boolean); }
function termMatches(generic, term) { const t = norm(term); if (!t) return false; return genericParts(generic).some(p => p === t || p.includes(t)) || norm(generic).includes(t); }
function checkInteractions(generics) {
  const list = [...new Set(generics.filter(Boolean))]; const found = [];
  for (const it of D.interactions) {
    for (let i = 0; i < list.length; i++) for (let j = 0; j < list.length; j++) {
      if (i === j) continue;
      if (termMatches(list[i], it.a) && termMatches(list[j], it.b)) { if (!found.some(f => f.it.id === it.id)) found.push({ it, x: list[i], y: list[j] }); }
    }
  }
  return found.sort((a, b) => SEV.indexOf(a.it.severity) - SEV.indexOf(b.it.severity));
}
const adrFor = g => D.adr.filter(a => genericParts(g).some(p => p === norm(a.generic) || p.includes(norm(a.generic))));

/* ---------- টোস্ট, মোডাল, কনফার্ম ---------- */
function toast(msg, type = '') { const el = document.createElement('div'); el.className = 'toast ' + type; el.textContent = msg; $('#toasts').appendChild(el); setTimeout(() => el.remove(), 3200); }
let modalStack = [];
function modal(title, body, foot = '', cls = '') {
  const ov = document.createElement('div'); ov.className = 'ov';
  ov.innerHTML = `<div class="modal ${cls}" role="dialog"><div class="mh"><h2>${title}</h2><button class="iconbtn" data-x title="বন্ধ (Esc)">${ic('x')}</button></div><div class="mb">${body}</div>${foot ? `<div class="mf">${foot}</div>` : ''}</div>`;
  $('#modals').appendChild(ov); modalStack.push(ov);
  const close = () => { ov.remove(); modalStack = modalStack.filter(x => x !== ov); };
  ov.addEventListener('mousedown', e => { if (e.target === ov) close(); });
  $('[data-x]', ov).onclick = close; ov.close = close;
  setTimeout(() => { const f = $('input:not([type=hidden]),select,textarea', $('.mb', ov)); f && f.focus(); }, 30);
  return ov;
}
function confirmBox(msg, okText = 'হ্যাঁ, নিশ্চিত', danger = true) {
  return new Promise(res => {
    const ov = modal('নিশ্চিত করুন', `<p style="font-size:17px;margin:0">${msg}</p>`, `<button class="btn" data-no>না, বাতিল</button><button class="btn ${danger ? 'pri' : 'teal'}" data-yes>${okText}</button>`, 'sm');
    $('[data-no]', ov).onclick = () => { ov.close(); res(false); };
    $('[data-yes]', ov).onclick = () => { ov.close(); res(true); };
    $('[data-x]', ov).addEventListener('click', () => res(false));
    setTimeout(() => $('[data-no]', ov).focus(), 40);
  });
}
const empty = (emoji, title, text = '', btn = '') => `<div class="empty"><div class="e-ic">${emoji}</div><b>${title}</b><div>${text}</div>${btn ? `<div class="mt">${btn}</div>` : ''}</div>`;
function download(name, data, type) {
  const blob = data instanceof Blob ? data : new Blob([data], { type }); const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function csvOf(rows) { return '\ufeff' + rows.map(r => r.map(c => { const s = String(c ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\n'); }

/* ---------- ব্যবহারকারী ও ভূমিকা ---------- */
let currentUser = null; // {name, role}
const isOwner = () => !currentUser || currentUser.role === 'owner';

/* ---------- রাউটিং ও লেআউট ---------- */
const NAV = [
  ['dash', 'ড্যাশবোর্ড', 'home'], ['pos', 'বিক্রি (POS)', 'cart'], ['meds', 'ওষুধ তালিকা', 'pill'], ['purchase', 'ক্রয় / স্টক-ইন', 'box'],
  ['delivery', 'হোম ডেলিভারি', 'truck'], ['dues', 'বাকি খাতা', 'wallet'], ['alerts', 'স্টক সতর্কতা', 'bell'], ['ix', 'ইন্টার‍্যাকশন', 'shield'],
  ['reports', 'রিপোর্ট', 'chart', true], ['settings', 'ব্যাকআপ ও সেটিংস', 'gear', true],
];
let route = 'dash';
function go(r) { route = r; location.hash = r; render(); }
function shell() {
  const shop = shopL(); const ac = alertCounts(); const pendingDel = D.deliveries.filter(d => !['পৌঁছেছে', 'বাতিল'].includes(d.status)).length;
  return `<div class="app"><div class="scrim" id="scrim"></div><aside class="side" id="side">
    <div class="brand"><img src="img/icon-small.png" alt=""><div><b>${esc(shop.name || 'সাকুরা ফার্মা')}</b><small>${esc(shop.type || 'মডেল মেডিসিন শপ')}</small></div></div>
    <nav class="nav">${NAV.filter(n => !n[3] || isOwner()).map(n => `<a data-go="${n[0]}" class="${route === n[0] ? 'on' : ''}">${ic(n[2])}<span>${n[1]}</span>${n[0] === 'alerts' && ac.total ? `<span class="cnt">${bnNum(ac.total, 0)}</span>` : ''}${n[0] === 'delivery' && pendingDel ? `<span class="cnt" style="background:var(--teal)">${bnNum(pendingDel, 0)}</span>` : ''}</a>`).join('')}</nav>
    <div class="side-foot">${currentUser ? `${ic('users', '')} ${esc(currentUser.name)} · <span>${currentUser.role === 'owner' ? 'মালিক' : 'বিক্রেতা'}</span><br><a href="#" id="logout">লক করুন</a><br>` : ''}সংস্করণ ${APP_VER} · অফলাইন সফটওয়্যার</div>
  </aside><main class="main"><header class="top"><button class="iconbtn menu-btn" id="menuBtn">${ic('menu')}</button><h1 id="ptitle"></h1><span class="sp"></span>
    <span class="pill ${navigator.onLine ? 'ok' : 'off'} hide-m">${navigator.onLine ? 'অনলাইন' : 'অফলাইন'} · ডেটা এই ডিভাইসে</span>
    <span class="pill hide-m">${bnDate(today())}</span>${langSwitch()}
    <button class="btn pri sm" data-go="pos" title="নতুন বিক্রি">${ic('cart')}<span class="hide-m"> নতুন বিক্রি</span></button></header>
    <section class="content" id="page"></section></main></div>`;
}
/* ভাষা বদলের সুইচ — হেডারে ও লক স্ক্রিনে */
const langSwitch = () => `<div class="seg langsw" translate="no" role="group" aria-label="Language"><button data-lang="bn" class="${LG() === 'bn' ? 'on' : ''}" lang="bn">বাংলা</button><button data-lang="en" class="${LG() === 'en' ? 'on' : ''}" lang="en">English</button></div>`;
function bindLang() { $$('[data-lang]').forEach(b => b.onclick = () => { if (b.dataset.lang === LG()) return; const I = window.SP_I18N; if (I) I.set(b.dataset.lang, true); modalStack.slice().forEach(o => o.close()); $('#toasts').innerHTML = ''; $('#root').innerHTML = ''; render(); if (I) I.apply(); }); }
function render() {
  if (setting('pinEnabled') && !currentUser) { renderLock(); bindLang(); return; }
  const nav = NAV.find(n => n[0] === route) || NAV[0];
  if (nav[3] && !isOwner()) route = 'dash';
  $('#root').innerHTML = shell();
  $('#ptitle').textContent = (NAV.find(n => n[0] === route) || NAV[0])[1];
  $$('[data-go]').forEach(a => a.onclick = e => { e.preventDefault(); go(a.dataset.go); });
  $('#menuBtn').onclick = () => { $('#side').classList.add('open'); $('#scrim').classList.add('on'); };
  $('#scrim').onclick = () => { $('#side').classList.remove('open'); $('#scrim').classList.remove('on'); };
  bindLang();
  const lo = $('#logout'); if (lo) lo.onclick = e => { e.preventDefault(); currentUser = null; render(); };
  const page = $('#page');
  ({ dash: pageDash, pos: pagePOS, meds: pageMeds, purchase: pagePurchase, delivery: pageDelivery, dues: pageDues, alerts: pageAlerts, ix: pageIx, reports: pageReports, settings: pageSettings }[route] || pageDash)(page);
}
const refreshNav = () => { /* সাইডবারের গণনা হালনাগাদ */ const ac = alertCounts(); const a = $('[data-go=alerts] .cnt'); if (a) a.textContent = bnNum(ac.total, 0); };

/* ---------- লক স্ক্রিন ---------- */
function renderLock() {
  const users = D.users; let sel = users[0]?.id; let pin = '';
  $('#root').innerHTML = `<div class="lock"><div class="box"><div class="right" style="margin:-12px -10px 4px 0">${langSwitch()}</div><img src="img/logo.png" style="width:120px"><h2 style="margin:6px 0 2px;color:var(--navy-d)">স্বাগতম</h2><div class="muted">আপনার নাম বেছে পিন দিন</div>
    <select class="in mt" id="lu">${users.map(u => `<option value="${u.id}">${esc(u.name)} — ${u.role === 'owner' ? tt('মালিক') : tt('বিক্রেতা')}</option>`).join('')}</select>
    <div class="dots" id="dots"></div><div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '⌫', 0, '✓'].map(k => `<button data-k="${k}">${k === '⌫' || k === '✓' ? k : bnNum(k, 0)}</button>`).join('')}</div></div></div>`;
  const dots = () => $('#dots').innerHTML = Array.from({ length: Math.max(4, pin.length) }, (_, i) => `<i class="${i < pin.length ? 'f' : ''}"></i>`).join('');
  dots();
  const tryLogin = () => { const u = byId('users', $('#lu').value); if (u && u.pin === hashPin(pin)) { currentUser = { id: u.id, name: u.name, role: u.role }; route = 'dash'; render(); } else { toast('পিন ভুল হয়েছে', 'err'); pin = ''; dots(); } };
  $$('.pad button').forEach(b => b.onclick = () => { const k = b.dataset.k; if (k === '⌫') pin = pin.slice(0, -1); else if (k === '✓') return tryLogin(); else if (pin.length < 8) pin += k; dots(); if (pin.length >= 4 && pin.length === (byId('users', $('#lu').value)?.pinLen || 4)) tryLogin(); });
  document.onkeydown = e => { if (!$('.lock')) { document.onkeydown = null; return; } if (/^\d$/.test(e.key)) { pin += e.key; dots(); } else if (e.key === 'Backspace') { pin = pin.slice(0, -1); dots(); } else if (e.key === 'Enter') tryLogin(); };
}

/* ---------- হিসাব সহায়ক ---------- */
function balanceOf(type, id) { return r2(D.ledger.filter(l => l.partyType === type && l.partyId === id).reduce((a, l) => a + (l.kind === 'due' ? l.amount : -l.amount), 0)); }
const salesBetween = (a, b) => D.sales.filter(s => s.date.slice(0, 10) >= a && s.date.slice(0, 10) <= b && !s.void);
const salesBetweenAll = (a, b) => D.sales.filter(s => s.date.slice(0, 10) >= a && s.date.slice(0, 10) <= b);
const retQty = i => i.returnedQty || 0;
const saleNet = s => s.void ? 0 : r2(s.total - (s.returnedAmount || 0));            // ফেরত বাদে বিক্রি
const saleCost = s => s.items.reduce((a, i) => a + (i.qty - retQty(i)) * (i.cost || 0), 0);
const saleProfit = s => s.void ? 0 : r2(saleNet(s) - (s.deliveryCharge || 0) - saleCost(s));
function stockValue() { const t = today(); let cost = 0, mrp = 0; D.batches.forEach(b => { if (b.qty > 0 && b.expiry >= t) { const m = byId('medicines', b.medId); cost += b.qty * (b.purchasePrice || m?.purchasePrice || 0); mrp += b.qty * (m?.mrp || 0); } }); return { cost: r2(cost), mrp: r2(mrp) }; }

/* ---------- ড্যাশবোর্ড ---------- */
function pageDash(el) {
  const t = today(); const ts = salesBetween(t, t); const tTot = ts.reduce((a, s) => a + saleNet(s), 0); const tProf = ts.reduce((a, s) => a + saleProfit(s), 0);
  const custDue = D.customers.reduce((a, c) => a + Math.max(0, balanceOf('customer', c.id)), 0);
  const supDue = D.suppliers.reduce((a, c) => a + Math.max(0, balanceOf('supplier', c.id)), 0);
  const sv = stockValue(); const ac = alertCounts();
  const days = Array.from({ length: 14 }, (_, i) => addDays(t, i - 13)); const vals = days.map(d => salesBetween(d, d).reduce((a, s) => a + saleNet(s), 0)); const mx = Math.max(1, ...vals);
  const lastB = setting('lastBackup'); const bOld = !lastB || daysBetween(lastB.slice(0, 10), t) >= 7;
  const recent = [...D.sales].filter(s => !s.void).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  el.innerHTML = `
  ${setting('hasSample') ? `<div class="alert amber">${ic('info')}<div><b>এখন নমুনা (sample) ডেটা দেখানো হচ্ছে।</b> <span>ওষুধের দাম, স্টক ও বিক্রি কাল্পনিক — বাস্তব দাম নয়।</span> ${isOwner() ? '<span>চেষ্টা করে দেখার পর</span> <a href="#" data-go2="settings">ব্যাকআপ ও সেটিংস</a> <span>থেকে নমুনা ডেটা মুছে DGDA ও সাপ্লায়ারের ইনভয়েসের আসল দাম বসান।</span>' : '<span>চেষ্টা করে দেখার পর মালিককে বলে নমুনা ডেটা মুছে DGDA ও সাপ্লায়ারের ইনভয়েসের আসল দাম বসান।</span>'}</div></div>` : ''}
  ${bOld && isOwner() ? `<div class="alert navy">${ic('download')}<div style="flex:1"><b>ব্যাকআপ নেওয়ার সময় হয়েছে।</b> <span>${lastB ? 'শেষ ব্যাকআপ: ' + bnDate(lastB) + '।' : 'এখনও কোনো ব্যাকআপ নেওয়া হয়নি।'}</span> <span>সপ্তাহে অন্তত একবার ব্যাকআপ ফাইল পেনড্রাইভ বা Google Drive-এ রাখুন।</span></div><button class="btn teal sm" id="qBackup">${ic('download')} এখনই ব্যাকআপ</button></div>` : ''}
  <div class="grid g4">
    <div class="card stat c-pink"><div class="ic">${ic('cart')}</div><div><div class="v">${tk(tTot)}</div><div class="l">আজকের বিক্রি · ${bnNum(ts.length, 0)}টি রসিদ</div></div></div>
    ${isOwner() ? `<div class="card stat c-teal"><div class="ic">${ic('trend')}</div><div><div class="v">${tk(tProf)}</div><div class="l">আজকের লাভ (আনুমানিক)</div></div></div>
    <div class="card stat c-navy"><div class="ic">${ic('box')}</div><div><div class="v">${tk(sv.cost)}</div><div class="l">স্টকের ক্রয়মূল্য · MRP ${tk(sv.mrp)}</div></div></div>` : `<div class="card stat c-navy"><div class="ic">${ic('pill')}</div><div><div class="v">${bnNum(D.medicines.length, 0)}</div><div class="l">মোট ওষুধ</div></div></div>`}
    <div class="card stat c-amber"><div class="ic">${ic('wallet')}</div><div><div class="v">${tk(custDue)}</div><div class="l">গ্রাহকের কাছে বাকি${isOwner() ? ' · সাপ্লায়ারকে দেনা ' + tk(supDue) : ''}</div></div></div>
  </div>
  <div class="grid mt g21">
    <div class="card"><h3>গত ১৪ দিনের বিক্রি</h3>
      <div class="bars">${vals.map((v, i) => `<div class="b ${i === 13 ? 'today' : ''}" title="${bnDate(days[i])}: ${tk(v)}"><i style="height:${Math.max(2, v / mx * 140)}px"></i><span>${bnNum(+days[i].slice(8), 0)}</span></div>`).join('')}</div></div>
    <div class="card"><h3>স্টক সতর্কতা</h3>
      ${[['মেয়াদোত্তীর্ণ ব্যাচ', ac.exp, 'b-red'], ['৯০ দিনের মধ্যে মেয়াদ শেষ', ac.soon, 'b-amber'], ['কম স্টক (রি-অর্ডার দরকার)', ac.low, 'b-pink']].map(x => `<div class="row" style="justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--line)"><span>${x[0]}</span><span class="badge ${x[2]}" style="font-size:15px">${bnNum(x[1], 0)}</span></div>`).join('')}
      <button class="btn sm mt" data-go2="alerts">বিস্তারিত দেখুন →</button></div>
  </div>
  <div class="card mt"><div class="row" style="justify-content:space-between"><h3 style="margin:0">সাম্প্রতিক বিক্রি</h3><button class="btn sm" data-go2="pos">${ic('plus')} নতুন বিক্রি</button></div>
    ${recent.length ? `<div class="twrap"><table class="tbl mt"><tr><th>রসিদ</th><th>সময়</th><th>গ্রাহক</th><th>আইটেম</th><th class="num">মোট</th><th></th></tr>${recent.map(s => `<tr><td><b>${s.no}</b></td><td>${bnDateTime(s.date)}</td><td>${esc(s.custName || 'সাধারণ গ্রাহক')}</td><td>${bnNum(s.items.length, 0)}টি</td><td class="num"><b>${tk(saleNet(s))}</b></td><td class="right"><button class="btn sm" data-rc="${s.id}">${ic('print')} রসিদ</button></td></tr>`).join('')}</table></div>` : empty('🧾', 'এখনও কোনো বিক্রি হয়নি', 'প্রথম বিক্রি করতে "নতুন বিক্রি" চাপুন।')}
  </div>`;
  $$('[data-go2]', el).forEach(a => a.onclick = e => { e.preventDefault(); go(a.dataset.go2); });
  $$('[data-rc]', el).forEach(b => b.onclick = () => showReceipt(byId('sales', b.dataset.rc)));
  const qb = $('#qBackup'); if (qb) qb.onclick = () => { doBackup(); render(); };
}

/* ---------- POS ---------- */
const POS = { cart: [], mode: 'retail', disc: '', discType: 'tk', paid: '', paidTouched: false, custName: '', custPhone: '', delivery: false, address: '', dcharge: '', other: '', q: '', sel: 0 };
const priceFor = (m, mode) => mode === 'wholesale' ? (m.wholesalePrice || m.mrp) : (m.mrp || m.marketPrice);
let SM = { k: '' };
function searchMeds(q) {
  const raw = String(q || '').trim(); q = norm(q); if (!q) return [];
  const key = q + '|' + VER.medicines + '|' + VER.batches + '|' + D.medicines.length; if (SM.k === key) return SM.r;
  const qs = hasBn(raw) ? bnSkel(raw) : ''; // বাংলায় লিখলে উচ্চারণ মিলিয়েও খোঁজা
  const X = medIdx(); const sm = stockMap().m; const scored = [];
  for (const e of X.list) {
    let s = 0;
    if (e.b.startsWith(q) || (e.bn && e.bn.startsWith(q))) s = 100; else if (e.b.includes(q) || (e.bn && e.bn.includes(q))) s = 70; else if (e.g.startsWith(q)) s = 60; else if (e.g.includes(q)) s = 40; else if (e.c.includes(q) || (e.m.barcode && e.m.barcode === q)) s = 20;
    else if (qs.length >= 2) { if (bSk(e).startsWith(qs)) s = 55; else if (gSk(e).startsWith(qs)) s = 35; }
    if (s) scored.push({ m: e.m, s: s + ((sm.get(e.m.id) || 0) > 0 ? 5 : 0) + (e.m.catalog ? 0 : 1), alt: false });
  }
  scored.sort((a, b) => b.s - a.s); // ইনডেক্স আগে থেকেই নাম অনুযায়ী সাজানো
  const top = scored.slice(0, 10); const ids = new Set(top.map(x => x.m.id));
  const gens = [...new Set(top.filter(x => x.s >= 70).map(x => norm(x.m.generic)))];
  const alts = []; gens.forEach(g => (X.gm.get(g) || []).forEach(m => { if (!ids.has(m.id)) { ids.add(m.id); alts.push(m); } }));
  alts.sort((a, b) => (sm.get(b.id) || 0 ? 1 : 0) - (sm.get(a.id) || 0 ? 1 : 0)).slice(0, 6).forEach(m => top.push({ m, alt: true }));
  const r = top.slice(0, 16); SM = { k: key, r }; return r;
}
function cartTotals() {
  const sub = r2(POS.cart.reduce((a, i) => a + i.qty * i.price, 0));
  const dv = num(POS.disc); const disc = r2(Math.min(sub, POS.discType === 'pct' ? sub * dv / 100 : dv));
  const dch = POS.delivery ? num(POS.dcharge) : 0; const total = r2(sub - disc + dch);
  const paid = POS.paidTouched ? num(POS.paid) : total;
  return { sub, disc, dch, total, paid, due: r2(Math.max(0, total - paid)), change: r2(Math.max(0, paid - total)) };
}
function pagePOS(el) {
  el.innerHTML = `<div class="pos">
   <div>
    <div class="card">
      <div class="search-wrap">${ic('search', 's')}<input id="q" class="search" placeholder="ওষুধ খুঁজুন — ব্র্যান্ড, জেনেরিক বা বাংলা নাম (যেমন: napa, নাপা, omeprazole)" autocomplete="off" value="${esc(POS.q)}"></div>
      <div class="hint hide-m"><span class="kbd">F2</span> খোঁজা &nbsp; <span class="kbd">↑</span><span class="kbd">↓</span> বাছাই &nbsp; <span class="kbd">Enter</span> যোগ &nbsp; <span class="kbd">F4</span> খুচরা/পাইকারি &nbsp; <span class="kbd">F9</span> বিক্রি সম্পন্ন &nbsp; <span class="kbd">Esc</span> মুছুন</div>
      <div class="results" id="results"></div>
    </div>
    <div id="ixBox" class="mt"></div>
    <div class="card mt cart"><div class="row" style="justify-content:space-between"><h3 style="margin:0">কার্ট</h3>${POS.cart.length ? '<button class="btn sm danger" id="clr">সব মুছুন</button>' : ''}</div><div id="cartBox"></div></div>
   </div>
   <div class="card" style="position:sticky;top:84px">
     <div class="row" style="justify-content:space-between;margin-bottom:12px"><b>দামের ধরন</b><div class="seg" id="mode"><button data-m="retail" class="${POS.mode === 'retail' ? 'on' : ''}">খুচরা (MRP)</button><button data-m="wholesale" class="${POS.mode === 'wholesale' ? 'on' : ''}">পাইকারি</button></div></div>
     <label class="f"><span>গ্রাহক / রোগীর নাম</span><input class="in" id="cn" list="custList" value="${esc(POS.custName)}" placeholder="ঐচ্ছিক (বাকি থাকলে লাগবে)"></label>
     <datalist id="custList">${D.customers.map(c => `<option value="${esc(c.name)}">${esc(c.phone)}</option>`).join('')}</datalist>
     <label class="f"><span>মোবাইল নম্বর</span><input class="in" id="cp" inputmode="tel" value="${esc(POS.custPhone)}" placeholder="01XXXXXXXXX"></label>
     <label class="f"><span>রোগী আর কোনো ওষুধ খান? (জেনেরিক, কমা দিয়ে)</span><input class="in" id="oth" value="${esc(POS.other)}" placeholder="যেমন: Warfarin, Alcohol"></label>
     <label class="row" style="gap:8px;font-weight:600;margin-bottom:10px;cursor:pointer"><input type="checkbox" id="dlv" ${POS.delivery ? 'checked' : ''} style="width:20px;height:20px"> হোম ডেলিভারি</label>
     <div id="dlvBox" style="display:${POS.delivery ? 'block' : 'none'}"><label class="f"><span>ঠিকানা</span><input class="in" id="addr" value="${esc(POS.address)}"></label><label class="f"><span>ডেলিভারি চার্জ (৳)</span><input class="in" id="dch" inputmode="decimal" value="${esc(POS.dcharge)}"></label></div>
     <div class="row" style="gap:8px;margin-bottom:12px"><label class="f" style="flex:1;margin:0"><span>ছাড় <span class="kbd">F8</span></span><input class="in" id="disc" inputmode="decimal" value="${esc(POS.disc)}" placeholder="০"></label><div class="seg" id="dt" style="margin-top:26px"><button data-d="tk" class="${POS.discType === 'tk' ? 'on' : ''}">৳</button><button data-d="pct" class="${POS.discType === 'pct' ? 'on' : ''}">%</button></div></div>
     <div class="totals" id="tots"></div>
     <label class="f mt"><span>জমা (নগদ)</span><input class="in" id="paid" inputmode="decimal" style="font-size:20px;font-weight:700" placeholder="পুরো টাকা"></label>
     <div id="chg" class="mb"></div>
     <div class="mbar" id="mbar"><div><div class="small">সর্বমোট</div><b id="mbt">৳০</b></div><button class="btn pri" id="mdone">${ic('check')} বিক্রি সম্পন্ন</button></div>
     <button class="btn xl pri" id="done">${ic('check')} বিক্রি সম্পন্ন <span class="kbd" style="background:transparent;color:#fff;border-color:#fff8">F9</span></button>
   </div></div>`;
  const q = $('#q'); q.focus(); drawResults(); drawCart();
  const drawDeb = debounce(drawResults, 120);
  q.oninput = () => { POS.q = q.value; POS.sel = 0; if (bigList()) drawDeb(); else drawResults(); };
  q.onkeydown = e => {
    const items = searchMeds(POS.q);
    if (e.key === 'ArrowDown') { POS.sel = Math.min(items.length - 1, POS.sel + 1); drawResults(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { POS.sel = Math.max(0, POS.sel - 1); drawResults(); e.preventDefault(); }
    else if (e.key === 'Enter') { if (items[POS.sel]) addToCart(items[POS.sel].m); e.preventDefault(); }
    else if (e.key === 'Escape') { POS.q = ''; q.value = ''; drawResults(); }
  };
  const bind = (id, key, cb) => { const x = $('#' + id); x.oninput = () => { POS[key] = x.value; cb && cb(); }; };
  bind('cn', 'custName', () => { const c = D.customers.find(c => c.name === POS.custName); if (c) { POS.custPhone = c.phone; $('#cp').value = c.phone; if (c.type === 'wholesale' && POS.mode !== 'wholesale') setMode('wholesale'); } });
  bind('cp', 'custPhone', () => { const c = D.customers.find(c => c.phone && c.phone.replace(/\D/g, '') === POS.custPhone.replace(/\D/g, '')); if (c && !POS.custName) { POS.custName = c.name; $('#cn').value = c.name; } });
  bind('oth', 'other', drawIx); bind('addr', 'address'); bind('dch', 'dcharge', drawTotals); bind('disc', 'disc', drawTotals);
  $('#paid').oninput = e => { POS.paid = e.target.value; POS.paidTouched = e.target.value !== ''; drawTotals(false); };
  if (POS.paidTouched) $('#paid').value = POS.paid;
  $('#dlv').onchange = e => { POS.delivery = e.target.checked; $('#dlvBox').style.display = POS.delivery ? 'block' : 'none'; drawTotals(); };
  $$('#mode button').forEach(b => b.onclick = () => setMode(b.dataset.m));
  $$('#dt button').forEach(b => b.onclick = () => { POS.discType = b.dataset.d; $$('#dt button').forEach(x => x.classList.toggle('on', x === b)); drawTotals(); });
  $('#done').onclick = completeSale; $('#mdone').onclick = completeSale;
  const clr = $('#clr'); if (clr) clr.onclick = async () => { if (await confirmBox('কার্টের সব ওষুধ মুছে ফেলবেন?', 'হ্যাঁ, মুছুন')) { POS.cart = []; render(); } };
}
function setMode(m) {
  POS.mode = m; POS.cart.forEach(i => { const md = byId('medicines', i.medId); if (md) i.price = priceFor(md, m); });
  $$('#mode button').forEach(x => x.classList.toggle('on', x.dataset.m === m)); drawResults(); drawCart();
}
function drawResults() {
  const box = $('#results'); if (!box) return; const items = searchMeds(POS.q);
  if (!POS.q) { box.innerHTML = POS.cart.length ? '' : `<div class="empty" style="padding:24px"><div class="e-ic">💊</div><b>ওষুধের নাম লিখতে শুরু করুন</b><div>২-৩টি অক্ষর লিখলেই তালিকা আসবে, Enter চাপলে কার্টে যোগ হবে</div></div>`; return; }
  if (!items.length) { box.innerHTML = empty('🔍', 'কিছু পাওয়া যায়নি', 'বানান দেখে নিন, অথবা ওষুধ তালিকায় নতুন ওষুধ যোগ করুন।', '<button class="btn sm" id="qadd">+ নতুন ওষুধ যোগ করুন</button>'); const qa = $('#qadd'); if (qa) qa.onclick = () => medForm(null, POS.q); return; }
  let altShown = false;
  box.innerHTML = items.map((x, i) => {
    const m = x.m; const st = stockOf(m.id); let head = '';
    if (x.alt && !altShown) { altShown = true; head = `<div class="small muted" style="margin:10px 4px 6px;font-weight:600">একই জেনেরিকের অন্যান্য ব্র্যান্ড (বিকল্প)</div>`; }
    return head + `<div class="res ${i === POS.sel ? 'sel' : ''} ${st <= 0 ? 'out' : ''}" data-i="${i}">
      <div><div class="nm">${esc(m.brand)} ${m.nameBn && LG() === 'bn' ? `<span class="small muted" style="font-weight:500">${esc(m.nameBn)}</span> ` : ''}<span style="font-weight:400;font-size:15px">${esc(m.strength)} · ${esc(formL(m.form))}</span> ${x.alt ? '<span class="badge b-teal">বিকল্প</span>' : ''} ${m.rx ? '<span class="badge b-pink">Rx</span>' : ''} ${m.controlled ? '<span class="badge ctl">নিয়ন্ত্রিত</span>' : ''}</div>
      <div class="gn">${esc(m.generic)} · ${esc(m.company)}${m.rack ? ' · <span>র‍্যাক ' + esc(m.rack) + '</span>' : ''}</div></div>
      <div class="pr"><b>${tk(priceFor(m, POS.mode))}</b><div class="small ${st <= 0 ? 'muted' : st <= (m.reorder || 0) ? '' : 'muted'}">${st > 0 ? 'স্টক ' + bnNum(st, 0) : 'স্টক নেই'}</div></div></div>`;
  }).join('');
  $$('.res', box).forEach(r => r.onclick = () => addToCart(items[+r.dataset.i].m));
  const s = $('.res.sel', box); s && s.scrollIntoView({ block: 'nearest' });
}
function addToCart(m, qty = 1) {
  const st = stockOf(m.id);
  if (st <= 0) { toast(`${m.brand}: স্টক নেই। আগে "ক্রয় / স্টক-ইন" থেকে স্টক যোগ করুন।`, 'err'); return; }
  const ex = POS.cart.find(i => i.medId === m.id);
  if (ex) { if (ex.qty + qty > st) return toast(`স্টকে আছে মাত্র ${bnNum(st, 0)}টি`, 'err'); ex.qty += qty; }
  else POS.cart.push({ medId: m.id, name: m.brand, generic: m.generic, strength: m.strength, form: m.form, qty, price: priceFor(m, POS.mode) });
  POS.q = ''; POS.sel = 0; const q = $('#q'); if (q) { q.value = ''; q.focus(); }
  if ($('#clr') == null && POS.cart.length === 1) { render(); return; }
  drawResults(); drawCart();
}
function drawCart() {
  const box = $('#cartBox'); if (!box) return;
  if (!POS.cart.length) { box.innerHTML = empty('🛒', 'কার্ট খালি', 'উপরের খোঁজার ঘরে ওষুধের নাম লিখে Enter চাপুন।'); drawIx(); drawTotals(); return; }
  box.innerHTML = `<div class="twrap"><table class="tbl"><tr><th>ওষুধ</th><th class="num">দাম</th><th style="text-align:center">পরিমাণ</th><th class="num">মোট</th><th></th></tr>
  ${POS.cart.map((i, k) => { const m = byId('medicines', i.medId); const alts = D.medicines.filter(x => x.id !== i.medId && norm(x.generic) === norm(i.generic)).length; const adr = adrFor(i.generic);
    return `<tr><td><b>${esc(i.name)}</b> <span class="small">${esc(i.strength)} · ${esc(formL(i.form))}</span>${m?.rx ? ' <span class="badge b-pink">Rx</span>' : ''}${m?.antibiotic ? ' <span class="badge b-amber">অ্যান্টিবায়োটিক</span>' : ''}<div class="small muted">${esc(i.generic)} ${alts ? `· <a href="#" data-alt="${k}">বিকল্প ${bnNum(alts, 0)}টি</a>` : ''} ${adr.length ? `· <a href="#" data-adr="${k}">পার্শ্বপ্রতিক্রিয়া</a>` : ''}</div></td>
    <td class="num"><input class="in" style="width:86px;min-height:38px;text-align:right" data-pr="${k}" value="${i.price}" inputmode="decimal"></td>
    <td style="text-align:center"><div class="qty"><button class="iconbtn" data-dec="${k}">−</button><input class="in" data-q="${k}" value="${i.qty}" inputmode="numeric"><button class="iconbtn" data-inc="${k}">+</button></div></td>
    <td class="num"><b>${tk(i.qty * i.price)}</b></td><td class="right"><button class="iconbtn" data-rm="${k}" title="মুছুন" style="color:var(--red)">${ic('trash')}</button></td></tr>`; }).join('')}</table></div>`;
  const setQ = (k, v) => { const i = POS.cart[k]; const st = stockOf(i.medId); v = Math.floor(num(v)); if (v > st) { toast(`স্টকে আছে মাত্র ${bnNum(st, 0)}টি`, 'err'); v = st; } if (v <= 0) POS.cart.splice(k, 1); else i.qty = v; drawCart(); };
  $$('[data-inc]', box).forEach(b => b.onclick = () => setQ(+b.dataset.inc, POS.cart[+b.dataset.inc].qty + 1));
  $$('[data-dec]', box).forEach(b => b.onclick = () => setQ(+b.dataset.dec, POS.cart[+b.dataset.dec].qty - 1));
  $$('[data-q]', box).forEach(b => b.onchange = () => setQ(+b.dataset.q, b.value));
  $$('[data-pr]', box).forEach(b => b.onchange = () => { POS.cart[+b.dataset.pr].price = num(b.value); drawCart(); });
  $$('[data-rm]', box).forEach(b => b.onclick = () => { POS.cart.splice(+b.dataset.rm, 1); drawCart(); });
  $$('[data-alt]', box).forEach(a => a.onclick = e => { e.preventDefault(); altModal(+a.dataset.alt); });
  $$('[data-adr]', box).forEach(a => a.onclick = e => { e.preventDefault(); adrModal(POS.cart[+a.dataset.adr].generic); });
  drawIx(); drawTotals();
}
function altModal(k) {
  const i = POS.cart[k]; const alts = D.medicines.filter(x => x.id !== i.medId && norm(x.generic) === norm(i.generic));
  const ov = modal(`${esc(i.name)} — বিকল্প ব্র্যান্ড`, `<p class="muted" style="margin-top:0">জেনেরিক: <b>${esc(i.generic)}</b>। একই শক্তি (strength) ও ধরন মিলিয়ে নিন।</p><table class="tbl"><tr><th>ব্র্যান্ড</th><th>কোম্পানি</th><th class="num">দাম</th><th class="num">স্টক</th><th></th></tr>${alts.map(m => `<tr><td><b>${esc(m.brand)}</b> ${esc(m.strength)} · ${esc(formL(m.form))}</td><td>${esc(m.company)}</td><td class="num">${tk(priceFor(m, POS.mode))}</td><td class="num">${bnNum(stockOf(m.id), 0)}</td><td class="right"><button class="btn sm teal" data-sw="${m.id}" ${stockOf(m.id) <= 0 ? 'disabled' : ''}>বদলে দিন</button></td></tr>`).join('')}</table>`);
  $$('[data-sw]', ov).forEach(b => b.onclick = () => { const m = byId('medicines', b.dataset.sw); const qty = Math.min(i.qty, stockOf(m.id)); POS.cart.splice(k, 1); ov.close(); addToCart(m, qty); });
}
function adrModal(generic) {
  const list = adrFor(generic);
  modal(`পার্শ্বপ্রতিক্রিয়া ও সতর্কতা — ${esc(generic)}`, list.length ? list.map(a => `<div class="card mb" style="box-shadow:none"><h3>${esc(a.generic)}</h3><p><b>সাধারণ:</b> ${esc(a.common)}</p><p><b>গুরুতর:</b> ${esc(a.serious)}</p><p><b>সতর্কতা:</b> ${esc(a.caution)}</p><div class="small muted"><span>সূত্র:</span> <span>${esc(a.source)}</span></div></div>`).join('') + disclaimer() : empty('ℹ️', 'এই জেনেরিকের তথ্য যোগ করা হয়নি', '"ইন্টার‍্যাকশন" পাতা থেকে যোগ করতে পারেন।'));
}
const disclaimer = () => `<div class="alert info small">${ic('info')}<div>এটি শুধু সহায়ক তথ্য — ফার্মাসিস্ট বা চিকিৎসকের সিদ্ধান্তের বিকল্প নয়। তালিকাটি সম্পূর্ণ নয়; কোনো সতর্কতা না দেখালেই ওষুধ নিরাপদ, এমন ভাববেন না।</div></div>`;
function drawIx() {
  const box = $('#ixBox'); if (!box) return;
  const gens = POS.cart.map(i => i.generic).concat(POS.other.split(/[,،;]/).map(s => s.trim()).filter(Boolean));
  const f = checkInteractions(gens);
  box.innerHTML = f.length ? f.map(x => `<div class="alert ${x.it.severity === 'গুরুতর' ? 'red' : 'amber'}">${ic('alert')}<div><b>ড্রাগ ইন্টার‍্যাকশন (${esc(tt(x.it.severity))}): ${esc(x.it.a)} + ${esc(x.it.b)}</b><div>${esc(x.it.note)}</div><div class="small" style="opacity:.8"><span>সূত্র:</span> <span>${esc(x.it.source)}</span> <span>· এটি সহায়ক সতর্কতা, ফার্মাসিস্ট/চিকিৎসকের সিদ্ধান্তের বিকল্প নয়।</span></div></div></div>`).join('') : '';
}
function drawTotals(updatePaid = true) {
  const box = $('#tots'); if (!box) return; const T = cartTotals();
  box.innerHTML = `<div class="tr"><span>উপমোট (${bnNum(POS.cart.reduce((a, i) => a + i.qty, 0), 0)}টি)</span><b>${tk(T.sub)}</b></div>${T.disc ? `<div class="tr"><span>ছাড়</span><b>− ${tk(T.disc)}</b></div>` : ''}${T.dch ? `<div class="tr"><span>ডেলিভারি চার্জ</span><b>+ ${tk(T.dch)}</b></div>` : ''}<div class="tr grand"><span>সর্বমোট</span><span>${tk(T.total)}</span></div>`;
  const mb = $('#mbt'); if (mb) { mb.textContent = tk(T.total); $('#mbar').classList.toggle('show', POS.cart.length > 0); }
  const p = $('#paid'); if (p && !POS.paidTouched) p.placeholder = 'পুরো টাকা: ' + bnNum(T.total);
  $('#chg').innerHTML = T.due > 0 ? `<div class="alert amber" style="margin:0">${ic('wallet')}<div>বাকি থাকবে <b>${tk(T.due)}</b> — গ্রাহকের নাম ও মোবাইল দিন</div></div>` : T.change > 0 ? `<div class="alert info" style="margin:0">${ic('money')}<div>ফেরত দিন <b>${tk(T.change)}</b></div></div>` : '';
}
async function completeSale() {
  if (!POS.cart.length) { toast('কার্ট খালি — আগে ওষুধ যোগ করুন', 'err'); $('#q')?.focus(); return; }
  const T = cartTotals();
  if (T.due > 0 && (!POS.custName.trim() || !POS.custPhone.trim())) { toast('বাকি রাখতে গ্রাহকের নাম ও মোবাইল নম্বর দিন', 'err'); $(POS.custName.trim() ? '#cp' : '#cn').focus(); return; }
  if (POS.delivery && !POS.address.trim()) { toast('হোম ডেলিভারির ঠিকানা দিন', 'err'); $('#addr').focus(); return; }
  const gens = POS.cart.map(i => i.generic).concat(POS.other.split(/[,;]/).map(s => s.trim()).filter(Boolean));
  const serious = checkInteractions(gens).filter(x => x.it.severity === 'গুরুতর');
  if (serious.length && !(await confirmBox(`কার্টে <b>গুরুতর ড্রাগ ইন্টার‍্যাকশন</b> আছে (${serious.map(x => esc(x.it.a + ' + ' + x.it.b)).join(', ')})। ফার্মাসিস্ট/চিকিৎসকের সাথে নিশ্চিত হয়েছেন? তবুও বিক্রি করবেন?`, 'হ্যাঁ, নিশ্চিত হয়েছি'))) return;
  // স্টক কাটা — আগে যেটার মেয়াদ শেষ হবে সেটা আগে (FEFO)
  const t = today(); const items = []; const changed = [];
  for (const i of POS.cart) {
    let need = i.qty; let cost = 0; const allocs = [];
    const bs = D.batches.filter(b => b.medId === i.medId && b.qty > 0 && b.expiry >= t).sort((a, b) => a.expiry.localeCompare(b.expiry));
    for (const b of bs) { if (!need) break; const take = Math.min(need, b.qty); b.qty -= take; need -= take; cost += take * (b.purchasePrice || 0); allocs.push({ batchId: b.id, batchNo: b.batchNo, expiry: b.expiry, qty: take }); changed.push(b); }
    if (need > 0) { toast(`${i.name}: যথেষ্ট স্টক নেই`, 'err'); await loadAll(); return; }
    items.push({ ...i, cost: r2(cost / i.qty), allocs });
  }
  await putMany('batches', changed);
  let customerId = '';
  if (POS.custPhone.trim() || POS.custName.trim()) {
    let c = D.customers.find(c => POS.custPhone.trim() && c.phone.replace(/\D/g, '') === POS.custPhone.replace(/\D/g, '')) || D.customers.find(c => c.name === POS.custName.trim());
    if (!c) c = await put('customers', { name: POS.custName.trim() || POS.custPhone, phone: POS.custPhone.trim(), address: POS.address, type: POS.mode === 'wholesale' ? 'wholesale' : 'retail', created: t });
    customerId = c.id;
  }
  const no = (setting('saleNo') || 0) + 1; await setSetting('saleNo', no);
  const sale = await put('sales', { no: 'S-' + String(no).padStart(5, '0'), date: t + 'T' + new Date().toTimeString().slice(0, 8), localDate: t, mode: POS.mode, items, subtotal: T.sub, discount: T.disc, deliveryCharge: T.dch, total: T.total, paid: Math.min(T.paid, T.total), received: T.paid, change: T.change, due: T.due, custName: POS.custName.trim(), custPhone: POS.custPhone.trim(), customerId, user: currentUser?.name || 'মালিক', delivery: POS.delivery });
  if (T.due > 0) await put('ledger', { partyType: 'customer', partyId: customerId, kind: 'due', amount: T.due, date: t, ref: sale.no, note: 'বিক্রি বাকি' });
  if (POS.delivery) await put('deliveries', { saleId: sale.id, saleNo: sale.no, name: POS.custName || 'গ্রাহক', phone: POS.custPhone, address: POS.address, charge: T.dch, total: T.total, status: 'নতুন', date: sale.date, history: [{ s: 'নতুন', at: sale.date }] });
  Object.assign(POS, { cart: [], disc: '', paid: '', paidTouched: false, custName: '', custPhone: '', delivery: false, address: '', dcharge: '', other: '', q: '' });
  toast(`বিক্রি সম্পন্ন — ${sale.no}`, 'ok'); render(); showReceipt(sale);
}

/* ---------- রসিদ ---------- */
function receiptHTML(s, size) {
  const shop = shopL();
  const rows = s.items.map((i, k) => size === 'a4' ? `<tr><td>${k + 1}</td><td><b>${esc(i.name)}</b> ${esc(i.strength)} ${esc(formL(i.form))}<br><small>${esc(i.generic)}</small>${retQty(i) ? `<br><small>(<span>ফেরত এসেছে ${bnNum(retQty(i), 0)}টি</span>)</small>` : ''}</td><td class="n">${bnNum(i.qty, 0)}</td><td class="n">${bnNum(i.price)}</td><td class="n">${bnNum(r2(i.qty * i.price))}</td></tr>`
    : `<tr><td colspan="3"><b>${esc(i.name)}</b> ${esc(i.strength)}</td></tr><tr><td>${bnNum(i.qty, 0)} × ${bnNum(i.price)}${retQty(i) ? ` <small>(<span>ফেরত ${bnNum(retQty(i), 0)}টি</span>)</small>` : ''}</td><td></td><td class="n">${bnNum(r2(i.qty * i.price))}</td></tr>`).join('');
  const ret = s.returnedAmount || 0;
  return `<div class="rc ${size === 'a4' ? 'a4' : 'r80'}">${s.void ? '<div class="rvoid">বাতিল করা বিক্রি</div>' : ''}<div class="rh"><img src="img/logo.png"><b>${esc(shop.name)}</b>${esc(shop.type)}<br>${esc(shop.address)}<br><span>মোবাইল:</span> ${esc(shop.phone)}<br><i>${esc(shop.slogan)}</i></div>
  <div><span>রসিদ নং:</span> <b>${s.no}</b>${size === 'a4' ? ' &nbsp; | &nbsp; ' : '<br>'}<span>তারিখ:</span> ${bnDateTime(s.date)}${s.mode === 'wholesale' ? ' · <span>পাইকারি</span>' : ''}<br>${s.custName || s.custPhone ? `<span>গ্রাহক:</span> ${esc(s.custName)} ${esc(s.custPhone)}` : ''}</div>
  <table style="margin-top:6px">${size === 'a4' ? '<tr><th>#</th><th>ওষুধ</th><th class="n">পরিমাণ</th><th class="n">দর</th><th class="n">মোট</th></tr>' : ''}${rows}</table>
  <table style="border-top:1px dashed #000;margin-top:6px">${[['উপমোট', s.subtotal], s.discount ? ['ছাড়', -s.discount] : null, s.deliveryCharge ? ['ডেলিভারি চার্জ', s.deliveryCharge] : null].filter(Boolean).map(r => `<tr><td>${r[0]}</td><td class="n">${bnNum(r[1])}</td></tr>`).join('')}
  <tr class="tot"><td>সর্বমোট</td><td class="n">৳${bnNum(s.total)}</td></tr><tr><td>জমা</td><td class="n">${bnNum(s.received ?? s.paid)}</td></tr>${s.change ? `<tr><td>ফেরত</td><td class="n">${bnNum(s.change)}</td></tr>` : ''}${s.due ? `<tr class="tot"><td>বাকি</td><td class="n">${bnNum(s.due)}</td></tr>` : ''}
  ${ret ? `<tr><td>পণ্য ফেরত (সমন্বয়)</td><td class="n">−${bnNum(ret)}</td></tr><tr class="tot"><td>নিট বিক্রি</td><td class="n">৳${bnNum(saleNet(s))}</td></tr>` : ''}</table>
  <div class="rf">${esc(shop.footer || 'ধন্যবাদ')}<br><small>Sakura Pharma সফটওয়্যার</small></div></div>`;
}
function showReceipt(s) {
  if (!s) return;
  const ov = modal(`রসিদ ${s.no}`, `<div style="background:#f1f3f7;padding:16px;border-radius:12px"><div style="background:#fff;width:fit-content;margin:auto;box-shadow:var(--sh)">${receiptHTML(s, '80')}</div></div>
    ${(s.returns || []).length ? `<div class="small muted mt">${s.returns.map(r => `<div>↩ ${bnDateTime(r.date)} · <span>ফেরত</span> ${tk(r.amount)}${r.dueAdj ? ` · <span>বাকি থেকে কাটা</span> ${tk(r.dueAdj)}` : ''}${r.cash ? ` · <span>নগদ ফেরত</span> ${tk(r.cash)}` : ''}${r.reason ? ` · ${esc(r.reason)}` : ''}</div>`).join('')}</div>` : ''}`,
    `${!s.void && isOwner() ? `<button class="btn danger" data-ret>↩ <span>ফেরত / বাতিল</span></button>` : ''}<button class="btn" data-new>${ic('plus')} নতুন বিক্রি</button><button class="btn navy" data-a4>${ic('print')} A4 প্রিন্ট</button><button class="btn pri" data-80>${ic('print')} রসিদ প্রিন্ট (৮০ মিমি)</button>`, 'rcpt');
  $('[data-80]', ov).onclick = () => printReceipt(s, '80');
  $('[data-a4]', ov).onclick = () => printReceipt(s, 'a4');
  $('[data-new]', ov).onclick = () => { ov.close(); go('pos'); };
  const rb = $('[data-ret]', ov); if (rb) rb.onclick = () => returnModal(s);
  setTimeout(() => $('[data-80]', ov).focus(), 50);
}

/* ---------- বিক্রি ফেরত / বাতিল ----------
   ফেরত আসা ওষুধ যে ব্যাচ থেকে বিক্রি হয়েছিল সেখানেই স্টকে ফেরত যায়।
   ফেরতের টাকা আগে গ্রাহকের ওই বিক্রির বাকি থেকে কাটা হয়, বাকিটা নগদ ফেরত। */
function returnModal(s, all = false) {
  const items = s.items.map((i, k) => ({ k, i, left: i.qty - retQty(i) })).filter(x => x.left > 0);
  if (s.void || !items.length) return toast('এই বিক্রির সব ওষুধ আগেই ফেরত নেওয়া হয়েছে', 'err');
  const ov = modal(`ফেরত / বাতিল — ${s.no}`, `<p class="muted" style="margin-top:0">যে ওষুধ ফেরত আসছে তার পরিমাণ লিখুন। ওষুধ আবার স্টকে যোগ হবে; গ্রাহকের বাকি থাকলে ফেরতের টাকা আগে বাকি থেকে কাটা হবে।</p>
    <div class="twrap"><table class="tbl"><tr><th>ওষুধ</th><th class="num">বিক্রি</th><th class="num">আগে ফেরত</th><th class="num">দর</th><th style="text-align:center">ফেরত পরিমাণ</th></tr>
    ${items.map(x => `<tr><td><b>${esc(x.i.name)}</b> <span class="small">${esc(x.i.strength || '')}</span></td><td class="num">${bnNum(x.i.qty, 0)}</td><td class="num">${bnNum(retQty(x.i), 0)}</td><td class="num">${tk(x.i.price)}</td><td style="text-align:center"><div class="qty" style="justify-content:center"><input class="in" data-rq="${x.k}" data-max="${x.left}" inputmode="numeric" value="${all ? x.left : 0}"></div><div class="small muted">≤ ${bnNum(x.left, 0)}</div></td></tr>`).join('')}</table></div>
    <div class="row mt"><button class="btn sm" id="retAll">সব ফেরত (পুরো বিক্রি বাতিল)</button><button class="btn sm" id="retNone">সব শূন্য</button></div>
    <label class="f mt"><span>কারণ (ঐচ্ছিক)</span><input class="in" id="retWhy" placeholder="যেমন: ভুল ওষুধ, রোগী ফেরত দিয়েছেন"></label>
    <div id="retSum"></div>`,
    `<button class="btn" data-c>বাতিল</button><button class="btn pri" data-s>${ic('check')} ফেরত সংরক্ষণ</button>`);
  const calc = () => {
    const lines = $$('[data-rq]', ov).map(x => ({ k: +x.dataset.rq, q: Math.max(0, Math.min(+x.dataset.max, Math.floor(num(x.value)))) })).filter(l => l.q > 0);
    const gross = r2(lines.reduce((a, l) => a + l.q * s.items[l.k].price, 0));
    const full = lines.length > 0 && s.items.every((i, k) => i.qty - retQty(i) === (lines.find(l => l.k === k)?.q || 0));
    const ratio = s.subtotal ? Math.max(0, (s.subtotal - (s.discount || 0)) / s.subtotal) : 1;
    const amount = full ? r2(s.total - (s.returnedAmount || 0)) : r2(gross * ratio);
    const dueLeft = Math.max(0, r2((s.due || 0) - (s.dueAdjusted || 0)));
    const custBal = s.customerId ? Math.max(0, balanceOf('customer', s.customerId)) : 0;
    const dueAdj = r2(Math.min(amount, dueLeft, custBal));
    return { lines, amount, full, dueAdj, cash: r2(amount - dueAdj) };
  };
  const draw = () => {
    const c = calc();
    $('#retSum', ov).innerHTML = c.lines.length ? `<div class="alert ${c.full ? 'red' : 'info'}">${ic('info')}<div><span>ফেরত মূল্য:</span> <b>${tk(c.amount)}</b>${c.dueAdj ? `<br><span>গ্রাহকের বাকি থেকে কাটা হবে:</span> <b>${tk(c.dueAdj)}</b>` : ''}<br><span>গ্রাহককে নগদ ফেরত দিন:</span> <b>${tk(c.cash)}</b>${c.full ? '<br><b>পুরো বিক্রিটি বাতিল হবে।</b>' : ''}</div></div>` : '<div class="muted">কোনো পরিমাণ দেওয়া হয়নি।</div>';
  };
  $$('[data-rq]', ov).forEach(x => { x.oninput = draw; x.onchange = () => { const v = Math.max(0, Math.min(+x.dataset.max, Math.floor(num(x.value)))); if (String(v) !== x.value) x.value = v; draw(); }; });
  $('#retAll', ov).onclick = () => { $$('[data-rq]', ov).forEach(x => x.value = x.dataset.max); draw(); };
  $('#retNone', ov).onclick = () => { $$('[data-rq]', ov).forEach(x => x.value = 0); draw(); };
  $('[data-c]', ov).onclick = ov.close;
  draw();
  $('[data-s]', ov).onclick = async () => {
    const c = calc(); if (!c.lines.length) return toast('ফেরতের পরিমাণ লিখুন', 'err');
    if (!(await confirmBox(c.full ? `<b>${s.no}</b> — পুরো বিক্রিটি বাতিল করবেন? সব ওষুধ স্টকে ফেরত যাবে।` : `<b>${s.no}</b> — নির্বাচিত ওষুধ ফেরত নেবেন?`, 'হ্যাঁ, ফেরত নিন', false))) return;
    const t = today(); const changed = new Map();
    for (const l of c.lines) {
      const it = s.items[l.k]; let q = l.q;
      for (const a of [...(it.allocs || [])].reverse()) { // যে ব্যাচ থেকে বিক্রি হয়েছিল
        if (!q) break; const can = a.qty - (a.ret || 0); if (can <= 0) continue; const take = Math.min(q, can);
        let b = byId('batches', a.batchId) || changed.get(a.batchId);
        if (!b) b = { id: a.batchId, medId: it.medId, batchNo: a.batchNo, expiry: a.expiry, qty: 0, initQty: 0, purchasePrice: it.cost || 0, purchaseId: 'return', date: t };
        b.qty += take; changed.set(b.id, b); a.ret = (a.ret || 0) + take; q -= take;
      }
      if (q > 0) { // ব্যাচের তথ্য নেই (যেমন নমুনা বিক্রি) — আগে মেয়াদ শেষ হবে এমন ব্যাচে যোগ
        const bs = D.batches.filter(x => x.medId === it.medId);
        let b = bs.filter(x => x.expiry >= t).sort((x, y) => x.expiry.localeCompare(y.expiry))[0] || bs.sort((x, y) => y.expiry.localeCompare(x.expiry))[0];
        if (!b) b = { id: uid(), medId: it.medId, batchNo: 'RET-' + s.no, expiry: addDays(t, 365), qty: 0, initQty: 0, purchasePrice: it.cost || 0, purchaseId: 'return', date: t };
        b = changed.get(b.id) || b; b.qty += q; changed.set(b.id, b);
      }
      it.returnedQty = retQty(it) + l.q;
    }
    await putMany('batches', [...changed.values()]);
    s.returns = (s.returns || []).concat({ date: new Date().toISOString(), items: c.lines.map(l => ({ medId: s.items[l.k].medId, name: s.items[l.k].name, qty: l.q })), amount: c.amount, dueAdj: c.dueAdj, cash: c.cash, reason: $('#retWhy', ov).value.trim(), user: currentUser?.name || 'মালিক' });
    s.returnedAmount = r2((s.returnedAmount || 0) + c.amount); s.dueAdjusted = r2((s.dueAdjusted || 0) + c.dueAdj);
    if (c.full) { s.void = true; s.voidAt = new Date().toISOString(); }
    await put('sales', s);
    if (c.dueAdj > 0) await put('ledger', { partyType: 'customer', partyId: s.customerId, kind: 'return', amount: c.dueAdj, date: t, ref: s.no, note: 'ফেরত সমন্বয়' });
    if (c.full) { const d = D.deliveries.find(x => x.saleId === s.id && !['পৌঁছেছে', 'বাতিল'].includes(x.status)); if (d) { d.status = 'বাতিল'; d.history = (d.history || []).concat({ s: 'বাতিল', at: new Date().toISOString() }); await put('deliveries', d); } }
    modalStack.slice().forEach(o => o.close());
    toast(c.full ? 'বিক্রি বাতিল হয়েছে, ওষুধ স্টকে ফেরত গেছে' : 'ফেরত সংরক্ষিত হয়েছে, স্টক বেড়েছে', 'ok');
    if (c.cash > 0) toast(tt('গ্রাহককে নগদ ফেরত দিন: {0}', tk(c.cash)));
    render(); showReceipt(s);
  };
}
function printReceipt(s, size) {
  const pa = $('#printarea'); pa.innerHTML = receiptHTML(s, size); if (window.SP_I18N) window.SP_I18N.tr(pa); // প্রিন্টের আগেই অনুবাদ
  let st = $('#pageStyle'); if (!st) { st = document.createElement('style'); st.id = 'pageStyle'; document.head.appendChild(st); }
  st.textContent = size === 'a4' ? '@page{size:A4;margin:12mm}' : '@page{size:80mm auto;margin:2mm}';
  document.body.classList.add('printing');
  const done = () => { document.body.classList.remove('printing'); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  const img = $('img', pa);
  const go = () => { window.print(); setTimeout(done, 1500); };
  if (img && !img.complete) img.onload = go; else go();
}
window.__printReceipt = printReceipt; // পরীক্ষার জন্য

/* ---------- ওষুধ তালিকা ---------- */
const MF = { q: '', form: '', page: 0, src: '' };
function pageMeds(el) {
  el.innerHTML = `<div class="card">
    <div class="row" style="justify-content:space-between">
      <div class="row" style="flex:1;min-width:260px"><div class="search-wrap" style="flex:1;max-width:460px">${ic('search', 's')}<input class="search" id="mq" style="height:50px;font-size:17px;border-width:1.5px" placeholder="ব্র্যান্ড, জেনেরিক, কোম্পানি বা বাংলা নাম দিয়ে খুঁজুন" value="${esc(MF.q)}"></div>
      <select class="in" id="mfrm" style="width:auto"><option value="">সব ধরন</option>${FORMS.map(f => `<option value="${f}" ${MF.form === f ? 'selected' : ''}>${formL(f)}</option>`).join('')}</select>
      <select class="in" id="msrc" style="width:auto">${[['', 'সব ওষুধ'], ['mine', 'আমার তালিকা'], ['stock', 'স্টকে আছে'], ['bddb', 'BD ডাটাবেস থেকে']].map(o => `<option value="${o[0]}" ${MF.src === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select></div>
      <div class="row"><button class="btn pri" id="madd">${ic('plus')} নতুন ওষুধ</button>${isOwner() ? `<button class="btn" id="mimp">${ic('upload')} Excel/CSV ইমপোর্ট</button><button class="btn" id="mexp">${ic('download')} Excel এক্সপোর্ট</button><button class="btn teal" id="mbd">${ic('download')} BD ডাটাবেস</button>` : ''}</div>
    </div><div id="mlist" class="mt"></div></div>`;
  const draw = () => {
    const q = norm(MF.q); const qs = hasBn(MF.q) ? bnSkel(MF.q) : ''; const sm = stockMap().m;
    const hits = medIdx().list.filter(e => { const m = e.m; return (!MF.form || m.form === MF.form) && (!MF.src || (MF.src === 'mine' ? !m.catalog : MF.src === 'bddb' ? !!m.catalog : sm.get(m.id) > 0)) && (!q || e.b.includes(q) || e.g.includes(q) || e.c.includes(q) || (e.bn && e.bn.includes(q)) || (qs.length >= 2 && (bSk(e).startsWith(qs) || gSk(e).startsWith(qs)))); });
    const rank = e => !q ? 0 : (e.b.startsWith(q) || (e.bn && e.bn.startsWith(q))) ? 0 : (e.b.includes(q) || (e.bn && e.bn.includes(q))) ? 1 : e.g.includes(q) ? 2 : (qs.length >= 2 && bSk(e).startsWith(qs)) ? 3 : 4;
    const list = q ? hits.map(e => [rank(e), e]).sort((x, y) => x[0] - y[0]).map(x => x[1].m) : hits.map(e => e.m);
    const box = $('#mlist');
    if (!D.medicines.length) { box.innerHTML = empty('💊', 'এখনও কোনো ওষুধ যোগ করা হয়নি', '"নতুন ওষুধ" চাপুন, অথবা Excel/CSV থেকে একসাথে অনেক ওষুধ ইমপোর্ট করুন।'); return; }
    if (!list.length) { box.innerHTML = empty('🔍', 'এই নামে কোনো ওষুধ নেই', 'অন্য বানানে খুঁজুন বা নতুন ওষুধ যোগ করুন।'); return; }
    const shown = list.slice(0, 300);
    box.innerHTML = `<div class="small muted mb">মোট ${bnNum(list.length, 0)}টি ওষুধ${list.length > 300 ? ' <span>(প্রথম ৩০০টি দেখানো হচ্ছে — খুঁজে নির্দিষ্ট করুন)</span>' : ''}</div><div class="twrap"><table class="tbl"><tr><th>ব্র্যান্ড</th><th>জেনেরিক</th><th>শক্তি · ধরন</th><th class="hide-m">কোম্পানি</th><th class="hide-m">র‍্যাক</th>${isOwner() ? '<th class="num">ক্রয়মূল্য</th>' : ''}<th class="num hide-m">বাজারদর</th><th class="num">পাইকারি</th><th class="num">MRP</th><th class="num">স্টক</th><th></th></tr>
    ${shown.map(m => { const st = stockOf(m.id); return `<tr><td><b>${esc(m.brand)}</b> ${m.sample ? '<span class="badge sample">নমুনা</span>' : ''}${m.catalog ? ' <span class="badge b-teal" title="BDDrugBank (medex.com.bd, সেপ্টেম্বর ২০২৫)">ডাটাবেস</span>' : ''}${m.controlled ? ' <span class="badge ctl">নিয়ন্ত্রিত</span>' : ''}${m.priceFlag ? ' <span class="badge b-amber" title="উৎসে দাম নেই বা সন্দেহজনক — যাচাই করুন">দাম যাচাই</span>' : ''}${m.nameBn && LG() === 'bn' ? `<div class="small muted">${esc(m.nameBn)}</div>` : ''}</td><td>${esc(m.generic)}</td><td>${esc(m.strength)} · ${esc(formL(m.form))}</td><td class="hide-m">${esc(m.company)}</td><td class="hide-m">${esc(m.rack)}</td>${isOwner() ? `<td class="num">${tk(m.purchasePrice)}${m.priceEst ? '<div><span class="badge est" title="ডাটাবেসের MRP থেকে হিসাব করা — ইনভয়েস দেখে ঠিক করুন">আনুমানিক</span></div>' : ''}</td>` : ''}<td class="num hide-m">${tk(m.marketPrice)}</td><td class="num">${tk(m.wholesalePrice)}${m.priceEst ? '<div><span class="badge est">আনুমানিক</span></div>' : ''}</td><td class="num"><b>${tk(m.mrp)}</b></td><td class="num"><span class="badge ${st <= 0 ? 'b-red' : st <= (m.reorder || 0) ? 'b-amber' : 'b-green'}">${bnNum(st, 0)}</span></td>
      <td class="right" style="white-space:nowrap"><button class="iconbtn" data-e="${m.id}" title="সম্পাদনা">${ic('edit')}</button>${isOwner() ? ` <button class="iconbtn" data-d="${m.id}" title="মুছুন" style="color:var(--red)">${ic('trash')}</button>` : ''}</td></tr>`; }).join('')}</table></div>`;
    $$('[data-e]', box).forEach(b => b.onclick = () => medForm(byId('medicines', b.dataset.e)));
    $$('[data-d]', box).forEach(b => b.onclick = async () => {
      const m = byId('medicines', b.dataset.d); const st = stockOf(m.id, true);
      if (!(await confirmBox(`<b>${esc(medLabel(m))}</b> মুছে ফেলবেন?${st ? `<br><span style="color:var(--red)">এর ${bnNum(st, 0)}টি স্টকও মুছে যাবে।</span>` : ''}<br><small class="muted">আগের বিক্রির রসিদ ঠিক থাকবে।</small>`, 'হ্যাঁ, মুছুন'))) return;
      for (const bt of D.batches.filter(x => x.medId === m.id)) await del('batches', bt.id);
      await del('medicines', m.id); toast('ওষুধ মুছে ফেলা হয়েছে'); draw();
    });
  };
  draw();
  const drawDeb = debounce(draw, 120);
  $('#mq').oninput = e => { MF.q = e.target.value; if (bigList()) drawDeb(); else draw(); };
  $('#mfrm').onchange = e => { MF.form = e.target.value; draw(); };
  $('#msrc').onchange = e => { MF.src = e.target.value; draw(); };
  $('#madd').onclick = () => medForm(null);
  if (isOwner()) { $('#mimp').onclick = importDialog; $('#mexp').onclick = exportExcel; $('#mbd').onclick = bdDialog; }
}
function medForm(m, prefill = '') {
  const isNew = !m; m = m || { brand: prefill, form: 'ট্যাবলেট', reorder: 10 };
  const f = (k, label, type = 'text', extra = '') => `<label class="f"><span>${label}</span><input class="in" name="${k}" type="${type}" value="${esc(m[k] ?? '')}" ${extra}></label>`;
  const ov = modal(isNew ? 'নতুন ওষুধ যোগ করুন' : 'ওষুধ সম্পাদনা', `<form id="mf"><div class="fgrid">
    ${f('brand', 'ব্র্যান্ড নাম *', 'text', 'required list="dlBrand"')}${f('nameBn', 'বাংলা নাম (খোঁজার জন্য, ঐচ্ছিক)', 'text', 'placeholder="যেমন: নাপা"')}${f('generic', 'জেনেরিক নাম *', 'text', 'required list="dlGen"')}${f('strength', 'শক্তি (যেমন 500 mg)')}
    <label class="f"><span>ধরন *</span><select class="in" name="form">${FORMS.map(x => `<option value="${x}" ${m.form === x ? 'selected' : ''}>${formL(x)}</option>`).join('')}</select></label>
    ${f('company', 'কোম্পানি', 'text', 'list="dlCo"')}${f('rack', 'র‍্যাক/তাক')}
    ${isOwner() || isNew ? f('purchasePrice', 'ক্রয়মূল্য (প্রতি ইউনিট) ৳', 'number', 'step="0.01" min="0"') : ''}${f('marketPrice', 'বাজারদর ৳', 'number', 'step="0.01" min="0"')}${f('wholesalePrice', 'পাইকারি দাম ৳', 'number', 'step="0.01" min="0"')}
    ${f('mrp', 'MRP (খুচরা) ৳ *', 'number', 'step="0.01" min="0" required')}${f('reorder', 'রি-অর্ডার লেভেল (এর নিচে নামলে সতর্কতা)', 'number', 'min="0"')}${f('packSize', 'প্যাক সাইজ (যেমন 10x10)')}
    ${f('barcode', 'বারকোড')}${f('dar', 'DAR নম্বর')}
    <div class="f" style="padding-top:26px"><label class="row" style="gap:8px"><input type="checkbox" name="rx" ${m.rx ? 'checked' : ''} style="width:20px;height:20px"> প্রেসক্রিপশন লাগে</label><label class="row" style="gap:8px"><input type="checkbox" name="antibiotic" ${m.antibiotic ? 'checked' : ''} style="width:20px;height:20px"> অ্যান্টিবায়োটিক</label></div>
  </div></form>
  <datalist id="dlGen">${[...new Set(D.medicines.map(x => x.generic))].map(g => `<option value="${esc(g)}">`).join('')}</datalist>
  <datalist id="dlCo">${[...new Set(D.medicines.map(x => x.company))].map(g => `<option value="${esc(g)}">`).join('')}</datalist><datalist id="dlBrand"></datalist>
  ${m.priceEst ? `<div class="alert amber">${ic('alert')}<div><b>আনুমানিক দাম:</b> <span>MRP ডাটাবেস (medex.com.bd, সেপ্টেম্বর ২০২৫) থেকে; ক্রয় ও পাইকারি দাম মার্জিন ধরে হিসাব করা। সাপ্লায়ারের ইনভয়েস দেখে ঠিক করুন।</span></div></div>` : ''}<div class="small muted">দাম বসান DGDA ও সাপ্লায়ারের ইনভয়েস দেখে। * চিহ্নিত ঘর পূরণ করা বাধ্যতামূলক।</div>`,
    `<button class="btn" data-c>বাতিল</button><button class="btn pri" data-s>${ic('check')} সংরক্ষণ করুন</button>`);
  $('[data-c]', ov).onclick = ov.close;
  const save = async () => {
    const fm = $('#mf', ov); if (!fm.reportValidity()) return;
    const v = Object.fromEntries(new FormData(fm).entries());
    const o = { ...m, ...v, rx: !!v.rx, antibiotic: !!v.antibiotic, sample: false };
    ['purchasePrice', 'marketPrice', 'wholesalePrice', 'mrp', 'reorder'].forEach(k => { if (k in v) o[k] = num(v[k]); });
    if (m.priceEst && (o.purchasePrice !== m.purchasePrice || o.wholesalePrice !== m.wholesalePrice)) { o.priceEst = false; o.priceSource = 'নিজে বসানো'; }
    o.brand = o.brand.trim(); o.generic = o.generic.trim(); o.nameBn = (o.nameBn || '').trim();
    const dup = D.medicines.find(x => x.id !== o.id && norm(x.brand) === norm(o.brand) && norm(x.strength) === norm(o.strength) && x.form === o.form);
    if (dup) return toast('এই ব্র্যান্ড, শক্তি ও ধরনের ওষুধ আগেই আছে', 'err');
    if (o.mrp && o.purchasePrice > o.mrp) { if (!(await confirmBox('ক্রয়মূল্য MRP-এর চেয়ে বেশি। ঠিক আছে তো?', 'হ্যাঁ, ঠিক আছে', false))) return; }
    if (!o.wholesalePrice) o.wholesalePrice = o.mrp; if (!o.marketPrice) o.marketPrice = o.mrp;
    if (isNew) { o.id = 'M' + Date.now().toString(36).toUpperCase(); o.created = today(); }
    o.priceDate = today(); await put('medicines', o); ov.close(); toast(isNew ? 'নতুন ওষুধ যোগ হয়েছে' : 'পরিবর্তন সংরক্ষিত হয়েছে', 'ok'); render();
  };
  $('[data-s]', ov).onclick = save; $('#mf', ov).onsubmit = e => { e.preventDefault(); save(); };
}

/* ---------- Excel/CSV ইমপোর্ট-এক্সপোর্ট (৫ শিটের কাঠামো) ---------- */
const yn = v => v ? 'হ্যাঁ' : 'না';
const isYes = v => /^(হ্যাঁ|হা|yes|y|true|1)$/i.test(String(v ?? '').trim());
function workbookData() {
  return {
    Medicines: [['medicine_id', 'brand_name', 'generic_name', 'strength', 'dosage_form', 'pack_size', 'manufacturer', 'DAR_no', 'barcode', 'rx_required', 'antibiotic', 'rack_location', 'reorder_level', 'brand_name_bn']]
      .concat(D.medicines.map(m => [m.id, m.brand, m.generic, m.strength, FORM_EN[m.form] || m.form, m.packSize, m.company, m.dar, m.barcode, yn(m.rx), yn(m.antibiotic), m.rack, m.reorder, m.nameBn || ''])),
    Prices: [['medicine_id', 'MRP', 'purchase_price', 'wholesale_price', 'market_price', 'effective_date', 'source']]
      .concat(D.medicines.map(m => [m.id, m.mrp, m.purchasePrice, m.wholesalePrice, m.marketPrice, m.priceDate || m.created || today(), m.sample ? 'নমুনা (sample)' : (m.priceSource || 'ইনভয়েস')])),
    Interactions: [['generic_a', 'generic_b', 'severity', 'note_bn', 'source_link', 'reviewed_by']].concat(D.interactions.map(i => [i.a, i.b, i.severity, i.note, i.source, i.reviewedBy])),
    ADR: [['generic_name', 'common_adr', 'serious_adr', 'caution', 'source_link']].concat(D.adr.map(a => [a.generic, a.common, a.serious, a.caution, a.source])),
    Suppliers: [['supplier_id', 'name', 'phone', 'companies', 'payment_terms']].concat(D.suppliers.map(s => [s.id, s.name, s.phone, s.companies, s.terms])),
  };
}
function exportExcel(template = false) {
  if (typeof XLSX === 'undefined') return toast('Excel লাইব্রেরি লোড হয়নি', 'err');
  const wb = XLSX.utils.book_new(); const data = workbookData();
  Object.entries(data).forEach(([n, rows]) => { const ws = XLSX.utils.aoa_to_sheet(template === true ? rows.slice(0, 1) : rows); ws['!cols'] = rows[0].map(() => ({ wch: 18 })); XLSX.utils.book_append_sheet(wb, ws, n); });
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  download(template === true ? 'sakura_pharma_template.xlsx' : `sakura_pharma_medicines_${today()}.xlsx`, new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  toast(template === true ? 'খালি টেমপ্লেট ডাউনলোড হয়েছে' : 'Excel ফাইল ডাউনলোড হয়েছে', 'ok');
}
function importDialog() {
  const ov = modal('Excel / CSV থেকে ইমপোর্ট', `<p style="margin-top:0">রিপোর্টে বলা ৫টি শিটের (Medicines, Prices, Interactions, ADR, Suppliers) Excel ফাইল, অথবা একটি CSV দিন। CSV-তে medicines-এর কলামের সাথে MRP, purchase_price, wholesale_price, market_price কলামও রাখতে পারেন।</p>
    <div class="alert info small">${ic('info')}<div>একই medicine_id (অথবা একই ব্র্যান্ড+শক্তি+ধরন) থাকলে পুরনোটা হালনাগাদ হবে, না থাকলে নতুন যোগ হবে। কিছু মুছবে না।</div></div>
    <input type="file" id="impf" accept=".xlsx,.xls,.csv" class="in" style="padding:10px">
    <div class="row mt"><button class="btn sm" id="tpl">${ic('download')} খালি টেমপ্লেট (Excel)</button><button class="btn sm" id="tplc">${ic('download')} CSV টেমপ্লেট</button></div><div id="impRes" class="mt"></div>`);
  $('#tpl', ov).onclick = () => exportExcel(true);
  $('#tplc', ov).onclick = () => download('sakura_pharma_medicines_template.csv', csvOf([['medicine_id', 'brand_name', 'generic_name', 'strength', 'dosage_form', 'manufacturer', 'rack_location', 'reorder_level', 'MRP', 'purchase_price', 'wholesale_price', 'market_price', 'rx_required', 'antibiotic'], ['', 'Napa', 'Paracetamol', '500 mg', 'Tablet', 'Beximco', 'A1', '100', '1.20', '0.90', '1.00', '1.20', 'না', 'না']]), 'text/csv');
  $('#impf', ov).onchange = async e => {
    const file = e.target.files[0]; if (!file) return;
    try { const res = await importFile(file); $('#impRes', ov).innerHTML = `<div class="alert info">${ic('check')}<div><b>ইমপোর্ট সম্পন্ন।</b><br>নতুন ওষুধ: ${bnNum(res.added, 0)} · হালনাগাদ: ${bnNum(res.updated, 0)} · দাম: ${bnNum(res.prices, 0)} · ইন্টার‍্যাকশন: ${bnNum(res.ix, 0)} · ADR: ${bnNum(res.adr, 0)} · সাপ্লায়ার: ${bnNum(res.sup, 0)}${res.skipped ? `<br>বাদ পড়েছে (নাম নেই): ${bnNum(res.skipped, 0)} সারি` : ''}</div></div>`; toast('ইমপোর্ট সম্পন্ন', 'ok'); }
    catch (err) { console.error(err); $('#impRes', ov).innerHTML = `<div class="alert red">${ic('alert')}<div>ফাইল পড়া যায়নি: ${esc(err.message)}</div></div>`; }
  };
  ov.querySelector('[data-x]').addEventListener('click', () => render());
}
const pick = (r, ...ks) => { for (const k of ks) { const f = Object.keys(r).find(x => norm(x) === norm(k)); if (f != null && r[f] !== '' && r[f] != null) return r[f]; } return ''; };
const FORM_BN = Object.fromEntries(Object.entries(FORM_EN).map(([b, e]) => [e.toLowerCase(), b]));
async function importFile(file) {
  const buf = await file.arrayBuffer(); let wb;
  if (/\.csv$/i.test(file.name)) wb = XLSX.read(new TextDecoder('utf-8').decode(buf).replace(/^\ufeff/, ''), { type: 'string' });
  else wb = XLSX.read(buf, { type: 'array' });
  const sheet = n => { const k = wb.SheetNames.find(x => norm(x).includes(norm(n))); return k ? XLSX.utils.sheet_to_json(wb.Sheets[k], { defval: '' }) : null; };
  const res = { added: 0, updated: 0, prices: 0, ix: 0, adr: 0, sup: 0, skipped: 0 };
  const medRows = sheet('Medicines') || XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
  const out = [];
  for (const r of medRows) {
    const brand = String(pick(r, 'brand_name', 'brand', 'ব্র্যান্ড')).trim(); const generic = String(pick(r, 'generic_name', 'generic', 'জেনেরিক')).trim();
    if (!brand) { res.skipped++; continue; }
    const id = String(pick(r, 'medicine_id', 'id')).trim(); const strength = String(pick(r, 'strength', 'শক্তি')).trim();
    const fRaw = String(pick(r, 'dosage_form', 'form', 'ধরন')).trim(); const form = FORMS.includes(fRaw) ? fRaw : (FORM_BN[fRaw.toLowerCase()] || fRaw || 'অন্যান্য');
    let m = (id && byId('medicines', id)) || out.find(x => x.id === id && id) || D.medicines.find(x => norm(x.brand) === norm(brand) && norm(x.strength) === norm(strength) && x.form === form);
    const isNew = !m; m = m ? { ...m } : { id: id || 'M' + uid().toUpperCase(), created: today(), reorder: 10 };
    Object.assign(m, { brand, generic: generic || m.generic || '', strength, form, sample: isNew ? false : !!m.sample });
    const set = (k, v, f = x => x) => { if (v !== '') m[k] = f(v); };
    set('company', pick(r, 'manufacturer', 'company', 'কোম্পানি')); set('packSize', pick(r, 'pack_size')); set('dar', pick(r, 'DAR_no', 'dar')); set('barcode', String(pick(r, 'barcode')));
    set('rack', pick(r, 'rack_location', 'rack')); set('reorder', pick(r, 'reorder_level', 'reorder'), num); set('nameBn', String(pick(r, 'brand_name_bn', 'name_bn', 'বাংলা নাম')).trim());
    const rx = pick(r, 'rx_required'); if (rx !== '') m.rx = isYes(rx); const ab = pick(r, 'antibiotic'); if (ab !== '') m.antibiotic = isYes(ab);
    if (pick(r, 'MRP', 'mrp') !== '') m.sample = false; set('mrp', pick(r, 'MRP', 'mrp'), num); set('purchasePrice', pick(r, 'purchase_price'), num); set('wholesalePrice', pick(r, 'wholesale_price'), num); set('marketPrice', pick(r, 'market_price'), num);
    if (!m.wholesalePrice) m.wholesalePrice = m.mrp || 0; if (!m.marketPrice) m.marketPrice = m.mrp || 0;
    isNew ? res.added++ : res.updated++; const ix = out.findIndex(x => x.id === m.id); if (ix >= 0) out[ix] = m; else out.push(m);
  }
  const all = new Map(D.medicines.map(x => [x.id, x])); out.forEach(m => all.set(m.id, m));
  const prices = sheet('Prices');
  if (prices) {
    const latest = {}; prices.forEach(r => { const id = String(pick(r, 'medicine_id')).trim(); const d = String(pick(r, 'effective_date') || ''); if (!id || !all.has(id)) return; if (!latest[id] || d >= latest[id].d) latest[id] = { d, r }; });
    Object.entries(latest).forEach(([id, { d, r }]) => { const m = { ...all.get(id) }; const s = (k, v) => { if (v !== '') m[k] = num(v); }; s('mrp', pick(r, 'MRP')); s('purchasePrice', pick(r, 'purchase_price')); s('wholesalePrice', pick(r, 'wholesale_price')); s('marketPrice', pick(r, 'market_price')); m.priceDate = d; m.priceSource = String(pick(r, 'source')); m.sample = /নমুনা|sample/i.test(m.priceSource); all.set(id, m); if (!out.includes(m)) out.push(m); res.prices++; });
  }
  await putMany('medicines', [...new Map(out.map(m => [m.id, all.get(m.id)])).values()]);
  const ixr = sheet('Interactions');
  if (ixr) { const add = []; ixr.forEach(r => { const a = String(pick(r, 'generic_a')).trim(), b = String(pick(r, 'generic_b')).trim(); if (!a || !b) return; const ex = D.interactions.find(x => (norm(x.a) === norm(a) && norm(x.b) === norm(b)) || (norm(x.a) === norm(b) && norm(x.b) === norm(a))); add.push({ ...(ex || {}), a, b, severity: SEV.includes(String(pick(r, 'severity')).trim()) ? String(pick(r, 'severity')).trim() : 'মাঝারি', note: String(pick(r, 'note_bn', 'note')), source: String(pick(r, 'source_link', 'source')), reviewedBy: String(pick(r, 'reviewed_by')), sample: false }); }); await putMany('interactions', add); res.ix = add.length; }
  const adr = sheet('ADR');
  if (adr) { const add = []; adr.forEach(r => { const g = String(pick(r, 'generic_name')).trim(); if (!g) return; const ex = D.adr.find(x => norm(x.generic) === norm(g)); add.push({ ...(ex || {}), generic: g, common: String(pick(r, 'common_adr')), serious: String(pick(r, 'serious_adr')), caution: String(pick(r, 'caution')), source: String(pick(r, 'source_link')), sample: false }); }); await putMany('adr', add); res.adr = add.length; }
  const sup = sheet('Suppliers');
  if (sup) { const add = []; sup.forEach(r => { const n = String(pick(r, 'name')).trim(); if (!n) return; const id = String(pick(r, 'supplier_id')).trim(); const ex = (id && byId('suppliers', id)) || D.suppliers.find(x => norm(x.name) === norm(n)); add.push({ ...(ex || {}), id: ex?.id || id || uid(), name: n, phone: String(pick(r, 'phone')), companies: String(pick(r, 'companies')), terms: String(pick(r, 'payment_terms')) }); }); await putMany('suppliers', add); res.sup = add.length; }
  return res;
}
window.__importFile = importFile;

/* ---------- ক্রয় / স্টক-ইন ---------- */
const PUR = { supplierId: '', invoice: '', date: '', items: [], paid: '', paidTouched: false };
function pagePurchase(el) {
  if (!PUR.date) PUR.date = today();
  const optOf = m => `<option value="${esc(medLabel(m) + ' — ' + m.generic + ' [' + m.id + ']')}">`;
  const medOpts = bigList() ? '' : D.medicines.map(optOf).join('');
  el.innerHTML = `<div class="grid" style="grid-template-columns:minmax(0,1fr)">
  <div class="card"><h3>নতুন ক্রয় (সাপ্লায়ারের ইনভয়েস থেকে স্টক যোগ)</h3>
    <div class="fgrid"><label class="f"><span>সাপ্লায়ার *</span><div class="row" style="flex-wrap:nowrap"><select class="in" id="psup"><option value="">— বাছাই করুন —</option>${D.suppliers.map(s => `<option value="${s.id}" ${PUR.supplierId === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select><button class="iconbtn" id="newSup" title="নতুন সাপ্লায়ার">${ic('plus')}</button></div></label>
    <label class="f"><span>ইনভয়েস নম্বর</span><input class="in" id="pinv" value="${esc(PUR.invoice)}"></label><label class="f"><span>তারিখ</span><input class="in" type="date" id="pdate" value="${PUR.date}"></label></div>
    <div class="card" style="background:var(--pink-ll);box-shadow:none;border-color:#f6d3e1"><b>ওষুধ যোগ করুন</b>
      <div class="fgrid mt pform" style="grid-template-columns:2.2fr 1fr 1fr 0.8fr 1fr 1fr auto;align-items:end;gap:10px">
        <label class="f"><span>ওষুধ (নাম লিখে বাছুন) *</span><input class="in" id="pmed" list="pmedl" placeholder="যেমন: Napa"></label>
        <label class="f"><span>ব্যাচ নম্বর</span><input class="in" id="pbatch"></label>
        <label class="f"><span>মেয়াদ *</span><input class="in" type="date" id="pexp"></label>
        <label class="f"><span>পরিমাণ *</span><input class="in" id="pqty" inputmode="numeric"></label>
        <label class="f"><span>ক্রয়মূল্য/ইউনিট</span><input class="in" id="pprice" inputmode="decimal"></label>
        <label class="f"><span>MRP</span><input class="in" id="pmrp" inputmode="decimal"></label>
        <label class="f"><button class="btn teal" id="padd">${ic('plus')} যোগ</button></label>
      </div><datalist id="pmedl">${medOpts}</datalist></div>
    <div id="pitems" class="mt"></div>
  </div>
  <div class="card"><h3>সাম্প্রতিক ক্রয়</h3><div id="plist"></div></div></div>`;
  const findMed = v => { const m = /\[([^\]]+)\]$/.exec(v); return m ? byId('medicines', m[1]) : D.medicines.find(x => norm(x.brand) === norm(v)); };
  if (bigList()) $('#pmed').oninput = debounce(() => { const v = $('#pmed').value; if (/\[[^\]]+\]$/.test(v)) return; $('#pmedl').innerHTML = searchMeds(v).map(x => optOf(x.m)).join(''); }, 120);
  $('#pmed').onchange = () => { const m = findMed($('#pmed').value); if (m) { $('#pprice').value = m.purchasePrice || ''; $('#pmrp').value = m.mrp || ''; $('#pbatch').focus(); } };
  $('#psup').onchange = e => PUR.supplierId = e.target.value; $('#pinv').oninput = e => PUR.invoice = e.target.value; $('#pdate').onchange = e => PUR.date = e.target.value;
  $('#newSup').onclick = () => supplierForm(null, () => render());
  $('#padd').onclick = () => {
    const m = findMed($('#pmed').value); if (!m) return toast('তালিকা থেকে ওষুধ বাছাই করুন (না থাকলে আগে "ওষুধ তালিকা"-য় যোগ করুন)', 'err');
    const exp = $('#pexp').value, qty = Math.floor(num($('#pqty').value)); if (!exp) return toast('মেয়াদের তারিখ দিন', 'err'); if (qty <= 0) return toast('পরিমাণ দিন', 'err');
    if (exp < today()) return toast('মেয়াদোত্তীর্ণ ওষুধ স্টকে নেওয়া যাবে না', 'err');
    PUR.items.push({ medId: m.id, name: medLabel(m), batchNo: $('#pbatch').value.trim() || 'B' + Date.now().toString(36).toUpperCase().slice(-5), expiry: exp, qty, price: num($('#pprice').value) || m.purchasePrice || 0, mrp: num($('#pmrp').value) || m.mrp });
    ['pmed', 'pbatch', 'pexp', 'pqty', 'pprice', 'pmrp'].forEach(i => $('#' + i).value = ''); $('#pmed').focus(); drawP();
  };
  const drawP = () => {
    const box = $('#pitems'); const total = r2(PUR.items.reduce((a, i) => a + i.qty * i.price, 0));
    if (!PUR.items.length) { box.innerHTML = empty('📦', 'এখনও কোনো ওষুধ যোগ করা হয়নি', 'উপরের ঘরে ওষুধ, ব্যাচ, মেয়াদ ও পরিমাণ দিয়ে "যোগ" চাপুন।'); return; }
    box.innerHTML = `<div class="twrap"><table class="tbl"><tr><th>ওষুধ</th><th>ব্যাচ</th><th>মেয়াদ</th><th class="num">পরিমাণ</th><th class="num">ক্রয়মূল্য</th><th class="num">MRP</th><th class="num">মোট</th><th></th></tr>${PUR.items.map((i, k) => `<tr><td><b>${esc(i.name)}</b></td><td>${esc(i.batchNo)}</td><td>${bnDate(i.expiry)}</td><td class="num">${bnNum(i.qty, 0)}</td><td class="num">${tk(i.price)}</td><td class="num">${tk(i.mrp)}</td><td class="num"><b>${tk(i.qty * i.price)}</b></td><td class="right"><button class="iconbtn" data-rm="${k}" style="color:var(--red)">${ic('trash')}</button></td></tr>`).join('')}</table></div>
      <div class="row mt" style="justify-content:flex-end;gap:18px"><div style="font-size:20px">মোট: <b>${tk(total)}</b></div><label class="f" style="margin:0;width:200px"><span>পরিশোধ (৳)</span><input class="in" id="ppaid" inputmode="decimal" placeholder="${bnNum(total)}" value="${PUR.paidTouched ? esc(PUR.paid) : ''}"></label><button class="btn pri" id="psave" style="margin-top:24px">${ic('check')} ক্রয় সংরক্ষণ ও স্টকে যোগ</button></div><div id="pdue" class="right small muted"></div>`;
    $$('[data-rm]', box).forEach(b => b.onclick = () => { PUR.items.splice(+b.dataset.rm, 1); drawP(); });
    const upd = () => { const due = r2(total - (PUR.paidTouched ? num(PUR.paid) : total)); $('#pdue').innerHTML = due > 0 ? `সাপ্লায়ারের কাছে বাকি (দেনা) থাকবে: <b>${tk(due)}</b>` : ''; };
    $('#ppaid').oninput = e => { PUR.paid = e.target.value; PUR.paidTouched = e.target.value !== ''; upd(); }; upd();
    $('#psave').onclick = savePurchase;
  };
  drawP(); drawPList();
}
async function savePurchase() {
  if (!PUR.supplierId) { toast('সাপ্লায়ার বাছাই করুন', 'err'); $('#psup').focus(); return; }
  const total = r2(PUR.items.reduce((a, i) => a + i.qty * i.price, 0)); const paid = PUR.paidTouched ? num(PUR.paid) : total; const due = r2(Math.max(0, total - paid));
  const pur = await put('purchases', { date: PUR.date, supplierId: PUR.supplierId, invoice: PUR.invoice, items: PUR.items, total, paid: Math.min(paid, total), due, user: currentUser?.name || 'মালিক' });
  await putMany('batches', PUR.items.map(i => ({ medId: i.medId, batchNo: i.batchNo, expiry: i.expiry, qty: i.qty, initQty: i.qty, purchasePrice: i.price, supplierId: PUR.supplierId, purchaseId: pur.id, date: PUR.date })));
  const meds = []; PUR.items.forEach(i => { const m = byId('medicines', i.medId); if (m && (m.purchasePrice !== i.price || m.mrp !== i.mrp || m.priceEst)) { meds.push({ ...m, purchasePrice: i.price, mrp: i.mrp, priceDate: PUR.date, priceSource: 'ইনভয়েস ' + (PUR.invoice || ''), priceEst: false }); } }); if (meds.length) await putMany('medicines', meds);
  if (due > 0) await put('ledger', { partyType: 'supplier', partyId: PUR.supplierId, kind: 'due', amount: due, date: PUR.date, ref: PUR.invoice || 'ক্রয়', note: 'ক্রয় বাকি' });
  Object.assign(PUR, { invoice: '', items: [], paid: '', paidTouched: false });
  toast('ক্রয় সংরক্ষিত হয়েছে, স্টক বেড়েছে', 'ok'); render();
}
function drawPList() {
  const box = $('#plist'); const list = [...D.purchases].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 15);
  box.innerHTML = list.length ? `<div class="twrap"><table class="tbl"><tr><th>তারিখ</th><th>সাপ্লায়ার</th><th>ইনভয়েস</th><th class="num">আইটেম</th><th class="num">মোট</th><th class="num">বাকি</th></tr>${list.map(p => `<tr><td>${bnDate(p.date)}</td><td>${esc(byId('suppliers', p.supplierId)?.name || '—')}</td><td>${esc(p.invoice || '—')}</td><td class="num">${bnNum(p.items.length, 0)}</td><td class="num"><b>${tk(p.total)}</b></td><td class="num">${p.due ? `<span class="badge b-amber">${tk(p.due)}</span>` : '—'}</td></tr>`).join('')}</table></div>` : empty('🧾', 'এখনও কোনো ক্রয় সংরক্ষণ হয়নি', 'নমুনা স্টক আগে থেকেই দেওয়া আছে। নতুন মাল এলে উপরের ফর্ম থেকে যোগ করুন।');
}
function supplierForm(s, cb) {
  s = s || {}; const ov = modal(s.id ? 'সাপ্লায়ার সম্পাদনা' : 'নতুন সাপ্লায়ার', `<form id="sf"><label class="f"><span>নাম *</span><input class="in" name="name" required value="${esc(s.name || '')}"></label><label class="f"><span>মোবাইল</span><input class="in" name="phone" value="${esc(s.phone || '')}"></label><label class="f"><span>কোম্পানি (কমা দিয়ে)</span><input class="in" name="companies" value="${esc(s.companies || '')}"></label><label class="f"><span>পেমেন্টের শর্ত</span><input class="in" name="terms" value="${esc(s.terms || '')}" placeholder="যেমন: ১৫ দিনের বাকি"></label></form>`,
    `<button class="btn" data-c>বাতিল</button><button class="btn pri" data-s>সংরক্ষণ</button>`, 'sm');
  $('[data-c]', ov).onclick = ov.close;
  $('[data-s]', ov).onclick = async () => { const f = $('#sf', ov); if (!f.reportValidity()) return; const o = await put('suppliers', { ...s, ...Object.fromEntries(new FormData(f).entries()) }); if (route === 'purchase') PUR.supplierId = o.id; ov.close(); toast('সাপ্লায়ার সংরক্ষিত', 'ok'); cb && cb(o); };
}

/* ---------- হোম ডেলিভারি ---------- */
function pageDelivery(el) {
  const cols = ['নতুন', 'প্রস্তুত', 'পথে', 'পৌঁছেছে'];
  const list = [...D.deliveries].sort((a, b) => b.date.localeCompare(a.date));
  el.innerHTML = `<div class="row mb" style="justify-content:space-between"><div class="muted">বিক্রির সময় "হোম ডেলিভারি" টিক দিলে অর্ডার এখানে আসে। ধাপ বদলাতে বোতাম চাপুন।</div><button class="btn pri" id="newDel">${ic('plus')} নতুন ডেলিভারি অর্ডার</button></div>
  ${list.length ? `<div class="kan">${cols.map(c => { const items = list.filter(d => d.status === c && (c !== 'পৌঁছেছে' || d.date.slice(0, 10) >= addDays(today(), -7))); return `<div class="kcol"><h4>${statL(c)} <span class="badge">${bnNum(items.length, 0)}</span></h4>${items.map(d => `<div class="kcard"><div class="row" style="justify-content:space-between"><b>${esc(d.name)}</b><span class="small muted">${d.saleNo}</span></div><div>📞 ${esc(d.phone || '—')}</div><div>📍 ${esc(d.address)}</div><div class="small muted">${bnDateTime(d.date)} · ${tk(d.total)}</div>
    <div class="row mt" style="gap:6px">${c !== 'পৌঁছেছে' ? `<button class="btn sm teal" data-next="${d.id}">${statL(cols[cols.indexOf(c) + 1])} →</button><button class="btn sm danger" data-cancel="${d.id}">বাতিল</button>` : '<span class="badge b-green">✓ পৌঁছেছে</span>'}<button class="btn sm" data-rc="${d.saleId}">${ic('print')}</button></div></div>`).join('') || '<div class="small muted" style="padding:8px">কিছু নেই</div>'}</div>`; }).join('')}</div>
  ${list.some(d => d.status === 'বাতিল') ? `<div class="card mt"><h3>বাতিল অর্ডার</h3>${list.filter(d => d.status === 'বাতিল').map(d => `<div class="small">${d.saleNo} · ${esc(d.name)} · ${bnDateTime(d.date)}</div>`).join('')}</div>` : ''}`
    : `<div class="card">${empty('🛵', 'কোনো হোম ডেলিভারি অর্ডার নেই', 'বিক্রির পাতায় "হোম ডেলিভারি" টিক দিয়ে ঠিকানা লিখে বিক্রি করলে এখানে দেখাবে।')}</div>`}`;
  $('#newDel').onclick = () => { POS.delivery = true; go('pos'); };
  $$('[data-next]', el).forEach(b => b.onclick = async () => { const d = byId('deliveries', b.dataset.next); const s = cols[cols.indexOf(d.status) + 1]; d.status = s; d.history = (d.history || []).concat({ s, at: new Date().toISOString() }); await put('deliveries', d); toast(tt('অবস্থা: {0}', statL(s)), 'ok'); render(); });
  $$('[data-cancel]', el).forEach(b => b.onclick = async () => { if (!(await confirmBox('এই ডেলিভারি অর্ডার বাতিল করবেন?', 'হ্যাঁ, বাতিল'))) return; const d = byId('deliveries', b.dataset.cancel); d.status = 'বাতিল'; d.history = (d.history || []).concat({ s: 'বাতিল', at: new Date().toISOString() }); await put('deliveries', d); render();
    const sale = byId('sales', d.saleId); if (sale && !sale.void && isOwner() && (await confirmBox('বিক্রিটিও বাতিল করে ওষুধ স্টকে ফেরত নেবেন ও বাকি ঠিক করবেন?', 'হ্যাঁ, বিক্রি বাতিল', false))) returnModal(sale, true); });
  $$('[data-rc]', el).forEach(b => b.onclick = () => showReceipt(byId('sales', b.dataset.rc)));
}

/* ---------- বাকি খাতা ---------- */
let duesTab = 'customer';
function pageDues(el) {
  const type = duesTab; const parties = type === 'customer' ? D.customers : D.suppliers;
  const rows = parties.map(p => ({ p, bal: balanceOf(type, p.id), last: D.ledger.filter(l => l.partyType === type && l.partyId === p.id).sort((a, b) => b.date.localeCompare(a.date))[0] })).sort((a, b) => b.bal - a.bal);
  const totalDue = rows.reduce((a, r) => a + Math.max(0, r.bal), 0);
  el.innerHTML = `<div class="tabs"><button data-t="customer" class="${type === 'customer' ? 'on' : ''}">গ্রাহকের বাকি (পাওনা)</button>${isOwner() ? `<button data-t="supplier" class="${type === 'supplier' ? 'on' : ''}">সাপ্লায়ারের বাকি (দেনা)</button>` : ''}</div>
  <div class="grid g3 mb"><div class="card stat c-amber"><div class="ic">${ic('wallet')}</div><div><div class="v">${tk(totalDue)}</div><div class="l">মোট ${type === 'customer' ? 'পাওনা' : 'দেনা'}</div></div></div>
  <div class="card stat c-navy"><div class="ic">${ic('users')}</div><div><div class="v">${bnNum(rows.filter(r => r.bal > 0).length, 0)}</div><div class="l">বাকি আছে এমন ${type === 'customer' ? 'গ্রাহক' : 'সাপ্লায়ার'}</div></div></div>
  <div class="card" style="display:flex;align-items:center;justify-content:center"><button class="btn pri" id="addParty">${ic('plus')} নতুন ${type === 'customer' ? 'গ্রাহক' : 'সাপ্লায়ার'}</button></div></div>
  <div class="card">${rows.length ? `<div class="twrap"><table class="tbl"><tr><th>নাম</th><th>মোবাইল</th>${type === 'customer' ? '<th>ধরন</th>' : '<th>কোম্পানি</th>'}<th>শেষ লেনদেন</th><th class="num">বাকি</th><th></th></tr>${rows.map(r => `<tr><td><b>${esc(r.p.name)}</b></td><td>${esc(r.p.phone || '—')}</td><td>${type === 'customer' ? (r.p.type === 'wholesale' ? '<span class="badge b-teal">পাইকারি</span>' : '<span class="badge">খুচরা</span>') : esc(r.p.companies || '')}</td><td>${r.last ? bnDate(r.last.date) : '—'}</td><td class="num">${r.bal > 0 ? `<span class="badge b-amber" style="font-size:15px">${tk(r.bal)}</span>` : '<span class="badge b-green">পরিশোধিত</span>'}</td>
    <td class="right" style="white-space:nowrap">${r.bal > 0 ? `<button class="btn sm teal" data-pay="${r.p.id}">${ic('money')} ${type === 'customer' ? 'জমা নিন' : 'পরিশোধ'}</button> ` : ''}<button class="btn sm" data-hist="${r.p.id}">খাতা</button> <button class="iconbtn" data-ed="${r.p.id}">${ic('edit')}</button></td></tr>`).join('')}</table></div>` : empty('📒', 'এখনও কারো বাকি নেই', type === 'customer' ? 'বিক্রির সময় জমা টাকা কম দিলে, গ্রাহকের নাম-মোবাইলসহ বাকি এখানে উঠবে।' : 'ক্রয়ের সময় পুরো টাকা না দিলে সাপ্লায়ারের দেনা এখানে উঠবে।')}</div>`;
  $$('[data-t]', el).forEach(b => b.onclick = () => { duesTab = b.dataset.t; render(); });
  $('#addParty').onclick = () => type === 'customer' ? customerForm(null) : supplierForm(null, () => render());
  $$('[data-ed]', el).forEach(b => b.onclick = () => type === 'customer' ? customerForm(byId('customers', b.dataset.ed)) : supplierForm(byId('suppliers', b.dataset.ed), () => render()));
  $$('[data-pay]', el).forEach(b => b.onclick = () => payModal(type, b.dataset.pay));
  $$('[data-hist]', el).forEach(b => b.onclick = () => {
    const p = (type === 'customer' ? D.customers : D.suppliers).find(x => x.id === b.dataset.hist); const L = D.ledger.filter(l => l.partyType === type && l.partyId === p.id).sort((a, b) => a.date.localeCompare(b.date)); let run = 0;
    modal(`<span>খাতা —</span> <span>${esc(p.name)}</span>`, L.length ? `<table class="tbl"><tr><th>তারিখ</th><th>বিবরণ</th><th class="num">বাকি</th><th class="num">জমা</th><th class="num">ব্যালান্স</th></tr>${L.map(l => { run += l.kind === 'due' ? l.amount : -l.amount; return `<tr><td>${bnDate(l.date)}</td><td><span>${esc(l.note || '')}</span> ${esc(l.ref || '')}</td><td class="num">${l.kind === 'due' ? tk(l.amount) : ''}</td><td class="num">${l.kind !== 'due' ? tk(l.amount) : ''}</td><td class="num"><b>${tk(run)}</b></td></tr>`; }).join('')}</table>` : empty('📒', 'কোনো লেনদেন নেই'));
  });
}
function payModal(type, id) {
  const p = (type === 'customer' ? D.customers : D.suppliers).find(x => x.id === id); const bal = balanceOf(type, id);
  const ov = modal(type === 'customer' ? 'বাকি টাকা জমা নিন' : 'সাপ্লায়ারকে পরিশোধ', `<p style="margin-top:0"><b>${esc(p.name)}</b> — বর্তমান বাকি <b>${tk(bal)}</b></p><label class="f"><span>টাকার পরিমাণ (৳)</span><input class="in" id="pamt" inputmode="decimal" value="${bal}" style="font-size:20px"></label><label class="f"><span>নোট</span><input class="in" id="pnote" placeholder="ঐচ্ছিক"></label>`,
    `<button class="btn" data-c>বাতিল</button><button class="btn teal" data-s>${ic('check')} সংরক্ষণ</button>`, 'sm');
  $('[data-c]', ov).onclick = ov.close;
  $('[data-s]', ov).onclick = async () => { const a = num($('#pamt', ov).value); if (a <= 0) return toast('সঠিক পরিমাণ দিন', 'err'); await put('ledger', { partyType: type, partyId: id, kind: 'payment', amount: a, date: today(), ref: '', note: ($('#pnote', ov).value || (type === 'customer' ? 'জমা' : 'পরিশোধ')) }); ov.close(); toast('জমা সংরক্ষিত হয়েছে', 'ok'); render(); };
}
function customerForm(c) {
  c = c || { type: 'retail' }; const ov = modal(c.id ? 'গ্রাহক সম্পাদনা' : 'নতুন গ্রাহক', `<form id="cf"><label class="f"><span>নাম *</span><input class="in" name="name" required value="${esc(c.name || '')}"></label><label class="f"><span>মোবাইল</span><input class="in" name="phone" value="${esc(c.phone || '')}"></label><label class="f"><span>ঠিকানা</span><input class="in" name="address" value="${esc(c.address || '')}"></label><label class="f"><span>ধরন</span><select class="in" name="type"><option value="retail" ${c.type !== 'wholesale' ? 'selected' : ''}>খুচরা</option><option value="wholesale" ${c.type === 'wholesale' ? 'selected' : ''}>পাইকারি (ফার্মেসী/ডাক্তার)</option></select></label>
    ${c.id ? '' : '<label class="f"><span>আগের বাকি (থাকলে) ৳</span><input class="in" name="opening" inputmode="decimal"></label>'}</form>`, `<button class="btn" data-c>বাতিল</button><button class="btn pri" data-s>সংরক্ষণ</button>`, 'sm');
  $('[data-c]', ov).onclick = ov.close;
  $('[data-s]', ov).onclick = async () => { const f = $('#cf', ov); if (!f.reportValidity()) return; const v = Object.fromEntries(new FormData(f).entries()); const op = num(v.opening); delete v.opening; const o = await put('customers', { ...c, ...v }); if (op > 0) await put('ledger', { partyType: 'customer', partyId: o.id, kind: 'due', amount: op, date: today(), ref: '', note: 'আগের বাকি' }); ov.close(); toast('গ্রাহক সংরক্ষিত', 'ok'); render(); };
}

/* ---------- স্টক সতর্কতা ---------- */
let alertTab = 'exp';
function pageAlerts(el) {
  const t = today(); const ac = alertCounts();
  const tabs = [['exp', `মেয়াদোত্তীর্ণ (${bnNum(ac.exp, 0)})`], ['30', '৩০ দিনের মধ্যে'], ['60', '৬০ দিনের মধ্যে'], ['90', '৯০ দিনের মধ্যে'], ['low', `কম স্টক (${bnNum(ac.low, 0)})`]];
  el.innerHTML = `<div class="tabs">${tabs.map(x => `<button data-t="${x[0]}" class="${alertTab === x[0] ? 'on' : ''}">${x[1]}</button>`).join('')}</div><div class="card" id="abox"></div>`;
  $$('[data-t]', el).forEach(b => b.onclick = () => { alertTab = b.dataset.t; render(); });
  const box = $('#abox');
  if (alertTab === 'low') {
    const list = D.medicines.filter(isLow).map(m => ({ m, st: stockOf(m.id) })).sort((a, b) => a.st - b.st);
    box.innerHTML = list.length ? `<div class="row mb" style="justify-content:space-between"><div class="muted">স্টক রি-অর্ডার লেভেলের সমান বা কম — সাপ্লায়ারকে অর্ডার দিন।</div><button class="btn sm" id="ordCsv">${ic('download')} অর্ডার তালিকা (CSV)</button></div><div class="twrap"><table class="tbl"><tr><th>ওষুধ</th><th>জেনেরিক</th><th>কোম্পানি</th><th class="num">বর্তমান স্টক</th><th class="num">রি-অর্ডার লেভেল</th></tr>${list.map(x => `<tr><td><b>${esc(medLabel(x.m))}</b></td><td>${esc(x.m.generic)}</td><td>${esc(x.m.company)}</td><td class="num"><span class="badge ${x.st <= 0 ? 'b-red' : 'b-amber'}">${bnNum(x.st, 0)}</span></td><td class="num">${bnNum(x.m.reorder, 0)}</td></tr>`).join('')}</table></div>` : empty('✅', 'সব ওষুধের স্টক যথেষ্ট আছে', 'কোনো ওষুধ রি-অর্ডার লেভেলের নিচে নামেনি।');
    const oc = $('#ordCsv'); if (oc) oc.onclick = () => download(`reorder_${t}.csv`, csvOf([['brand', 'generic', 'strength', 'form', 'company', 'stock', 'reorder_level', 'suggested_qty']].concat(list.map(x => [x.m.brand, x.m.generic, x.m.strength, FORM_EN[x.m.form] || x.m.form, x.m.company, x.st, x.m.reorder, Math.max(0, x.m.reorder * 2 - x.st)]))), 'text/csv');
    return;
  }
  let list;
  if (alertTab === 'exp') list = D.batches.filter(b => b.qty > 0 && b.expiry < t);
  else list = D.batches.filter(b => b.qty > 0 && b.expiry >= t && b.expiry <= addDays(t, +alertTab));
  list.sort((a, b) => a.expiry.localeCompare(b.expiry));
  box.innerHTML = list.length ? `<div class="twrap"><table class="tbl"><tr><th>ওষুধ</th><th>ব্যাচ</th><th>মেয়াদ</th><th>বাকি দিন</th><th class="num">পরিমাণ</th>${isOwner() ? '<th class="num">ক্রয়মূল্য</th>' : ''}<th></th></tr>${list.map(b => { const m = byId('medicines', b.medId); const dl = daysBetween(t, b.expiry); return `<tr><td><b>${esc(m ? medLabel(m) : '—')}</b><div class="small muted">${esc(m?.generic || '')} · <span>র‍্যাক ${esc(m?.rack || '—')}</span></div></td><td>${esc(b.batchNo)}</td><td>${bnDate(b.expiry)}</td><td><span class="badge ${dl < 0 ? 'b-red' : dl <= 30 ? 'b-red' : dl <= 60 ? 'b-amber' : 'b-pink'}">${dl < 0 ? bnNum(-dl, 0) + ' দিন আগে শেষ' : bnNum(dl, 0) + ' দিন'}</span></td><td class="num">${bnNum(b.qty, 0)}</td>${isOwner() ? `<td class="num">${tk(b.qty * (b.purchasePrice || 0))}</td>` : ''}<td class="right">${isOwner() ? `<button class="btn sm danger" data-wo="${b.id}">স্টক থেকে বাদ দিন</button>` : ''}</td></tr>`; }).join('')}</table></div>
    ${alertTab === 'exp' ? '<div class="alert info small mt">' + ic('info') + '<div>মেয়াদোত্তীর্ণ ওষুধ বিক্রি হবে না (বিক্রির স্টকে গোনা হয় না)। সাপ্লায়ারকে ফেরত দিয়ে বা নষ্ট করে "স্টক থেকে বাদ দিন" চাপুন।</div></div>' : ''}`
    : empty('✅', alertTab === 'exp' ? 'কোনো মেয়াদোত্তীর্ণ ওষুধ নেই' : 'এই সময়ের মধ্যে কোনো ওষুধের মেয়াদ শেষ হচ্ছে না', 'চমৎকার!');
  $$('[data-wo]', box).forEach(b => b.onclick = async () => { const bt = byId('batches', b.dataset.wo); const m = byId('medicines', bt.medId); if (!(await confirmBox(`${esc(m ? medLabel(m) : '')} — ব্যাচ ${esc(bt.batchNo)}-এর ${bnNum(bt.qty, 0)}টি স্টক থেকে বাদ দেবেন?`, 'হ্যাঁ, বাদ দিন'))) return; bt.writtenOff = (bt.writtenOff || 0) + bt.qty; bt.qty = 0; await put('batches', bt); toast('স্টক থেকে বাদ দেওয়া হয়েছে', 'ok'); render(); });
}

/* ---------- ইন্টার‍্যাকশন ও ADR ---------- */
let ixTab = 'check'; const IXC = { list: [] };
function pageIx(el) {
  el.innerHTML = `<div class="alert info">${ic('shield')}<div><b>এটি শুধু সহায়ক তথ্য — ফার্মাসিস্ট বা চিকিৎসকের সিদ্ধান্তের বিকল্প নয়।</b> আগে থেকে দেওয়া তালিকাটি ছোট (সাধারণ ও গুরুত্বপূর্ণ কিছু ইন্টার‍্যাকশন), FDA লেবেল, BNF ও EMA/MHRA-এর প্রকাশ্য তথ্যের ভিত্তিতে বাংলায় সংক্ষেপে লেখা এবং কোনো ফার্মাসিস্টের যাচাই করা নয়। কোনো সতর্কতা না দেখালেই ওষুধ নিরাপদ, এমন নয়। আপনি নিজে সম্পাদনা ও যোগ করতে পারবেন; যাচাইকারীর নাম "যাচাই করেছেন" ঘরে লিখুন।</div></div>
  <div class="tabs"><button data-t="check" class="${ixTab === 'check' ? 'on' : ''}">চেক করুন</button><button data-t="list" class="${ixTab === 'list' ? 'on' : ''}">ইন্টার‍্যাকশন তালিকা (${bnNum(D.interactions.length, 0)})</button><button data-t="adr" class="${ixTab === 'adr' ? 'on' : ''}">পার্শ্বপ্রতিক্রিয়া (ADR) (${bnNum(D.adr.length, 0)})</button></div><div id="ixb"></div>`;
  $$('[data-t]', el).forEach(b => b.onclick = () => { ixTab = b.dataset.t; render(); });
  const box = $('#ixb'); const gens = [...new Set(D.medicines.map(m => m.generic).concat(D.interactions.flatMap(i => [i.a, i.b])))].sort();
  if (ixTab === 'check') {
    box.innerHTML = `<div class="card"><h3>কয়েকটি ওষুধ একসাথে চেক করুন</h3><div class="row"><input class="in" id="ixin" list="ixgl" placeholder="জেনেরিক বা ব্র্যান্ড নাম লিখুন" style="max-width:420px"><button class="btn teal" id="ixadd">${ic('plus')} যোগ</button>${IXC.list.length ? '<button class="btn" id="ixclr">মুছুন</button>' : ''}</div><datalist id="ixgl">${gens.map(g => `<option value="${esc(g)}">`).join('')}${D.medicines.map(m => `<option value="${esc(m.brand)}">`).join('')}</datalist>
      <div class="row mt">${IXC.list.map((g, k) => `<span class="badge b-pink" style="font-size:15px;padding:4px 12px">${esc(g)} <a href="#" data-r="${k}" style="color:inherit">✕</a></span>`).join('')}</div><div id="ixres" class="mt"></div></div>`;
    const res = $('#ixres');
    if (IXC.list.length >= 2) { const f = checkInteractions(IXC.list); res.innerHTML = f.length ? f.map(x => `<div class="alert ${x.it.severity === 'গুরুতর' ? 'red' : 'amber'}">${ic('alert')}<div><b>${esc(tt(x.it.severity))}: ${esc(x.it.a)} + ${esc(x.it.b)}</b><div>${esc(x.it.note)}</div><div class="small"><span>সূত্র:</span> <span>${esc(x.it.source)}</span></div></div></div>`).join('') : `<div class="alert info">${ic('check')}<div>তালিকায় এই ওষুধগুলোর মধ্যে কোনো ইন্টার‍্যাকশন পাওয়া যায়নি। (এর মানে নিশ্চিত নিরাপদ নয় — সন্দেহ হলে ফার্মাসিস্ট/চিকিৎসককে জিজ্ঞেস করুন।)</div></div>`; }
    else res.innerHTML = '<div class="muted">অন্তত দুটি ওষুধ যোগ করুন।</div>';
    const add = () => { let v = $('#ixin').value.trim(); if (!v) return; const m = D.medicines.find(x => norm(x.brand) === norm(v)); if (m) v = m.generic; IXC.list.push(v); render(); setTimeout(() => $('#ixin')?.focus(), 30); };
    $('#ixadd').onclick = add; $('#ixin').onkeydown = e => { if (e.key === 'Enter') add(); };
    const c = $('#ixclr'); if (c) c.onclick = () => { IXC.list = []; render(); };
    $$('[data-r]', box).forEach(a => a.onclick = e => { e.preventDefault(); IXC.list.splice(+a.dataset.r, 1); render(); });
    return;
  }
  if (ixTab === 'list') {
    const L = [...D.interactions].sort((a, b) => SEV.indexOf(a.severity) - SEV.indexOf(b.severity) || a.a.localeCompare(b.a));
    box.innerHTML = `<div class="card"><div class="row mb" style="justify-content:space-between"><input class="in" id="ixf" placeholder="খুঁজুন…" style="max-width:320px"><button class="btn pri" id="ixnew">${ic('plus')} নতুন ইন্টার‍্যাকশন</button></div><div class="twrap"><table class="tbl" id="ixt"><tr><th>জেনেরিক ক</th><th>জেনেরিক খ</th><th>মাত্রা</th><th>নোট</th><th class="hide-m">সূত্র</th><th class="hide-m">যাচাই করেছেন</th><th></th></tr>${L.map(i => `<tr data-s="${esc(norm(i.a + ' ' + i.b + ' ' + i.note + ' ' + tt(i.note)))}"><td><b>${esc(i.a)}</b></td><td><b>${esc(i.b)}</b></td><td><span class="badge ${i.severity === 'গুরুতর' ? 'b-red' : i.severity === 'মাঝারি' ? 'b-amber' : ''}">${esc(tt(i.severity))}</span></td><td>${esc(i.note)}</td><td class="small hide-m">${esc(i.source)}</td><td class="small hide-m">${esc(i.reviewedBy || '—')}</td><td class="right" style="white-space:nowrap"><button class="iconbtn" data-e="${i.id}">${ic('edit')}</button> <button class="iconbtn" data-d="${i.id}" style="color:var(--red)">${ic('trash')}</button></td></tr>`).join('')}</table></div></div>`;
    $('#ixf').oninput = e => { const q = norm(e.target.value); $$('#ixt tr[data-s]').forEach(r => r.style.display = r.dataset.s.includes(q) ? '' : 'none'); };
    $('#ixnew').onclick = () => ixForm(null); $$('[data-e]', box).forEach(b => b.onclick = () => ixForm(byId('interactions', b.dataset.e)));
    $$('[data-d]', box).forEach(b => b.onclick = async () => { const i = byId('interactions', b.dataset.d); if (await confirmBox(`${esc(i.a)} + ${esc(i.b)} ইন্টার‍্যাকশনটি মুছবেন?`, 'হ্যাঁ, মুছুন')) { await del('interactions', i.id); render(); } });
    return;
  }
  box.innerHTML = `<div class="card"><div class="row mb" style="justify-content:flex-end"><button class="btn pri" id="adrnew">${ic('plus')} নতুন ADR তথ্য</button></div><div class="twrap"><table class="tbl"><tr><th>জেনেরিক</th><th>সাধারণ</th><th>গুরুতর</th><th>সতর্কতা</th><th class="hide-m">সূত্র</th><th></th></tr>${[...D.adr].sort((a, b) => a.generic.localeCompare(b.generic)).map(a => `<tr><td><b>${esc(a.generic)}</b></td><td>${esc(a.common)}</td><td>${esc(a.serious)}</td><td>${esc(a.caution)}</td><td class="small hide-m">${esc(a.source)}</td><td class="right" style="white-space:nowrap"><button class="iconbtn" data-e="${a.id}">${ic('edit')}</button> <button class="iconbtn" data-d="${a.id}" style="color:var(--red)">${ic('trash')}</button></td></tr>`).join('')}</table></div></div>`;
  $('#adrnew').onclick = () => adrForm(null); $$('[data-e]', box).forEach(b => b.onclick = () => adrForm(byId('adr', b.dataset.e)));
  $$('[data-d]', box).forEach(b => b.onclick = async () => { const a = byId('adr', b.dataset.d); if (await confirmBox(`${esc(a.generic)}-এর ADR তথ্য মুছবেন?`, 'হ্যাঁ, মুছুন')) { await del('adr', a.id); render(); } });
}
function ixForm(i) {
  i = i || { severity: 'মাঝারি' }; const gl = [...new Set(D.medicines.map(m => m.generic))].map(g => `<option value="${esc(g)}">`).join('');
  const ov = modal(i.id ? 'ইন্টার‍্যাকশন সম্পাদনা' : 'নতুন ইন্টার‍্যাকশন', `<form id="if"><div class="fgrid" style="grid-template-columns:1fr 1fr"><label class="f"><span>জেনেরিক ক *</span><input class="in" name="a" list="igl" required value="${esc(i.a || '')}"></label><label class="f"><span>জেনেরিক খ *</span><input class="in" name="b" list="igl" required value="${esc(i.b || '')}"></label></div><datalist id="igl">${gl}</datalist>
    <label class="f"><span>মাত্রা</span><select class="in" name="severity">${SEV.map(s => `<option value="${s}" ${i.severity === s ? 'selected' : ''}>${s}</option>`).join('')}</select></label><label class="f"><span>নোট (বাংলায়) *</span><textarea class="in" name="note" rows="3" required>${esc(i.note || '')}</textarea></label><label class="f"><span>সূত্র / লিংক</span><input class="in" name="source" value="${esc(i.source || '')}"></label><label class="f"><span>যাচাই করেছেন (ফার্মাসিস্ট/ডাক্তার)</span><input class="in" name="reviewedBy" value="${esc(i.reviewedBy || '')}"></label></form>`,
    `<button class="btn" data-c>বাতিল</button><button class="btn pri" data-s>সংরক্ষণ</button>`);
  $('[data-c]', ov).onclick = ov.close;
  $('[data-s]', ov).onclick = async () => { const f = $('#if', ov); if (!f.reportValidity()) return; await put('interactions', { ...i, ...Object.fromEntries(new FormData(f).entries()), sample: false }); ov.close(); toast('সংরক্ষিত', 'ok'); render(); };
}
function adrForm(a) {
  a = a || {}; const ov = modal(a.id ? 'ADR সম্পাদনা' : 'নতুন ADR তথ্য', `<form id="af"><label class="f"><span>জেনেরিক *</span><input class="in" name="generic" required value="${esc(a.generic || '')}"></label><label class="f"><span>সাধারণ পার্শ্বপ্রতিক্রিয়া</span><input class="in" name="common" value="${esc(a.common || '')}"></label><label class="f"><span>গুরুতর পার্শ্বপ্রতিক্রিয়া</span><input class="in" name="serious" value="${esc(a.serious || '')}"></label><label class="f"><span>সতর্কতা (গর্ভাবস্থা/কিডনি/শিশু)</span><input class="in" name="caution" value="${esc(a.caution || '')}"></label><label class="f"><span>সূত্র</span><input class="in" name="source" value="${esc(a.source || '')}"></label></form>`,
    `<button class="btn" data-c>বাতিল</button><button class="btn pri" data-s>সংরক্ষণ</button>`);
  $('[data-c]', ov).onclick = ov.close;
  $('[data-s]', ov).onclick = async () => { const f = $('#af', ov); if (!f.reportValidity()) return; await put('adr', { ...a, ...Object.fromEntries(new FormData(f).entries()), sample: false }); ov.close(); toast('সংরক্ষিত', 'ok'); render(); };
}

/* ---------- রিপোর্ট ---------- */
const REP = { preset: 'month', from: '', to: '', tab: 'summary' };
function presetRange(p) {
  const t = today(); const d = new Date();
  if (p === 'today') return [t, t]; if (p === 'yday') return [addDays(t, -1), addDays(t, -1)]; if (p === '7') return [addDays(t, -6), t];
  if (p === 'month') return [t.slice(0, 8) + '01', t];
  if (p === 'lmonth') { const f = new Date(d.getFullYear(), d.getMonth() - 1, 1), l = new Date(d.getFullYear(), d.getMonth(), 0); return [isoDate(f), isoDate(l)]; }
  return [REP.from || t, REP.to || t];
}
function pageReports(el) {
  const [from, to] = presetRange(REP.preset); REP.from = from; REP.to = to;
  const S = salesBetween(from, to); const retTot = r2(salesBetweenAll(from, to).reduce((a, s) => a + (s.returnedAmount || 0), 0)); const tot = S.reduce((a, s) => a + saleNet(s), 0), disc = S.reduce((a, s) => a + (s.discount || 0), 0), prof = S.reduce((a, s) => a + saleProfit(s), 0), due = S.reduce((a, s) => a + (s.due || 0), 0);
  const presets = [['today', 'আজ'], ['yday', 'গতকাল'], ['7', 'গত ৭ দিন'], ['month', 'এই মাস'], ['lmonth', 'গত মাস'], ['custom', 'তারিখ বাছুন']];
  el.innerHTML = `<div class="card mb"><div class="row" style="justify-content:space-between"><div class="seg" id="pre">${presets.map(p => `<button data-p="${p[0]}" class="${REP.preset === p[0] ? 'on' : ''}">${p[1]}</button>`).join('')}</div>
    <div class="row"><input type="date" class="in" id="rf" value="${from}" style="width:auto"> থেকে <input type="date" class="in" id="rt" value="${to}" style="width:auto"></div></div></div>
  <div class="grid g4 mb"><div class="card stat c-pink"><div class="ic">${ic('cart')}</div><div><div class="v">${tk(tot)}</div><div class="l">মোট বিক্রি · ${bnNum(S.length, 0)}টি রসিদ</div></div></div>
    <div class="card stat c-teal"><div class="ic">${ic('trend')}</div><div><div class="v">${tk(prof)}</div><div class="l">লাভ (বিক্রি − ক্রয়মূল্য)</div></div></div>
    <div class="card stat c-navy"><div class="ic">${ic('money')}</div><div><div class="v">${tk(S.length ? tot / S.length : 0)}</div><div class="l">গড় বিল · ছাড় ${tk(disc)}</div></div></div>
    <div class="card stat c-amber"><div class="ic">${ic('wallet')}</div><div><div class="v">${tk(due)}</div><div class="l">এই সময়ে বাকিতে বিক্রি</div></div></div></div>
  ${retTot ? `<div class="alert info small">${ic('info')}<div><span>এই সময়ের বিক্রিতে ফেরত/বাতিল:</span> <b>${tk(retTot)}</b> <span>— উপরের মোট বিক্রি ও লাভ থেকে বাদ দেওয়া হয়েছে।</span></div></div>` : ''}
  <div class="card"><div class="row" style="justify-content:space-between"><div class="tabs" style="margin:0;border:0">${[['summary', 'দৈনিক সারাংশ'], ['sales', 'বিক্রির তালিকা'], ['top', 'সর্বাধিক বিক্রিত'], ['stock', 'স্টক মূল্যায়ন'], ['dues', 'বাকি']].map(t => `<button data-t="${t[0]}" class="${REP.tab === t[0] ? 'on' : ''}">${t[1]}</button>`).join('')}</div><button class="btn sm" id="rcsv">${ic('download')} CSV ডাউনলোড</button></div><div id="rbox" class="mt"></div></div>`;
  $$('#pre button').forEach(b => b.onclick = () => { REP.preset = b.dataset.p; render(); });
  $('#rf').onchange = e => { REP.preset = 'custom'; REP.from = e.target.value; render(); }; $('#rt').onchange = e => { REP.preset = 'custom'; REP.to = e.target.value; render(); };
  $$('[data-t]', el).forEach(b => b.onclick = () => { REP.tab = b.dataset.t; render(); });
  let rows = [];
  const box = $('#rbox');
  if (REP.tab === 'summary') {
    const byDay = {}; S.forEach(s => { const d = s.date.slice(0, 10); byDay[d] = byDay[d] || { n: 0, t: 0, p: 0, d: 0 }; byDay[d].n++; byDay[d].t += saleNet(s); byDay[d].p += saleProfit(s); byDay[d].d += s.due || 0; });
    const ks = Object.keys(byDay).sort().reverse(); rows = [['date', 'invoices', 'sales', 'profit', 'due']].concat(ks.map(k => [k, byDay[k].n, r2(byDay[k].t), r2(byDay[k].p), r2(byDay[k].d)]));
    box.innerHTML = ks.length ? `<div class="twrap"><table class="tbl"><tr><th>তারিখ</th><th class="num">রসিদ</th><th class="num">বিক্রি</th><th class="num">লাভ</th><th class="num">বাকি</th></tr>${ks.map(k => `<tr><td>${bnDate(k)}</td><td class="num">${bnNum(byDay[k].n, 0)}</td><td class="num"><b>${tk(byDay[k].t)}</b></td><td class="num">${tk(byDay[k].p)}</td><td class="num">${tk(byDay[k].d)}</td></tr>`).join('')}<tr><td><b>মোট</b></td><td class="num"><b>${bnNum(S.length, 0)}</b></td><td class="num"><b>${tk(tot)}</b></td><td class="num"><b>${tk(prof)}</b></td><td class="num"><b>${tk(due)}</b></td></tr></table></div>` : empty('📊', 'এই সময়ে কোনো বিক্রি নেই', 'অন্য তারিখ বাছাই করে দেখুন।');
  } else if (REP.tab === 'sales') {
    const L = salesBetweenAll(from, to).sort((a, b) => b.date.localeCompare(a.date)); rows = [['invoice', 'datetime', 'customer', 'phone', 'mode', 'items', 'subtotal', 'discount', 'total', 'returned', 'net', 'paid', 'due', 'profit', 'status', 'user']].concat(L.map(s => [s.no, s.date, s.custName, s.custPhone, s.mode, s.items.length, s.subtotal, s.discount, s.total, s.returnedAmount || 0, saleNet(s), s.paid, s.due, saleProfit(s), s.void ? 'cancelled' : s.returnedAmount ? 'partly_returned' : 'ok', s.user]));
    box.innerHTML = L.length ? `<div class="twrap"><table class="tbl"><tr><th>রসিদ</th><th>সময়</th><th>গ্রাহক</th><th>ধরন</th><th class="num">মোট</th><th class="num">লাভ</th><th class="num">বাকি</th><th></th></tr>${L.map(s => `<tr${s.void ? ' style="opacity:.6"' : ''}><td><b>${s.no}</b>${s.void ? ' <span class="badge b-red">বাতিল হয়েছে</span>' : s.returnedAmount ? ' <span class="badge b-amber">আংশিক ফেরত</span>' : ''}</td><td>${bnDateTime(s.date)}</td><td>${esc(s.custName || 'সাধারণ গ্রাহক')}</td><td>${s.mode === 'wholesale' ? '<span class="badge b-teal">পাইকারি</span>' : 'খুচরা'}</td><td class="num"><b>${tk(saleNet(s))}</b></td><td class="num">${tk(saleProfit(s))}</td><td class="num">${s.due ? tk(s.due) : '—'}</td><td class="right"><button class="btn sm" data-rc="${s.id}">${ic('print')}</button></td></tr>`).join('')}</table></div>` : empty('🧾', 'এই সময়ে কোনো বিক্রি নেই');
    $$('[data-rc]', box).forEach(b => b.onclick = () => showReceipt(byId('sales', b.dataset.rc)));
  } else if (REP.tab === 'top') {
    const agg = {}; S.forEach(s => s.items.forEach(i => { const q = i.qty - retQty(i); if (q <= 0) return; const a = agg[i.medId] = agg[i.medId] || { name: i.name + ' ' + (i.strength || ''), generic: i.generic, q: 0, t: 0, p: 0 }; a.q += q; a.t += q * i.price; a.p += q * (i.price - (i.cost || 0)); }));
    const L = Object.values(agg).sort((a, b) => b.t - a.t).slice(0, 30); const mx = Math.max(1, ...L.map(x => x.t));
    rows = [['medicine', 'generic', 'qty', 'sales', 'gross_profit']].concat(L.map(x => [x.name, x.generic, x.q, r2(x.t), r2(x.p)]));
    box.innerHTML = L.length ? `<div class="twrap"><table class="tbl"><tr><th>#</th><th>ওষুধ</th><th class="num">পরিমাণ</th><th class="num">বিক্রি</th><th class="num">লাভ</th><th style="width:28%"></th></tr>${L.map((x, k) => `<tr><td>${bnNum(k + 1, 0)}</td><td><b>${esc(x.name)}</b><div class="small muted">${esc(x.generic)}</div></td><td class="num">${bnNum(x.q, 0)}</td><td class="num"><b>${tk(x.t)}</b></td><td class="num">${tk(x.p)}</td><td><div style="height:10px;border-radius:6px;background:linear-gradient(90deg,var(--pink),var(--teal));width:${x.t / mx * 100}%"></div></td></tr>`).join('')}</table></div>` : empty('🏆', 'এই সময়ে কোনো বিক্রি নেই');
  } else if (REP.tab === 'stock') {
    const t = today(); const BG = new Map(); D.batches.forEach(b => { if (b.qty > 0 && b.expiry >= t) { const a = BG.get(b.medId); if (a) a.push(b); else BG.set(b.medId, [b]); } }); const L = D.medicines.filter(m => BG.has(m.id)).map(m => { const bs = BG.get(m.id); const q = bs.reduce((a, b) => a + b.qty, 0); return { m, q, cost: bs.reduce((a, b) => a + b.qty * (b.purchasePrice || 0), 0), mrp: q * (m.mrp || 0), wh: q * (m.wholesalePrice || 0) }; }).filter(x => x.q > 0).sort((a, b) => b.cost - a.cost);
    const T = L.reduce((a, x) => ({ cost: a.cost + x.cost, mrp: a.mrp + x.mrp, wh: a.wh + x.wh }), { cost: 0, mrp: 0, wh: 0 });
    rows = [['medicine', 'generic', 'qty', 'cost_value', 'wholesale_value', 'mrp_value']].concat(L.map(x => [medLabel(x.m), x.m.generic, x.q, r2(x.cost), r2(x.wh), r2(x.mrp)]));
    box.innerHTML = `<div class="grid g3 mb"><div class="alert navy" style="margin:0"><div>ক্রয়মূল্যে স্টক<br><b style="font-size:22px">${tk(T.cost)}</b></div></div><div class="alert navy" style="margin:0"><div>পাইকারি দামে<br><b style="font-size:22px">${tk(T.wh)}</b></div></div><div class="alert navy" style="margin:0"><div>MRP-তে (সম্ভাব্য বিক্রি)<br><b style="font-size:22px">${tk(T.mrp)}</b></div></div></div><div class="small muted mb">মেয়াদোত্তীর্ণ স্টক বাদে। এই হিসাব তারিখ-নির্বিশেষে বর্তমান স্টকের।</div>
      <div class="twrap"><table class="tbl"><tr><th>ওষুধ</th><th class="num">পরিমাণ</th><th class="num">ক্রয়মূল্যে</th><th class="num">MRP-তে</th></tr>${L.map(x => `<tr><td><b>${esc(medLabel(x.m))}</b></td><td class="num">${bnNum(x.q, 0)}</td><td class="num">${tk(x.cost)}</td><td class="num">${tk(x.mrp)}</td></tr>`).join('')}</table></div>`;
  } else {
    const C = D.customers.map(c => ({ n: c.name, p: c.phone, t: 'গ্রাহক', b: balanceOf('customer', c.id) })).concat(D.suppliers.map(s => ({ n: s.name, p: s.phone, t: 'সাপ্লায়ার', b: balanceOf('supplier', s.id) }))).filter(x => x.b > 0).sort((a, b) => b.b - a.b);
    rows = [['type', 'name', 'phone', 'balance']].concat(C.map(x => [x.t, x.n, x.p, x.b]));
    box.innerHTML = C.length ? `<div class="twrap"><table class="tbl"><tr><th>ধরন</th><th>নাম</th><th>মোবাইল</th><th class="num">বাকি</th></tr>${C.map(x => `<tr><td>${x.t === 'গ্রাহক' ? '<span class="badge b-amber">গ্রাহক (পাওনা)</span>' : '<span class="badge b-pink">সাপ্লায়ার (দেনা)</span>'}</td><td><b>${esc(x.n)}</b></td><td>${esc(x.p)}</td><td class="num"><b>${tk(x.b)}</b></td></tr>`).join('')}</table></div>` : empty('📒', 'কারো কোনো বাকি নেই');
  }
  $('#rcsv').onclick = () => rows.length > 1 ? download(`sakura_report_${REP.tab}_${from}_${to}.csv`, csvOf(rows), 'text/csv') : toast('ডাউনলোড করার মতো তথ্য নেই', 'err');
}

/* ---------- ব্যাকআপ ও সেটিংস ---------- */
function doBackup() {
  const data = {}; STORES.forEach(s => data[s] = D[s]);
  download(`sakura_pharma_backup_${today()}_${new Date().toTimeString().slice(0, 5).replace(':', '')}.json`, JSON.stringify({ app: 'sakura-pharma', version: APP_VER, exportedAt: new Date().toISOString(), data }), 'application/json');
  setSetting('lastBackup', new Date().toISOString()); toast('ব্যাকআপ ফাইল ডাউনলোড হয়েছে — নিরাপদ জায়গায় রাখুন', 'ok');
}
async function restoreBackup(file) {
  let j; try { j = JSON.parse(await file.text()); } catch (e) { return toast('ফাইলটি সঠিক ব্যাকআপ নয়', 'err'); }
  if (j.app !== 'sakura-pharma' || !j.data) return toast('এটি সাকুরা ফার্মার ব্যাকআপ ফাইল নয়', 'err');
  const n = (j.data.medicines || []).length, sN = (j.data.sales || []).length;
  if (!(await confirmBox(`ব্যাকআপ (${bnDate((j.exportedAt || '').slice(0, 10))}) ফেরত আনবেন? এতে আছে ${bnNum(n, 0)}টি ওষুধ ও ${bnNum(sN, 0)}টি বিক্রি।<br><b style="color:var(--red)">এই ডিভাইসের বর্তমান সব ডেটা মুছে ব্যাকআপের ডেটা বসবে।</b>`, 'হ্যাঁ, ফেরত আনুন'))) return;
  for (const s of STORES) { await clearStore(s); if (j.data[s]?.length) await putMany(s, j.data[s]); }
  await setSetting('lastBackup', new Date().toISOString()); currentUser = null; toast('ব্যাকআপ থেকে ডেটা ফেরত আনা হয়েছে', 'ok'); render();
}
function pageSettings(el) {
  const shop = setting('shop') || {}; const lastB = setting('lastBackup');
  el.innerHTML = `<div class="grid g2">
  <div class="card"><h3>💾 ব্যাকআপ ও রিস্টোর</h3><p class="muted" style="margin-top:0">সব ডেটা শুধু এই ডিভাইসের ব্রাউজারে থাকে। ব্রাউজারের ডেটা মুছলে বা ডিভাইস নষ্ট হলে ডেটা হারাবে — তাই <b>প্রতিদিন দোকান বন্ধের আগে</b> (অন্তত সপ্তাহে একবার) ব্যাকআপ নিয়ে পেনড্রাইভ/Google Drive-এ রাখুন।</p>
    <div class="alert ${!lastB || daysBetween(lastB.slice(0, 10), today()) >= 7 ? 'amber' : 'info'}">${ic('clock')}<div>শেষ ব্যাকআপ: <b>${lastB ? bnDateTime(lastB) : 'কখনও নেওয়া হয়নি'}</b></div></div>
    <div class="row"><button class="btn pri" id="bk">${ic('download')} ব্যাকআপ ডাউনলোড</button><label class="btn">${ic('upload')} ব্যাকআপ থেকে ফেরত আনুন<input type="file" id="rs" accept=".json" hidden></label></div></div>
  <div class="card"><h3>📊 Excel / CSV</h3><p class="muted" style="margin-top:0">ওষুধের তালিকা ও দাম Excel-এ (৫টি শিট: Medicines, Prices, Interactions, ADR, Suppliers) রাখুন, Google Sheet-এ সম্পাদনা করে আবার ইমপোর্ট করুন।</p>
    <div class="row"><button class="btn" id="ex">${ic('download')} Excel এক্সপোর্ট</button><button class="btn" id="im">${ic('upload')} ইমপোর্ট</button><button class="btn" id="tp">খালি টেমপ্লেট</button></div></div>
  <div class="card"><h3>🏪 দোকানের তথ্য (রসিদে ছাপা হবে)</h3><form id="shf">${[['name', 'দোকানের নাম'], ['type', 'দোকানের ধরন'], ['address', 'ঠিকানা'], ['phone', 'মোবাইল'], ['slogan', 'স্লোগান'], ['footer', 'রসিদের নিচের লেখা']].map(f => `<label class="f"><span>${f[1]}</span><input class="in" name="${f[0]}" value="${esc(shop[f[0]] || '')}"></label>`).join('')}
    <details class="mb"><summary style="cursor:pointer;font-weight:600;color:var(--navy)">English লেখা (ইংরেজি মোডে পর্দা ও রসিদে দেখাবে)</summary><div class="mt">${[['nameEn', 'দোকানের নাম (English)'], ['typeEn', 'দোকানের ধরন (English)'], ['addressEn', 'ঠিকানা (English)'], ['sloganEn', 'স্লোগান (English)'], ['footerEn', 'রসিদের নিচের লেখা (English)']].map(f => `<label class="f"><span>${f[1]}</span><input class="in" name="${f[0]}" value="${esc(shop[f[0]] || SHOP_EN[f[0]])}"></label>`).join('')}</div></details></form><button class="btn pri" id="shs">${ic('check')} সংরক্ষণ</button></div>
  <div class="card"><h3>🔒 পিন লগইন ও ব্যবহারকারী</h3><p class="muted" style="margin-top:0">পিন চালু করলে সফটওয়্যার খুলতে পিন লাগবে। <b>বিক্রেতা</b> রিপোর্ট, লাভ, ক্রয়মূল্য, সেটিংস ও মুছে ফেলার অপশন দেখতে পাবে না।</p>
    <label class="row" style="gap:10px;font-weight:600;margin-bottom:12px"><input type="checkbox" id="pinOn" ${setting('pinEnabled') ? 'checked' : ''} style="width:22px;height:22px"> পিন লগইন চালু</label>
    ${D.users.length ? `<table class="tbl mb"><tr><th>নাম</th><th>ভূমিকা</th><th></th></tr>${D.users.map(u => `<tr><td><b>${esc(u.name)}</b></td><td>${u.role === 'owner' ? '<span class="badge b-pink">মালিক</span>' : '<span class="badge">বিক্রেতা</span>'}</td><td class="right"><button class="iconbtn" data-du="${u.id}" style="color:var(--red)">${ic('trash')}</button></td></tr>`).join('')}</table>` : '<div class="muted mb">এখনও কোনো ব্যবহারকারী নেই।</div>'}
    <button class="btn" id="addU">${ic('plus')} ব্যবহারকারী যোগ</button></div>
  <div class="card"><h3>🇧🇩 বাংলাদেশের ওষুধের ডাটাবেস</h3>${bdInfoHTML()}<div class="row"><button class="btn teal" id="bdLoad">${ic('download')} সম্পূর্ণ বাংলাদেশ ওষুধ ডাটাবেস লোড করুন (২৪,০০০+)</button>${D.medicines.some(m => m.catalog) ? '<button class="btn danger" id="bdDel">ডাটাবেস থেকে আনা ওষুধ সরান</button>' : ''}</div></div>
  <div class="card"><h3>🧪 নমুনা ডেটা</h3><p class="muted" style="margin-top:0">শুরুতে চেষ্টা করার জন্য নমুনা ওষুধ, দাম, স্টক, বিক্রি, গ্রাহক ও সাপ্লায়ার দেওয়া আছে। দামগুলো কাল্পনিক।</p>
    <div class="row"><button class="btn" id="clrTx">নমুনা বিক্রি/স্টক/গ্রাহক মুছুন (ওষুধের নাম রাখুন)</button><button class="btn danger" id="clrAll">সব নমুনা ডেটা মুছুন</button></div></div>
  <div class="card"><h3>⚠️ বিপজ্জনক এলাকা</h3><p class="muted" style="margin-top:0">সব ডেটা মুছে একদম নতুন করে শুরু করুন (আগে ব্যাকআপ নিন)।</p><button class="btn danger" id="reset">${ic('trash')} সব ডেটা মুছুন</button>
    <p class="small muted mt">সাকুরা ফার্মা সফটওয়্যার সংস্করণ ${APP_VER} · অফলাইন · কোনো মাসিক ফি নেই। ফন্ট: Hind Siliguri (SIL OFL)। Excel: SheetJS (Apache-2.0)।</p></div>
  </div>`;
  $('#bk').onclick = () => { doBackup(); setTimeout(render, 300); };
  $('#rs').onchange = e => e.target.files[0] && restoreBackup(e.target.files[0]);
  $('#ex').onclick = () => exportExcel(); $('#im').onclick = importDialog; $('#tp').onclick = () => exportExcel(true);
  $('#shs').onclick = async () => { await setSetting('shop', { ...shop, ...Object.fromEntries(new FormData($('#shf')).entries()) }); toast('দোকানের তথ্য সংরক্ষিত', 'ok'); render(); };
  $('#addU').onclick = userForm;
  $('#bdLoad').onclick = bdDialog; const bdd = $('#bdDel'); if (bdd) bdd.onclick = bdRemove;
  $$('[data-du]', el).forEach(b => b.onclick = async () => { const u = byId('users', b.dataset.du); if (u.role === 'owner' && D.users.filter(x => x.role === 'owner').length === 1 && setting('pinEnabled')) return toast('পিন চালু থাকা অবস্থায় শেষ মালিককে মোছা যাবে না', 'err'); if (await confirmBox(`<span>এই ব্যবহারকারীকে মুছবেন:</span> <b>${esc(u.name)}</b>`, 'হ্যাঁ, মুছুন')) { await del('users', u.id); render(); } });
  $('#pinOn').onchange = async e => {
    if (e.target.checked) { if (!D.users.some(u => u.role === 'owner')) { e.target.checked = false; toast('আগে একজন "মালিক" ব্যবহারকারী পিনসহ যোগ করুন', 'err'); return userForm('owner'); } await setSetting('pinEnabled', true); const o = D.users.find(u => u.role === 'owner'); currentUser = currentUser || { id: o.id, name: o.name, role: 'owner' }; toast('পিন লগইন চালু হয়েছে', 'ok'); render(); }
    else { await setSetting('pinEnabled', false); toast('পিন লগইন বন্ধ'); render(); }
    render();
  };
  $('#clrTx').onclick = async () => { if (!(await confirmBox('নমুনা বিক্রি, স্টক, গ্রাহক, সাপ্লায়ার ও ডেলিভারি মুছে যাবে। ওষুধের নাম-তালিকা থাকবে (দাম আপনাকে বসাতে হবে)। চালিয়ে যাবেন?', 'হ্যাঁ, মুছুন'))) return; await clearSample(false); };
  $('#clrAll').onclick = async () => { if (!(await confirmBox('সব নমুনা ডেটা (ওষুধ, দাম, স্টক, বিক্রি, গ্রাহক, সাপ্লায়ার) মুছে যাবে। ইন্টার‍্যাকশন তালিকা থাকবে। চালিয়ে যাবেন?', 'হ্যাঁ, মুছুন'))) return; await clearSample(true); };
  $('#reset').onclick = async () => { if (!(await confirmBox('<b>সব ডেটা</b> স্থায়ীভাবে মুছে যাবে — ওষুধ, স্টক, বিক্রি, বাকি খাতা সব। ব্যাকআপ নিয়েছেন?', 'হ্যাঁ, সব মুছুন'))) return; if (!(await confirmBox('শেষবার জিজ্ঞেস করছি — সত্যিই সব মুছবেন? এটি ফেরানো যাবে না।', 'হ্যাঁ, স্থায়ীভাবে মুছুন'))) return; for (const s of STORES) await clearStore(s); await setSetting('seeded', true); await setSetting('shop', shop); await setSetting('saleNo', 0); currentUser = null; toast('সব ডেটা মুছে ফেলা হয়েছে'); render(); };
}
/* ---------- বাংলাদেশের ওষুধের ডাটাবেস (BDDrugBank) ইমপোর্ট ---------- */
const BD_SRC = 'BDDrugBank v1.0.0 (Zenodo 20749707) — medex.com.bd থেকে সংগৃহীত, সেপ্টেম্বর ২০২৫ স্ন্যাপশট; লাইসেন্স: CC-BY-4.0 (Zenodo-তে যেমন লেখা)';
function bdInfoHTML() {
  const n = D.medicines.filter(m => m.catalog === 'bddb').length;
  return `<p class="muted" style="margin-top:0">২৪,৭১৮টি ব্র্যান্ড-ওষুধ: জেনেরিক, শক্তি, ধরন, কোম্পানি, থেরাপিউটিক ক্লাস ও MRP। আমদানি করা ওষুধের স্টক থাকবে ০ — কেনার সময় "ক্রয় / স্টক-ইন" থেকে স্টক যোগ করুন। নমুনা ডেটা আলাদা থাকবে।</p>
  <div class="alert info">${ic('info')}<div><b>উৎস:</b> <span translate="no">${esc(BD_SRC)}</span>.<br><span>MedEx-এর শর্তে ডেটা শুধু ব্যক্তিগত, অ-বাণিজ্যিক ব্যবহারের জন্য; ব্যবহারের আগে উৎসের শর্ত দেখে নিন।</span><br><b>MRP সেপ্টেম্বর ২০২৫-এর; ক্রয়মূল্য ও পাইকারি দাম আনুমানিক। বিক্রির আগে DGDA ও সাপ্লায়ারের ইনভয়েস দেখে যাচাই করুন।</b></div></div>
  ${n ? `<div class="small mb"><span>এখন তালিকায় ডাটাবেস থেকে আনা ওষুধ:</span> <b>${bnNum(n, 0)}</b></div>` : ''}`;
}
let BD_TRY = null; // সফটওয়্যারের সাথে দেওয়া ডেটা ফাইল একবারই খোঁজা হয়
function loadBdData() {
  if (window.BD_MEDS) return Promise.resolve(window.BD_MEDS);
  if (BD_TRY) return BD_TRY;
  BD_TRY = new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = 'data/bd_medicines.js'; sc.onload = () => window.BD_MEDS ? res(window.BD_MEDS) : rej(new Error('empty')); sc.onerror = () => { sc.remove(); rej(new Error('missing')); }; document.head.appendChild(sc); });
  // ফাইল না থাকলে (পাবলিক/GitHub সংস্করণ) এই সেশনে আর খোঁজা হয় না — ফাইল বেছে নিতে বলা হয়
  return BD_TRY;
}
// কম্পিউটারে রাখা bd_medicines.json বা bd_medicines.js ফাইল পড়া (কোড চালানো হয় না, শুধু JSON পড়া হয়)
function parseBdFile(text) {
  let t = String(text || '').replace(/^\uFEFF/, '').trim();
  if (!t.startsWith('{')) { const i = t.indexOf('{'), j = t.lastIndexOf('}'); if (i < 0 || j < i) throw new Error('format'); t = t.slice(i, j + 1); }
  const B = JSON.parse(t);
  if (!B || !B.meta || !Array.isArray(B.R) || !Array.isArray(B.AF) || !Array.isArray(B.G) || !Array.isArray(B.C)) throw new Error('format');
  return B;
}
function bdDialog() {
  const pr = setting('bdPrice') || { margin: 12, wh: 4, disc: 0 }; let fileB = null;
  const ov = modal('সম্পূর্ণ বাংলাদেশ ওষুধ ডাটাবেস লোড করুন', `${bdInfoHTML()}
    <div id="bdsrc" class="small muted mb">ডেটা ফাইল খোঁজা হচ্ছে…</div>
    <div id="bdpick" class="alert amber" style="display:none">${ic('upload')}<div><b>ডেটা ফাইলটি (bd_medicines.json) আপনার কম্পিউটারে রাখা আছে, সেটি বেছে নিন।</b><br><span>The data file (bd_medicines.json) is kept on your computer — please choose it.</span><br><span class="small">ফাইলটি সফটওয়্যারের সাথে (অনলাইন/GitHub সংস্করণে) দেওয়া হয় না। দোকানের কম্পিউটারের "sakura_pharma_db" ফোল্ডারে বা পূর্ণ zip-এর data ফোল্ডারে পাবেন (bd_medicines.json অথবা bd_medicines.js)।</span><br><span class="small">It is not included in the online/GitHub version. Find it in the "sakura_pharma_db" folder on the shop computer, or in the data folder of the full zip.</span>
      <div class="row mt"><label class="btn">${ic('upload')} ফাইল বেছে নিন / Choose file<input type="file" id="bdfile" accept=".json,.js,application/json,text/javascript" hidden></label><span id="bdfn" class="small"></span></div></div></div>
    <div class="fgrid"><label class="f"><span>ফার্মেসি মার্জিন (MRP-এর %)</span><input class="in" id="bdm" type="number" min="0" max="50" step="0.5" value="${pr.margin}"></label>
    <label class="f"><span>পাইকারি মার্কআপ (ক্রয়মূল্যের ওপর %)</span><input class="in" id="bdw" type="number" min="0" max="50" step="0.5" value="${pr.wh}"></label>
    <label class="f"><span>খুচরা ছাড় (MRP থেকে %, ০–৫)</span><input class="in" id="bdc" type="number" min="0" max="5" step="0.5" value="${pr.disc}"></label></div>
    <div class="small muted">ক্রয়মূল্য = MRP × (১ − মার্জিন) · পাইকারি = ক্রয়মূল্য × (১ + মার্কআপ) · বাজারদর = MRP × (১ − ছাড়)। সব আনুমানিক — "আনুমানিক" চিহ্ন থাকবে।</div>
    <div id="bdp" class="mt" style="display:none"><div class="pbar"><i id="bdbar"></i></div><div class="small mt" id="bdtxt"></div></div>`,
    `<button class="btn" data-c>বাতিল</button><button class="btn pri" data-s disabled>${ic('download')} লোড শুরু করুন</button>`);
  $('[data-c]', ov).onclick = ov.close;
  const srcEl = $('#bdsrc', ov), startBtn = $('[data-s]', ov);
  const showPick = () => { srcEl.style.display = 'none'; $('#bdpick', ov).style.display = 'flex'; startBtn.disabled = !fileB; };
  loadBdData().then(B => { srcEl.innerHTML = `<span>সফটওয়্যারের সাথে দেওয়া ডেটা ফাইল পাওয়া গেছে:</span> <b>${bnNum(B.R.length, 0)}</b> <span>টি ওষুধ।</span>`; startBtn.disabled = false; }).catch(showPick);
  $('#bdfile', ov).onchange = async e => {
    const f = e.target.files[0]; if (!f) return; const fn = $('#bdfn', ov); fn.textContent = f.name + ' …';
    try { fileB = parseBdFile(await f.text()); fn.innerHTML = `<b>${esc(f.name)}</b> — ${bnNum(fileB.R.length, 0)} <span>টি ওষুধ পাওয়া গেছে</span> ✔`; startBtn.disabled = false; }
    catch (err) { console.warn(err); fileB = null; startBtn.disabled = true; fn.innerHTML = '<span style="color:var(--red)">এই ফাইলটি সঠিক ডেটা ফাইল নয়। bd_medicines.json অথবা bd_medicines.js বেছে নিন।</span>'; }
  };
  startBtn.onclick = async () => {
    const margin = Math.min(50, Math.max(0, num($('#bdm', ov).value))), wh = Math.min(50, Math.max(0, num($('#bdw', ov).value))), disc = Math.min(5, Math.max(0, num($('#bdc', ov).value)));
    startBtn.disabled = true; $('[data-c]', ov).disabled = true; $('#bdp', ov).style.display = 'block';
    const bar = $('#bdbar', ov), txt = $('#bdtxt', ov); const set = (p, t) => { bar.style.width = p + '%'; txt.innerHTML = t; };
    set(3, '<span>ডাটাবেস ফাইল খোলা হচ্ছে…</span>');
    try {
      const B = fileB || await loadBdData(); await setSetting('bdPrice', { margin, wh, disc });
      const r = await bdImport(B, { margin, wh, disc }, (done, total) => set(5 + Math.round(95 * done / total), `<span>সংরক্ষণ হচ্ছে:</span> <b>${bnNum(done, 0)} / ${bnNum(total, 0)}</b>`));
      await setSetting('bdImported', { at: new Date().toISOString(), count: r.added, snapshot: B.meta.snapshot, from: fileB ? 'file' : 'bundled' });
      set(100, `<b>${bnNum(r.added, 0)}</b> <span>টি ওষুধ যোগ হয়েছে।</span> ${r.skipped ? `<span>আগে থেকেই ছিল বলে বাদ:</span> <b>${bnNum(r.skipped, 0)}</b>` : ''}`);
      toast('ডাটাবেস লোড সম্পন্ন', 'ok'); $('[data-c]', ov).disabled = false; $('[data-c]', ov).textContent = 'বন্ধ করুন'; $('[data-c]', ov).onclick = () => { ov.close(); render(); };
    } catch (e) { console.warn(e); set(0, '<span style="color:var(--red)">ডাটাবেস ফাইল লোড করা যায়নি। ফাইলটি আবার বেছে নিন।</span>'); showPick(); $('[data-c]', ov).disabled = false; }
  };
}
async function bdImport(B, pr, onProg) {
  const t = today(); const have = new Set(D.medicines.map(m => m.id));
  const mine = new Set(D.medicines.filter(m => !m.catalog && !m.sample).map(m => norm(m.brand) + '|' + norm(m.strength) + '|' + m.form));
  const out = []; let skipped = 0;
  for (const r of B.R) {
    const form = B.AF[r[5]];
    if (have.has(r[0]) || mine.has(norm(r[1]) + '|' + norm(r[4]) + '|' + form)) { skipped++; continue; }
    const mrp = r[10] || 0; const pp = mrp ? r2(mrp * (1 - pr.margin / 100)) : 0; const fl = r[12];
    out.push({ id: r[0], brand: r[1], nameBn: r[2] || '', generic: B.G[r[3]], strength: r[4] || '', form, dosageForm: B.SF[r[6]], packSize: r[7] ? String(r[7]) : '', company: B.C[r[8]], tclass: B.K[r[9]] || '',
      mrp, mrpStrip: r[11] || 0, purchasePrice: pp, wholesalePrice: pp ? r2(pp * (1 + pr.wh / 100)) : 0, marketPrice: mrp ? r2(mrp * (1 - pr.disc / 100)) : 0,
      rx: !!(fl & 1), antibiotic: !!(fl & 2), controlled: !!(fl & 4), priceFlag: !!(fl & 8), reorder: 0, rack: '', barcode: '', dar: '',
      catalog: 'bddb', priceEst: true, priceSource: 'BDDrugBank (medex.com.bd, Sep 2025) — MRP উৎস থেকে, ক্রয়/পাইকারি আনুমানিক', priceDate: B.meta.snapshot, sample: false, created: t });
  }
  const CH = 1000;
  for (let i = 0; i < out.length; i += CH) { await putMany('medicines', out.slice(i, i + CH)); onProg && onProg(Math.min(out.length, i + CH), out.length); await new Promise(r => setTimeout(r, 0)); }
  if (!out.length && onProg) onProg(1, 1);
  return { added: out.length, skipped };
}
async function bdRemove() {
  const used = stockMap().any; const ids = D.medicines.filter(m => m.catalog && !used.has(m.id)).map(m => m.id); const keep = D.medicines.filter(m => m.catalog).length - ids.length;
  if (!(await confirmBox(`<span>ডাটাবেস থেকে আনা</span> <b>${bnNum(ids.length, 0)}</b> <span>টি ওষুধ সরানো হবে।</span> ${keep ? `<br><small class="muted"><span>যেগুলোর স্টক/ক্রয় আছে সেগুলো থাকবে:</span> ${bnNum(keep, 0)}</small>` : ''}`, 'হ্যাঁ, সরান'))) return;
  await delMany('medicines', ids); await setSetting('bdImported', null); toast('ডাটাবেসের ওষুধ সরানো হয়েছে', 'ok'); render();
}
async function clearSample(all) {
  for (const s of ['sales', 'batches', 'customers', 'suppliers', 'deliveries', 'ledger', 'purchases']) for (const x of D[s].filter(x => x.sample)) await del(s, x.id);
  if (all) { for (const m of D.medicines.filter(m => m.sample)) await del('medicines', m.id); }
  await setSetting('hasSample', false); toast('নমুনা ডেটা মুছে ফেলা হয়েছে', 'ok'); render();
}
function userForm(role) {
  const ov = modal('নতুন ব্যবহারকারী', `<form id="uf"><label class="f"><span>নাম *</span><input class="in" name="name" required></label><label class="f"><span>ভূমিকা</span><select class="in" name="role"><option value="owner" ${role === 'owner' ? 'selected' : ''}>মালিক (সব কিছু)</option><option value="sales" ${role !== 'owner' ? 'selected' : ''}>বিক্রেতা (সীমিত)</option></select></label><label class="f"><span>পিন (৪-৬ সংখ্যা) *</span><input class="in" name="pin" inputmode="numeric" pattern="[0-9]{4,6}" required type="password"></label></form>`,
    `<button class="btn" data-c>বাতিল</button><button class="btn pri" data-s>সংরক্ষণ</button>`, 'sm');
  $('[data-c]', ov).onclick = ov.close;
  $('[data-s]', ov).onclick = async () => { const f = $('#uf', ov); if (!f.reportValidity()) return; const v = Object.fromEntries(new FormData(f).entries()); await put('users', { name: v.name, role: v.role, pin: hashPin(v.pin), pinLen: v.pin.length }); ov.close(); toast('ব্যবহারকারী যোগ হয়েছে', 'ok'); render(); };
}

/* ---------- কীবোর্ড শর্টকাট ---------- */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && modalStack.length) { modalStack[modalStack.length - 1].close(); e.preventDefault(); return; }
  if ($('.lock')) return;
  if (e.key === 'F2') { e.preventDefault(); if (route !== 'pos') go('pos'); else $('#q')?.focus(); }
  if (route !== 'pos' || modalStack.length) return;
  if (e.key === 'F9' || (e.ctrlKey && e.key === 'Enter')) { e.preventDefault(); completeSale(); }
  if (e.key === 'F4') { e.preventDefault(); setMode(POS.mode === 'retail' ? 'wholesale' : 'retail'); }
  if (e.key === 'F8') { e.preventDefault(); $('#disc')?.focus(); }
});
window.addEventListener('online', () => route && render()); window.addEventListener('offline', () => route && render());

/* ---------- শুরু ---------- */
async function init() {
  try {
    idb = await openDB(); await loadAll(); await seedIfEmpty();
    const BNm = (window.SEED || {}).BN || {}; const fixBn = D.medicines.filter(m => m.nameBn == null && BNm[m.brand]).map(m => ({ ...m, nameBn: BNm[m.brand] })); if (fixBn.length) await putMany('medicines', fixBn);
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    route = (location.hash || '#dash').slice(1); if (!NAV.some(n => n[0] === route)) route = 'dash';
    window.addEventListener('hashchange', () => { const r = location.hash.slice(1); if (r !== route && NAV.some(n => n[0] === r)) { route = r; render(); } });
    render();
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
    window.__app = { D, POS, go, bdImport, loadBdData, parseBdFile, medIdx, stockMap, completeSale, addToCart, checkInteractions, render, searchMeds, showReceipt, returnModal, balanceOf, stockOf, saleNet, bnSkel, latSkel };
  } catch (err) {
    console.error(err);
    $('#root').innerHTML = `<div style="padding:40px;font-family:sans-serif"><h2>সফটওয়্যার চালু করা যায়নি</h2><p>এই ব্রাউজারে ডেটাবেস (IndexedDB) খোলা যাচ্ছে না। Google Chrome বা Microsoft Edge-এর সাধারণ (Incognito নয়) উইন্ডোতে খুলুন।</p><pre>${esc(err && err.message)}</pre></div>`;
  }
}
init();
})();

'use strict';
/* ==========================================================================
   CORE — utilitas, penyimpanan lokal, api() tahan jaringan, SWR, dialog, toast
   Pola mengikuti gas-pro-api + gas-instant-ux-pro (fetch text/plain, reqId,
   timeout+retry, stale-while-revalidate, render hanya bila data berubah).
   ========================================================================== */
const CFG = window.APP_CONFIG || {};
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const rp = (n) => { n = Math.round(Number(n) || 0); return (n < 0 ? '-' : '') + 'Rp' + Math.abs(n).toLocaleString('id-ID'); };
const rpShort = (n) => { n = Number(n) || 0; const a = Math.abs(n); const s = a >= 1e9 ? (a / 1e9).toFixed(1).replace('.0', '') + ' M' : a >= 1e6 ? (a / 1e6).toFixed(1).replace('.0', '') + ' jt' : a >= 1e3 ? Math.round(a / 1e3) + ' rb' : String(a); return (n < 0 ? '-' : '') + 'Rp' + s; };
const bulanLabel = (p) => (p ? BULAN[Number(p.slice(5, 7)) - 1] + ' ' + p.slice(0, 4) : '');
const fmtDate = (s) => { if (!s) return '-'; const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}:\d{2}))?/); if (!m) return String(s); return Number(m[3]) + ' ' + BULAN[Number(m[2]) - 1].slice(0, 3) + ' ' + m[1] + (m[4] ? ', ' + m[4] : ''); };
const initials = (n) => String(n || '?').replace(/^(ns|ners)\.?\s+/i, '').split(/[\s,]+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
const todayStr = () => { const d = new Date(Date.now() + 7 * 3600e3); return d.toISOString().slice(0, 10); };
const periodeNow = () => todayStr().slice(0, 7);
const shiftPeriode = (p, n) => { let y = +p.slice(0, 4), m = +p.slice(5, 7) + n; while (m < 1) { m += 12; y--; } while (m > 12) { m -= 12; y++; } return y + '-' + String(m).padStart(2, '0'); };
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const AppState = { token: '', user: null, boot: null, tahun: new Date().getFullYear(), tables: {} };
const isAdmin = () => AppState.user && AppState.user.peran === 'Admin';

/* ---------- Penyimpanan lokal (aman bila diblokir) ---------- */
const LS_PREFIX = 'siminuran:v1:';
const Store = {
  get(k, d) { try { const v = localStorage.getItem(LS_PREFIX + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(LS_PREFIX + k, JSON.stringify(v)); } catch (e) { try { Object.keys(localStorage).filter((x) => x.indexOf(LS_PREFIX + 'u:') === 0).forEach((x) => localStorage.removeItem(x)); } catch (e2) { /* abaikan */ } } },
  del(k) { try { localStorage.removeItem(LS_PREFIX + k); } catch (e) { /* abaikan */ } },
  clearUser() { try { Object.keys(localStorage).filter((x) => x.indexOf(LS_PREFIX) === 0).forEach((x) => localStorage.removeItem(x)); } catch (e) { /* abaikan */ } }
};
const userKey = (k) => 'u:' + (AppState.user ? AppState.user.email : 'anon') + ':' + k;
const hashStr = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h + ':' + s.length; };

/* ---------- Pengukur performa ---------- */
const Perf = {
  rows: [],
  add(action, total, server) { this.rows.push({ action, total, server: server == null ? null : server, net: server == null ? null : total - server }); if (this.rows.length > 200) this.rows.shift(); },
  table() { console.table(this.rows.slice(-30)); }
};

/* ---------- Indikator loading global ---------- */
let _loads = 0;
function topLoad(on) {
  _loads = Math.max(0, _loads + (on ? 1 : -1));
  const el = $('#topload');
  if (el) el.hidden = _loads === 0;
}

/* ---------- API ---------- */
const READ_ACTIONS = /^(bootstrap|dashboard|anggotaList|tabunganList|tabunganDetail|pencairanPreview|iuranList|iuranImportPreview|posList|expenseList|alokasiPreview|laporan|userList|logs|batch)$/;
async function apiOnce(action, data, timeout, reqId) {
  const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), timeout), t0 = performance.now();
  try {
    const res = await fetch(CFG.GAS_URL, {
      method: 'POST', redirect: 'follow', cache: 'no-store', signal: ctrl.signal,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },   // hindari CORS preflight
      body: JSON.stringify({ action, token: AppState.token || '', reqId, data: data || {} })
    });
    const text = await res.text();
    try { const j = JSON.parse(text); Perf.add(action, Math.round(performance.now() - t0), j.ms); return j; }
    catch (e) { return { success: false, network: true, retryable: res.status >= 500 || res.status === 429 || res.status === 200, message: 'Server membalas bukan JSON (HTTP ' + res.status + '). Pastikan URL /exec benar dan akses "Anyone".' }; }
  } catch (err) {
    return { success: false, network: true, retryable: true, message: err.name === 'AbortError' ? 'Server terlalu lama merespons.' : 'Koneksi terputus.' };
  } finally { clearTimeout(timer); }
}
function waitOnline(ms) {
  return new Promise((r) => {
    if (navigator.onLine !== false) return r();
    const t = setTimeout(done, ms);
    function done() { clearTimeout(t); removeEventListener('online', done); r(); }
    addEventListener('online', done);
  });
}
const _inflight = {};
let _writeEpoch = 0;
async function api(action, data, opt) {
  opt = opt || {};
  const isRead = READ_ACTIONS.test(action);
  if (!isRead) _writeEpoch++;
  const key = isRead ? _writeEpoch + '|' + action + '|' + JSON.stringify(data || {}) : '';
  if (isRead && _inflight[key]) return _inflight[key];           // dedupe baca identik
  const run = async () => {
    const reqId = isRead ? '' : (opt.reqId || (crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random()));
    const tries = isRead ? 3 : 2;
    let res;
    topLoad(true);
    try {
      for (let i = 0; i < tries; i++) {
        if (i) { await sleep(1200 * i); if (navigator.onLine === false) await waitOnline(15000); }
        res = await apiOnce(action, data, isRead ? (i ? 40000 : 25000) : 90000, reqId);
        if (res.success || !res.retryable) break;
      }
    } finally { topLoad(false); }
    if (!res.success && res.code === 'AUTH' && action !== 'login') onSessionExpired();
    return res;
  };
  if (!isRead) return run();
  const p = run();
  _inflight[key] = p;
  p.then(() => delete _inflight[key], () => delete _inflight[key]);
  return p;
}

/** Stale-while-revalidate: tampilkan cache dulu, segarkan di latar; render ulang hanya bila data berubah. */
async function swr(key, action, payload, render, opt) {
  opt = opt || {};
  const fresh = opt.fresh == null ? 30000 : opt.fresh;
  const c = Store.get(userKey(key), null);
  if (c) render(c.data, true);
  if (c && !opt.force && Date.now() - c.t < fresh) return { success: true, data: c.data, cached: true };
  const res = await api(action, payload);
  if (res.success) {
    const h = hashStr(JSON.stringify(res.data));
    Store.set(userKey(key), { t: Date.now(), h, data: res.data });
    if (!c || c.h !== h) render(res.data, false);
  } else if (!c && opt.onError) opt.onError(res);
  else if (c && !res.code) toast('Menampilkan data tersimpan — ' + res.message, 'error');
  return res;
}
function invalidateCache(prefixes) {
  try {
    const base = LS_PREFIX + userKey('');
    Object.keys(localStorage).forEach((k) => { if (k.indexOf(base) === 0 && (!prefixes || prefixes.some((p) => k.indexOf(base + p) === 0))) localStorage.removeItem(k); });
  } catch (e) { /* abaikan */ }
}
function warmUpServer() { try { fetch(CFG.GAS_URL + '?w=1&t=' + Date.now(), { mode: 'no-cors', cache: 'no-store' }).catch(() => {}); } catch (e) { /* abaikan */ } }

/* ---------- Toast ---------- */
function toast(msg, type) {
  let box = $('#toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.className = 'toasts'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
  const el = document.createElement('div');
  el.className = 'toast ' + (type === 'error' ? 'error' : 'ok');
  el.innerHTML = ic(type === 'error' ? 'alert-circle' : 'check-circle') + '<span>' + esc(msg) + '</span>';
  box.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }, type === 'error' ? 5000 : 2800);
}

/* ---------- Dialog / bottom sheet ---------- */
let _dlgStack = [];
function openDialog(o) {
  const ov = document.createElement('div');
  ov.className = 'overlay';
  const id = 'dlg' + Date.now();
  ov.innerHTML = '<div class="dialog' + (o.wide ? ' wide' : '') + '" role="dialog" aria-modal="true" aria-labelledby="' + id + '">' +
    '<div class="dialog-head"><div class="grow">' + (o.badge ? '<div class="mt8" style="margin:0 0 6px">' + o.badge + '</div>' : '') + '<h2 class="h-md" id="' + id + '">' + esc(o.title || '') + '</h2>' + (o.sub ? '<p class="muted small mt8" style="margin-top:4px">' + o.sub + '</p>' : '') + '</div>' +
    '<button class="btn ghost icon" data-act="close" aria-label="Tutup">' + ic('x') + '</button></div>' +
    '<div class="dialog-body"></div>' + (o.footer ? '<div class="dialog-foot' + (o.footRow ? ' row2' : '') + '">' + o.footer + '</div>' : '') + '</div>';
  document.body.appendChild(ov);
  document.body.style.overflow = 'hidden';
  const dlg = ov.querySelector('.dialog'), body = ov.querySelector('.dialog-body');
  body.innerHTML = o.body || '';
  const prevFocus = document.activeElement;
  const ctrl = {
    el: ov, dlg, body, closed: false,
    $: (s) => $(s, ov), $$: (s) => $$(s, ov),
    close(result) {
      if (ctrl.closed) return; ctrl.closed = true;
      ov.remove(); _dlgStack = _dlgStack.filter((x) => x !== ctrl);
      if (!_dlgStack.length) document.body.style.overflow = '';
      if (prevFocus && prevFocus.focus) try { prevFocus.focus(); } catch (e) { /* abaikan */ }
      if (o.onClose) o.onClose(result);
    },
    setBody(html) { body.innerHTML = html; },
    setFooter(html) { let f = ov.querySelector('.dialog-foot'); if (!f) { f = document.createElement('div'); f.className = 'dialog-foot'; dlg.appendChild(f); } f.innerHTML = html; }
  };
  ov.addEventListener('mousedown', (e) => { if (e.target === ov && !o.sticky) ctrl.close(); });
  ov.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || !ov.contains(b)) return;
    const act = b.dataset.act;
    if (act === 'close') return ctrl.close();
    const fn = (o.actions || {})[act];
    if (!fn || b.disabled) return;
    const orig = b.innerHTML;
    b.disabled = true; b.innerHTML = '<span class="spin"></span>';
    try { await fn(e, ctrl, b); } finally { if (!ctrl.closed) { b.disabled = false; b.innerHTML = orig; } }
  });
  _dlgStack.push(ctrl);
  if (o.onMount) o.onMount(ctrl);
  const first = ov.querySelector('input:not([type=hidden]):not([type=file]),select,textarea');
  if (first && !o.noFocus && window.innerWidth > 700) first.focus(); else dlg.setAttribute('tabindex', '-1');
  return ctrl;
}
addEventListener('keydown', (e) => { if (e.key === 'Escape' && _dlgStack.length) _dlgStack[_dlgStack.length - 1].close(); });

function confirmDlg(message, o) {
  o = o || {};
  return new Promise((resolve) => {
    let done = false;
    const c = openDialog({
      title: o.title || 'Konfirmasi', body: '<p style="font-size:15px;line-height:22px">' + message + '</p>', noFocus: true,
      footer: '<button class="btn soft" data-act="no">Batal</button><button class="btn ' + (o.danger ? 'danger' : 'dark') + '" data-act="yes">' + esc(o.okText || 'Ya, lanjutkan') + '</button>', footRow: true,
      actions: { yes: () => { done = true; resolve(true); c.close(); }, no: () => c.close() },
      onClose: () => { if (!done) resolve(false); }
    });
  });
}

/* ---------- Form helpers ---------- */
function formVals(root) {
  const o = {};
  $$('[name]', root).forEach((el) => {
    if (el.type === 'radio') { if (el.checked) o[el.name] = el.value; }
    else if (el.type === 'checkbox') o[el.name] = el.checked;
    else if (el.dataset.rupiah != null) o[el.name] = parseRupiah(el.value);
    else o[el.name] = el.value.trim();
  });
  return o;
}
const parseRupiah = (s) => { const t = String(s || '').replace(/[^\d-]/g, ''); return t ? Number(t) : 0; };
function bindRupiah(root) {
  $$('[data-rupiah]', root).forEach((el) => {
    const fmt = () => { const neg = /^\s*-/.test(el.value); const n = String(el.value).replace(/\D/g, ''); el.value = n ? (neg ? '-' : '') + Number(n).toLocaleString('id-ID') : (neg ? '-' : ''); };
    el.addEventListener('input', fmt); if (el.value) fmt();
  });
}
function fieldErr(el, msg) {
  el.setAttribute('aria-invalid', 'true');
  let e = el.parentElement.querySelector('.err-text');
  if (!e) { e = document.createElement('div'); e.className = 'err-text'; el.parentElement.appendChild(e); }
  e.textContent = msg; el.focus();
  el.addEventListener('input', () => { el.removeAttribute('aria-invalid'); if (e) e.remove(); }, { once: true });
}

/* ---------- Berkas ---------- */
const toBase64 = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(file); });
async function prepFile(file) {
  if (file.type === 'application/pdf') return { name: file.name, mime: file.type, base64: await toBase64(file) };
  if (!/^image\//.test(file.type)) throw new Error('Hanya foto atau PDF yang diizinkan.');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const sc = Math.min(1, 1600 / Math.max(img.width, img.height));
    const cv = document.createElement('canvas'); cv.width = Math.round(img.width * sc); cv.height = Math.round(img.height * sc);
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    return { name: file.name.replace(/\.\w+$/, '') + '.jpg', mime: 'image/jpeg', base64: cv.toDataURL('image/jpeg', 0.82).split(',')[1] };
  } finally { URL.revokeObjectURL(url); }
}
async function uploadBukti(file) {
  const f = await prepFile(file);
  const res = await api('uploadBukti', f);
  if (!res.success) throw new Error(res.message);
  return res.data.url;
}
function readTextFile(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsText(file); }); }

function downloadCSV(filename, headers, rows) {
  const q = (v) => { const s = String(v == null ? '' : v); return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const csv = 'sep=;\r\n' + [headers].concat(rows).map((r) => r.map(q).join(';')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

/* ---------- WhatsApp ---------- */
const fillTpl = (tpl, v) => String(tpl || '').replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? v[k] : m));
const waLink = (wa, text) => 'https://wa.me/' + String(wa || '').replace(/\D/g, '') + '?text=' + encodeURIComponent(text);

/* ---------- Komponen kecil ---------- */
const statusBadge = (s) => ({ 'Berhasil': '<span class="badge ok">Berhasil</span>', 'Gagal': '<span class="badge bad">Gagal</span>', 'Lunas Manual': '<span class="badge info">Lunas Manual</span>', 'Pending': '<span class="badge mute">Pending</span>' }[s] || '<span class="badge mute">' + esc(s) + '</span>');
const emptyState = (icon, text) => '<div class="empty">' + ic(icon) + '<div>' + text + '</div></div>';
const skeleton = (n) => Array.from({ length: n || 3 }, () => '<div class="skel sk-card" style="margin-bottom:12px"></div>').join('');
function retryBox(msg, act) { return '<div class="retry card">' + ic('alert-circle', 'ic-lg neg') + '<p class="mt8">' + esc(msg) + '</p><button class="btn dark mt16" data-act="' + act + '">' + ic('refresh') + 'Coba lagi</button></div>'; }
function yearOptions(sel, back, fwd) {
  const t = (AppState.boot && AppState.boot.tahun) || new Date().getFullYear(); let o = '';
  for (let y = t + (fwd == null ? 1 : fwd); y >= t - (back == null ? 4 : back); y--) o += '<option value="' + y + '"' + (y === Number(sel) ? ' selected' : '') + '>' + y + '</option>';
  return o;
}
function pager(shown, total, act) { return shown < total ? '<div style="text-align:center;margin-top:12px"><button class="btn soft" data-act="' + act + '">Muat lebih banyak (' + (total - shown) + ' lagi)</button></div>' : ''; }

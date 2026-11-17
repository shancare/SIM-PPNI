'use strict';
/* ==========================================================================
   ROUTER SPA berbasis hash (#/halaman). Setiap halaman dibuat sekali lalu
   disembunyikan/ditampilkan — DOM & state tidak dibuang saat berpindah menu.
   ========================================================================== */
const Pages = {};
const NAV = [
  { name: 'dashboard', label: 'Dashboard', short: 'Beranda', icon: 'dashboard' },
  { name: 'iuran', label: 'Iuran & Auto Debit', short: 'Iuran', icon: 'wallet' },
  { name: 'anggota', label: 'Data Anggota & Tabungan', short: 'Anggota', icon: 'users' },
  { name: 'pos', label: 'Pos Anggaran & Alokasi', short: 'Pos Anggaran', icon: 'pie' },
  { name: 'laporan', label: 'Laporan & Rekap', short: 'Laporan', icon: 'book' },
  { name: 'pengaturan', label: 'Pengaturan', short: 'Pengaturan', icon: 'sliders', admin: true }
];
function registerPage(name, def) { Pages[name] = def; }
function go(name, param) {
  const h = '#/' + name + (param ? '/' + encodeURIComponent(param) : '');
  if (location.hash === h) route(); else location.hash = h;
}
function route() {
  const view = $('#view');
  if (!view || !AppState.user) return;
  const parts = location.hash.replace(/^#\/?/, '').split('/');
  let name = parts[0] || 'dashboard';
  const nav = NAV.find((n) => n.name === name);
  if (!nav || (nav.admin && !isAdmin())) name = 'dashboard';
  const def = Pages[name];
  let el = view.querySelector('.page[data-page="' + name + '"]');
  if (!el) {
    el = document.createElement('section');
    el.className = 'page'; el.dataset.page = name;
    el.innerHTML = def.template();
    view.appendChild(el);
    if (def.init) def.init(el);
  }
  $$('.page', view).forEach((p) => { p.hidden = p !== el; p.classList.toggle('printing', p === el); });
  $$('[data-nav]').forEach((a) => { if (a.dataset.nav === name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  document.title = NAV.find((n) => n.name === name).label + ' — SIM-IURAN PPNI';
  window.scrollTo(0, 0);
  def.show && def.show(el, parts[1] && decodeURIComponent(parts[1]));
}
addEventListener('hashchange', route);

/** Panggil render ulang halaman yang sudah dibuat (setelah data berubah). */
function refreshPage(name, opt) {
  const el = $('#view .page[data-page="' + name + '"]');
  if (el && Pages[name].show) Pages[name].show(el, null, Object.assign({ force: true }, opt || {}));
}
/** Setelah aksi tulis: buang cache lokal data & segarkan halaman yang sudah terbuka. */
function dataChanged(pages) {
  invalidateCache(['dash', 'iur', 'ang', 'tab', 'pos', 'exp', 'lap', 'boot']);
  (pages || ['dashboard']).forEach((p) => refreshPage(p));
}

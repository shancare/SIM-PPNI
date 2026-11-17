'use strict';
/* ==========================================================================
   APP — login Google, cangkang (sidebar/topbar/bottom-nav), sesi
   ========================================================================== */
const appEl = () => $('#app');

function loadBoot(boot) {
  AppState.boot = boot;
  AppState.tahun = boot.tahun;
  Store.set(userKey('boot'), { t: Date.now(), data: boot });
}

/* ---------- Login ---------- */
function showLogin(msg) {
  AppState.token = ''; AppState.user = null;
  appEl().innerHTML = '<div class="login"><div class="login-card">' +
    '<div class="brand-mark">' + LOGO_SVG_WHITE + '</div>' +
    '<h1 class="h-md" style="font-size:22px">SIM-IURAN PPNI</h1>' +
    '<p class="muted mt8">DPK PPNI RSUD Prof. Dr. Soekandar<br>Sistem Informasi Iuran Anggota</p>' +
    '<div class="gbtn" id="gbtn"><div class="skel" style="width:260px;height:44px"></div></div>' +
    '<div id="login-msg" role="alert" class="' + (msg ? 'banner-warn' : '') + '" style="text-align:left;margin-top:12px;font-size:13px">' + esc(msg || '') + '</div>' +
    '<p class="small muted mt16">Hanya akun Google yang terdaftar sebagai pengurus yang dapat masuk.</p></div></div>';
  if (!CFG.GOOGLE_CLIENT_ID || /GANTI/.test(CFG.GOOGLE_CLIENT_ID)) {
    $('#gbtn').innerHTML = '';
    $('#login-msg').className = 'banner-amber';
    $('#login-msg').innerHTML = '<b>Konfigurasi belum lengkap.</b> Isi <code>GOOGLE_CLIENT_ID</code> dan <code>GAS_URL</code> di file <code>js/config.js</code>.';
    return;
  }
  const mount = () => {
    if (!window.google || !google.accounts) return false;
    google.accounts.id.initialize({ client_id: CFG.GOOGLE_CLIENT_ID, callback: onCredential, auto_select: false, cancel_on_tap_outside: true });
    $('#gbtn').innerHTML = '';
    google.accounts.id.renderButton($('#gbtn'), { theme: 'filled_blue', size: 'large', text: 'signin_with', shape: 'pill', locale: 'id', width: 280 });
    return true;
  };
  if (!mount()) {
    if (!document.getElementById('gsi')) {
      const s = document.createElement('script'); s.id = 'gsi'; s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.defer = true; document.head.appendChild(s);
    }
    let n = 0; const t = setInterval(() => { if (mount() || ++n > 50) { clearInterval(t); if (n > 50) { $('#gbtn').innerHTML = '<p class="muted small">Tidak dapat memuat Google Sign-In. Periksa koneksi internet Anda.</p>'; } } }, 200);
  }
  warmUpServer();
}

async function onCredential(resp) {
  const box = $('#login-msg');
  if (box) { box.className = 'banner-info'; box.textContent = 'Memeriksa akun…'; }
  const res = await api('login', { idToken: resp.credential });
  if (!res.success) { if (box) { box.className = 'banner-warn'; box.textContent = res.message; } return; }
  AppState.token = res.data.token; AppState.user = res.data.user;
  Store.set('session', { token: res.data.token, user: res.data.user });
  loadBoot(res.data.boot);
  buildShell();
}

function logout(msg) {
  try { if (window.google && google.accounts) google.accounts.id.disableAutoSelect(); } catch (e) { /* abaikan */ }
  Store.clearUser();
  showLogin(msg);
}
function onSessionExpired() { if (AppState.user) { toast('Sesi berakhir, silakan masuk kembali.', 'error'); logout('Sesi Anda berakhir. Silakan masuk kembali.'); } }

/* ---------- Cangkang ---------- */
function buildShell() {
  const u = AppState.user, b = AppState.boot;
  const items = NAV.filter((n) => !n.admin || isAdmin());
  const side = items.map((n) => '<a href="#/' + n.name + '" data-nav="' + n.name + '">' + ic(n.icon) + '<span>' + n.label + '</span></a>').join('');
  const bottom = NAV.slice(0, 5).map((n) => '<a href="#/' + n.name + '" data-nav="' + n.name + '">' + ic(n.icon) + '<span>' + n.short + '</span></a>').join('');
  appEl().innerHTML =
    '<div class="shell">' +
    '<aside class="sidebar"><div class="brand"><div class="brand-mark">' + LOGO_SVG + '</div><div><b>SIM-IURAN PPNI</b><span>RSUD PROF. DR. SOEKANDAR</span></div></div>' +
    '<nav aria-label="Menu utama">' + side + '</nav>' +
    '<div class="side-foot"><b>' + ic('shield', 'ic-sm') + 'DPK Terakreditasi</b>Basis data anggota resmi komisariat RSUD Soekandar.</div></aside>' +
    '<div class="content"><header class="topbar">' +
    '<div class="brand"><div class="brand-mark">' + LOGO_SVG + '</div><div><b id="org-name">' + esc(b.settings.NAMA_ORG) + '</b><span>SIM Pengelolaan Keuangan Iuran</span></div></div>' +
    '<span class="chip-year">' + ic('calendar', 'ic-sm') + 'Tahun Anggaran ' + b.tahun + '</span>' +
    '<label class="top-search">' + ic('search', 'ic-sm') + '<input id="gsearch" type="search" placeholder="Cari nama, NIRA, ruangan…" aria-label="Cari anggota"></label>' +
    '<div class="who"><b>' + esc(u.nama || u.email) + '</b><span>' + esc(u.peran) + '</span></div>' +
    '<button class="avatar" id="btn-user" aria-label="Menu akun">' + esc(initials(u.nama || u.email)) + '</button></header>' +
    '<main class="main" id="view" tabindex="-1"></main></div>' +
    '<nav class="bottomnav" aria-label="Menu utama">' + bottom + '</nav></div>';
  $('#btn-user').onclick = userMenu;
  $('#gsearch').addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.value.trim()) { AppState.pendingSearch = e.target.value.trim(); e.target.value = ''; if (location.hash === '#/anggota') route(); else go('anggota'); } });
  if (!location.hash || location.hash === '#') location.hash = '#/dashboard'; else route();
  warmUpServer();
}

function userMenu() {
  const u = AppState.user;
  const d = openDialog({
    title: u.nama || u.email, sub: esc(u.email) + ' · <b>' + esc(u.peran) + '</b>', noFocus: true,
    body: '<div class="stack">' + (isAdmin() ? '<button class="btn soft block" data-act="set">' + ic('sliders') + 'Pengaturan, pengguna & log</button>' : '') +
      '<button class="btn soft block" data-act="seg">' + ic('refresh') + 'Segarkan semua data</button>' +
      '<button class="btn danger block" data-act="out">' + ic('logout') + 'Keluar</button>' +
      '<p class="small muted" style="text-align:center">Versi aplikasi 1.0</p></div>',
    actions: {
      set: () => { d.close(); go('pengaturan'); },
      seg: async () => { invalidateCache(); const r = await api('bootstrap'); if (r.success) { loadBoot(r.data); } d.close(); route(); $$('#view .page').forEach((p) => { const nm = p.dataset.page; if (!p.hidden && Pages[nm].show) Pages[nm].show(p, null, { force: true }); }); toast('Data disegarkan.'); },
      out: () => { d.close(); logout(); }
    }
  });
}

/* ---------- Mulai ---------- */
async function init() {
  const ses = Store.get('session', null);
  if (!ses || !ses.token) return showLogin();
  AppState.token = ses.token; AppState.user = ses.user;
  const cached = Store.get(userKey('boot'), null);
  if (cached) { AppState.boot = cached.data; AppState.tahun = cached.data.tahun; buildShell(); }
  const res = await api('bootstrap');
  if (res.success) {
    const first = !cached;
    loadBoot(res.data);
    AppState.user = res.data.user; Store.set('session', { token: AppState.token, user: res.data.user });
    if (first) buildShell();
    else { $('#org-name') && ($('#org-name').textContent = res.data.settings.NAMA_ORG); const p = $('#view .page:not([hidden])'); if (p && Pages[p.dataset.page].show) Pages[p.dataset.page].show(p, null, { boot: true }); }
  } else if (res.code === 'AUTH') { /* onSessionExpired sudah dipanggil */ }
  else if (!cached) {
    appEl().innerHTML = '<div class="login"><div class="login-card"><h1 class="h-md">Tidak dapat terhubung</h1><p class="muted mt8">' + esc(res.message) + '</p><button class="btn dark mt16 block" onclick="location.reload()">Coba lagi</button><button class="btn soft mt8 block" onclick="logout()">Keluar</button></div></div>';
  }
}
document.addEventListener('DOMContentLoaded', init);

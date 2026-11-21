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

/* ---------- Lockup logo: [RSUD][PPNI] + teks ---------- */
function brandLogos() { return '<div class="logos"><img src="img/logo-rsud.png" alt="" width="40" height="40"><img src="img/logo-ppni.png" alt="Logo PPNI" width="40" height="40"></div>'; }
function brandLockup() { return '<div class="lockup">' + brandLogos() + '<div class="lk-txt"><small>Dewan Pengurus Komisariat (DPK) PPNI</small><strong>RSUD SOEKANDAR</strong></div></div>'; }

/* ---------- Login (username + sandi) ---------- */
function showLogin(msg) {
  AppState.token = ''; AppState.user = null;
  appEl().innerHTML = '<div class="login"><form class="login-card" id="login-form" novalidate>' +
    '<div class="lockup lk-login">' + brandLogos() + '<div class="lk-txt"><small>Dewan Pengurus Komisariat (DPK) PPNI</small><strong>RSUD SOEKANDAR</strong></div></div>' +
    '<h1 class="h-md" style="font-size:20px;margin-top:20px">SIM-IURAN PPNI</h1>' +
    '<p class="muted mt8">Sistem Informasi Iuran Anggota</p>' +
    '<div class="field mt16" style="text-align:left"><label for="lg-user">Username</label><input class="input" id="lg-user" name="username" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" required></div>' +
    '<div class="field" style="text-align:left"><label for="lg-pass">Sandi</label><div class="pw-wrap"><input class="input" id="lg-pass" name="password" type="password" autocomplete="current-password" required><button type="button" class="btn ghost icon pw-eye" id="lg-eye" aria-label="Tampilkan sandi">' + ic('eye', 'ic-sm') + '</button></div></div>' +
    '<button class="btn dark block" id="lg-btn" type="submit">Masuk</button>' +
    '<div id="login-msg" role="alert" class="' + (msg ? 'banner-warn' : '') + '" style="text-align:left;margin-top:12px;font-size:13px">' + esc(msg || '') + '</div>' +
    '<p class="small muted mt16">Hanya pengurus yang terdaftar yang dapat masuk. Lupa sandi? Hubungi Admin/Ketua.</p></form></div>';
  if (!CFG.GAS_URL || /GANTI/.test(CFG.GAS_URL)) {
    $('#login-msg').className = 'banner-amber';
    $('#login-msg').innerHTML = '<b>Konfigurasi belum lengkap.</b> Isi <code>GAS_URL</code> di file <code>js/config.js</code>.';
  }
  $('#lg-eye').onclick = () => { const i = $('#lg-pass'); i.type = i.type === 'password' ? 'text' : 'password'; };
  $('#login-form').addEventListener('submit', onLoginSubmit);
  $('#lg-user').focus();
  warmUpServer();
}

async function onLoginSubmit(e) {
  e.preventDefault();
  const box = $('#login-msg'), btn = $('#lg-btn'), username = $('#lg-user').value.trim(), password = $('#lg-pass').value;
  if (!username || !password) { box.className = 'banner-warn'; box.textContent = 'Isi username dan sandi.'; return; }
  btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Memeriksa…'; box.className = ''; box.textContent = '';
  const res = await api('login', { username, password });
  if (!res.success) { btn.disabled = false; btn.textContent = 'Masuk'; box.className = 'banner-warn'; box.textContent = res.message; $('#lg-pass').select(); return; }
  AppState.token = res.data.token; AppState.user = res.data.user;
  Store.set('session', { token: res.data.token, user: res.data.user });
  loadBoot(res.data.boot);
  buildShell();
}

function logout(msg) {
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
    '<aside class="sidebar"><div class="brand side-brand">' + brandLockup() + '</div>' +
    '<nav aria-label="Menu utama">' + side + '</nav>' +
    '<div class="side-foot"><b>' + ic('shield', 'ic-sm') + 'DPK Terakreditasi</b>Basis data anggota resmi komisariat RSUD Soekandar.</div></aside>' +
    '<div class="content"><header class="topbar">' +
    '<div class="brand">' + brandLockup().replace('class="lockup"', 'class="lockup lk-top"') + '<div class="top-title"><b id="org-name">' + esc(b.settings.NAMA_ORG) + '</b><span>SIM Pengelolaan Keuangan Iuran</span></div></div>' +
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
      '<button class="btn soft block" data-act="pw">' + ic('shield') + 'Ganti sandi</button>' +
      '<button class="btn soft block" data-act="seg">' + ic('refresh') + 'Segarkan semua data</button>' +
      '<button class="btn danger block" data-act="out">' + ic('logout') + 'Keluar</button>' +
      '<p class="small muted" style="text-align:center">Versi aplikasi 1.0</p></div>',
    actions: {
      set: () => { d.close(); go('pengaturan'); },
      seg: async () => { invalidateCache(); const r = await api('bootstrap'); if (r.success) { loadBoot(r.data); } d.close(); route(); $$('#view .page').forEach((p) => { const nm = p.dataset.page; if (!p.hidden && Pages[nm].show) Pages[nm].show(p, null, { force: true }); }); toast('Data disegarkan.'); },
      pw: () => { d.close(); passwordDialog(); },
      out: () => { d.close(); logout(); }
    }
  });
}

function passwordDialog() {
  const d = openDialog({
    title: 'Ganti Sandi', sub: 'Setelah diganti, Anda perlu masuk kembali di semua perangkat.',
    body: '<div class="field"><label for="pw-old">Sandi saat ini</label><input class="input" id="pw-old" name="lama" type="password" autocomplete="current-password"></div>' +
      '<div class="field"><label for="pw-new">Sandi baru (min. 8 karakter)</label><input class="input" id="pw-new" name="baru" type="password" autocomplete="new-password"></div>' +
      '<div class="field"><label for="pw-new2">Ulangi sandi baru</label><input class="input" id="pw-new2" type="password" autocomplete="new-password"></div>',
    footer: '<button class="btn soft" data-act="close">Batal</button><button class="btn dark" data-act="save">Simpan</button>', footRow: true,
    actions: {
      save: async (e, c) => {
        const v = formVals(c.body);
        if (!v.lama) return fieldErr($('#pw-old', c.el), 'Isi sandi saat ini.');
        if ((v.baru || '').length < 8) return fieldErr($('#pw-new', c.el), 'Minimal 8 karakter.');
        if (v.baru !== $('#pw-new2', c.el).value) return fieldErr($('#pw-new2', c.el), 'Pengulangan tidak sama.');
        const r = await api('gantiSandi', { lama: v.lama, baru: v.baru });
        if (!r.success) return toast(r.message, 'error');
        c.close();
        const lg = await api('login', { username: AppState.user.email, password: v.baru });
        if (lg.success) { AppState.token = lg.data.token; Store.set('session', { token: lg.data.token, user: lg.data.user }); loadBoot(lg.data.boot); toast('Sandi diganti.'); }
        else logout('Sandi diganti. Silakan masuk kembali.');
      }
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

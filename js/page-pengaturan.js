'use strict';
/* ===== PENGATURAN (khusus Admin): pengaturan umum, pengguna, log ===== */
const PG = { users: null, logs: null };

function userDialog(u) {
  u = u || null;
  const d = openDialog({
    title: u ? 'Ubah Pengguna' : 'Tambah Pengguna', sub: u ? 'Kosongkan sandi bila tidak ingin mengubahnya.' : 'Berikan username dan sandi awal kepada pengurus.',
    body: '<div class="field"><label for="u-em">Username *</label><input class="input" id="u-em" name="username" autocomplete="off" autocapitalize="none" value="' + esc(u ? u.email : '') + '"' + (u ? ' readonly' : '') + ' placeholder="mis. bendahara"><div class="hint">Huruf kecil, angka, titik, strip atau garis bawah (3-60 karakter).</div></div>' +
      '<div class="field"><label for="u-pw">' + (u ? 'Sandi baru (opsional)' : 'Sandi awal *') + '</label><input class="input" id="u-pw" name="password" type="text" autocomplete="off" placeholder="minimal 8 karakter"><div class="hint">Disimpan terenkripsi (hash); tidak dapat dilihat kembali.</div></div>' +
      '<div class="field"><label for="u-nm">Nama *</label><input class="input" id="u-nm" name="nama" maxlength="80" value="' + esc(u ? u.nama : '') + '"></div>' +
      '<div class="grid g2" style="gap:12px"><div class="field"><label for="u-pr">Peran</label><select class="input" id="u-pr" name="peran"><option>Pengurus</option><option' + (u && u.peran === 'Admin' ? ' selected' : '') + '>Admin</option></select></div>' +
      '<div class="field"><label for="u-st">Status</label><select class="input" id="u-st" name="status"><option>Aktif</option><option' + (u && u.status === 'Nonaktif' ? ' selected' : '') + '>Nonaktif</option></select></div></div>' +
      '<p class="small muted">Admin dapat mengubah pengaturan, pos, alokasi dan pencairan. Pengurus dapat mengelola iuran, anggota, dan mencatat pengeluaran.</p>',
    footer: '<button class="btn soft" data-act="close">Batal</button><button class="btn dark" data-act="save">' + ic('check-circle') + 'Simpan</button>', footRow: true,
    actions: {
      save: async (e, c) => {
        const v = formVals(c.body);
        v.username = (v.username || '').trim().toLowerCase();
        if (!/^[a-z0-9._@-]{3,60}$/.test(v.username)) return fieldErr($('#u-em', c.el), 'Username 3-60 karakter: huruf kecil, angka, . - _');
        if ((!u && !v.password) || (v.password && v.password.length < 8)) return fieldErr($('#u-pw', c.el), 'Sandi minimal 8 karakter.');
        if (!(v.nama || '').trim()) return fieldErr($('#u-nm', c.el), 'Nama wajib diisi.');
        const r = await api('userSave', v); if (!r.success) return toast(r.message, 'error');
        toast('Pengguna disimpan.'); c.close(); PG.users = null; Store.del(userKey('users')); Pages.pengaturan.show($('.page[data-page="pengaturan"]'), null, { force: true });
      }
    }
  });
}

function renderUsers(el) {
  const us = PG.users || [];
  $('#pg-users', el).innerHTML = us.length ? us.map((u) => '<div class="mrow ' + (u.status === 'Aktif' ? 'st-ok' : 'st-pending') + '"><div class="row-between"><div class="grow"><div class="name">' + esc(u.nama || u.email) + '</div><div class="sub">' + esc(u.email) + '</div><div style="margin-top:6px"><span class="badge ' + (u.peran === 'Admin' ? 'info' : 'mute') + '">' + esc(u.peran) + '</span> <span class="badge ' + (u.status === 'Aktif' ? 'ok' : 'mute') + '">' + esc(u.status) + '</span></div></div><button class="btn ghost icon" data-act="edituser" data-em="' + esc(u.email) + '" aria-label="Ubah ' + esc(u.nama || u.email) + '">' + ic('edit', 'ic-sm') + '</button></div></div>').join('') : emptyState('users', 'Belum ada pengguna.');
}
function renderLogs(el) {
  const ls = PG.logs || [];
  $('#pg-logs', el).innerHTML = ls.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Waktu</th><th>Pengguna</th><th>Aksi</th><th>Detail</th></tr></thead><tbody>' + ls.slice(0, 60).map((l) => '<tr><td class="num" style="white-space:nowrap">' + fmtDate(l.waktu) + '</td><td>' + esc(l.email) + '</td><td><span class="badge info">' + esc((typeof AKSI_LABEL !== 'undefined' && AKSI_LABEL[l.aksi]) || l.aksi) + '</span></td><td>' + esc(l.detail) + '</td></tr>').join('') + '</tbody></table></div>' : emptyState('clock', 'Belum ada aktivitas.');
}
function fillSettings(el) {
  const s = AppState.boot.settings;
  $$('#pg-form [name]', el).forEach((i) => { if (document.activeElement === i) return; i.value = i.name === 'NOMINAL_IURAN' ? Number(s[i.name] || 0).toLocaleString('id-ID') : (s[i.name] == null ? '' : s[i.name]); });
}

registerPage('pengaturan', {
  admin: true,
  template: () => '<div class="page-head"><div><h1 class="h-lg">Pengaturan</h1><p class="muted">Pengaturan umum, pengguna, dan log aktivitas</p></div></div>' +
    '<div class="split"><div class="stack">' +
    '<form class="card" id="pg-form" novalidate><h2 class="h-sm">' + ic('sliders', 'ic-sm') + ' Pengaturan Umum</h2>' +
    '<div class="field mt12"><label for="s-org">Nama organisasi</label><input class="input" id="s-org" name="NAMA_ORG" maxlength="120"></div>' +
    '<div class="grid g2" style="gap:12px"><div class="field"><label for="s-nom">Iuran per bulan (Rp)</label><input class="input" id="s-nom" name="NOMINAL_IURAN" data-rupiah inputmode="numeric"></div>' +
    '<div class="field"><label for="s-th">Tahun anggaran aktif</label><input class="input" id="s-th" name="TAHUN_AKTIF" inputmode="numeric" maxlength="4"></div></div>' +
    '<div class="grid g2" style="gap:12px"><div class="field"><label for="s-bk">Bank auto debit</label><input class="input" id="s-bk" name="BANK_NAMA" maxlength="60"></div>' +
    '<div class="field"><label for="s-tg">Tanggal auto debit</label><input class="input" id="s-tg" name="TGL_AUTODEBIT" inputmode="numeric" maxlength="2"></div></div>' +
    '<div class="field"><label for="s-bl">Pengeluaran melebihi saldo pos</label><select class="input" id="s-bl" name="BLOKIR_SALDO"><option value="tidak">Beri peringatan saja</option><option value="ya">Tolak (blokir)</option></select></div>' +
    '<div class="field"><label for="s-wa">Template pesan WhatsApp</label><textarea class="input" id="s-wa" name="TEMPLATE_WA" rows="5" maxlength="1000"></textarea><div class="hint">Variabel: {nama} {bulan} {nominal} {alasan}</div></div>' +
    '<button class="btn dark block" type="submit" data-act="savesettings">' + ic('check-circle') + 'Simpan Pengaturan</button></form>' +
    '<div class="card"><div class="row-between"><h2 class="h-sm">' + ic('clock', 'ic-sm') + ' Log Aktivitas</h2><button class="btn ghost icon" data-act="reloadlog" aria-label="Muat ulang log">' + ic('refresh', 'ic-sm') + '</button></div><div class="mt12" id="pg-logs">' + skeleton(1) + '</div></div></div>' +
    '<div class="stack"><div class="card"><div class="row-between"><h2 class="h-sm">' + ic('users', 'ic-sm') + ' Pengguna Aplikasi</h2><button class="btn soft" data-act="adduser">' + ic('user-plus', 'ic-sm') + 'Tambah</button></div><p class="small muted">Maksimal dipakai oleh pengurus; 260 anggota hanya berupa data.</p><div class="mt12" id="pg-users">' + skeleton(2) + '</div></div>' +
    '<button class="btn danger block" data-act="logout">' + ic('logout') + 'Keluar</button></div></div>',
  init(el) {
    bindRupiah(el);
    $('#pg-form', el).addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = formVals($('#pg-form', el)); v.NOMINAL_IURAN = String(parseRupiah(v.NOMINAL_IURAN));
      if (!(Number(v.NOMINAL_IURAN) > 0)) return fieldErr($('#s-nom', el), 'Nominal harus lebih dari 0.');
      if (!/^\d{4}$/.test(v.TAHUN_AKTIF || '')) return fieldErr($('#s-th', el), 'Isi tahun 4 digit.');
      const b = $('[data-act=savesettings]', el), orig = b.innerHTML; b.disabled = true; b.innerHTML = '<span class="spin"></span>';
      const r = await api('settingsSave', { settings: v });
      b.disabled = false; b.innerHTML = orig;
      if (!r.success) return toast(r.message, 'error');
      Object.assign(AppState.boot.settings, r.data.settings);
      const bt = await api('bootstrap'); if (bt.success) loadBoot(bt.data);
      invalidateCache(); const on = $('#org-name'); if (on) on.textContent = AppState.boot.settings.NAMA_ORG;
      toast('Pengaturan disimpan.'); fillSettings(el);
    });
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act;
      if (a === 'adduser') userDialog();
      else if (a === 'edituser') userDialog((PG.users || []).find((u) => u.email === b.dataset.em));
      else if (a === 'logout') logout();
      else if (a === 'reloadlog') this.loadLogs(el, true);
      else if (a === 'retry') this.show(el, null, { force: true });
    });
  },
  loadLogs(el, force) { swr('logs', 'logs', { limit: 80 }, (d) => { PG.logs = d; renderLogs(el); }, { force, fresh: 20000, onError: (r) => { $('#pg-logs', el).innerHTML = retryBox(r.message, 'retry'); } }); },
  show(el, _, opt) {
    opt = opt || {};
    if (!isAdmin()) { $('#view').innerHTML = '<div class="card">' + emptyState('lock', 'Halaman ini hanya untuk Admin.') + '</div>'; return; }
    fillSettings(el);
    swr('users', 'userList', {}, (d) => { PG.users = d; renderUsers(el); }, { force: opt.force, fresh: 20000, onError: (r) => { $('#pg-users', el).innerHTML = retryBox(r.message, 'retry'); } });
    this.loadLogs(el, opt.force);
  }
});

'use strict';
/* ===== POS ANGGARAN, ALOKASI TAHUNAN & PENGELUARAN ===== */
const POS = { tahun: null, summary: null, exp: null, filterPos: '', q: '', limit: 20 };

function posList() { return (POS.summary && POS.summary.pos) || AppState.boot.pos || []; }

function posCard(p) {
  const total = p.saldoAwal + p.alokasi, pct = total > 0 ? Math.min(100, (p.pengeluaran / total) * 100) : 0;
  if (p.jenis === 'Tabungan') {
    return '<article class="card pos-card tab"><div class="row-between"><span class="badge info">' + ic('lock', 'ic-sm') + 'Wajib & terkunci</span><span class="micro">Hak anggota</span></div><h3 class="h-sm">' + esc(p.nama) + '</h3><p class="small muted">' + esc(p.deskripsi || '') + '</p>' +
      '<div class="kv"><div><div class="l">Ditambah tahun ' + POS.tahun + '</div><div class="v">' + rp(p.alokasi) + '</div></div><div class="r"><div class="l">Dicairkan</div><div class="v">' + rp(p.pengeluaran) + '</div></div></div>' +
      '<div class="sisa row-between"><div><div class="micro">Total cadangan wajib</div><div class="cur" style="color:var(--primary)">' + rp(p.saldoKumulatif) + '</div></div><button class="btn soft icon" data-act="tabungan" aria-label="Lihat tabungan anggota">' + ic('piggy') + '</button></div></article>';
  }
  return '<article class="card pos-card"><div class="row-between"><span class="badge info">Pos ' + String(p.urutan).padStart(2, '0') + '</span>' + (p.aktif ? '' : '<span class="badge mute">Nonaktif</span>') + '</div><h3 class="h-sm">' + esc(p.nama) + '</h3><p class="small muted">' + esc(p.deskripsi || '') + '</p>' +
    '<div class="kv"><div><div class="l">Saldo awal</div><div class="v">' + rp(p.saldoAwal) + '</div></div><div class="r"><div class="l">Alokasi masuk</div><div class="v">' + rp(p.alokasi) + '</div></div><div><div class="l">Terpakai</div><div class="v neg">' + rp(p.pengeluaran) + '</div></div><div class="r"><div class="l">' + Math.round(pct) + '% dari dana</div></div></div>' +
    '<div class="progress ' + (pct > 90 ? 'bad' : '') + '"><i style="width:' + pct + '%"></i></div>' +
    '<div class="sisa row-between"><div><div class="micro">Sisa saldo kas</div><div class="cur ' + (p.sisa < 0 ? 'neg' : '') + '" style="color:' + (p.sisa < 0 ? '' : 'var(--primary)') + '">' + rp(p.sisa) + '</div></div><button class="btn soft icon" data-act="filter" data-pos="' + esc(p.id) + '" aria-label="Lihat pengeluaran ' + esc(p.nama) + '">' + ic('chev-r') + '</button></div></article>';
}

function renderPos(el) {
  const d = POS.summary; if (!d) return;
  const nt = d.pos.filter((p) => p.jenis !== 'Tabungan'), tab = d.pos.find((p) => p.jenis === 'Tabungan');
  const alo = d.pos.reduce((a, p) => a + p.alokasi, 0), pakai = nt.reduce((a, p) => a + p.pengeluaran, 0);
  $('#ps-stats', el).innerHTML =
    '<div class="card stat"><div class="micro">Total alokasi tahun ' + d.tahun + '</div><div class="big-num">' + rp(alo) + '</div><div class="small muted">Hasil pembagian iuran tahun ' + d.tahun + ' ke semua pos</div></div>' +
    '<div class="card stat"><div class="micro">Pengeluaran operasional ' + d.tahun + '</div><div class="big-num neg">' + rp(pakai) + '</div><div class="small muted">Sisa kas operasional ' + rp(nt.reduce((a, p) => a + p.sisa, 0)) + '</div></div>' +
    '<div class="card stat"><div class="micro">Cadangan tabungan anggota</div><div class="big-num">' + rp(tab ? tab.saldoKumulatif : 0) + '</div><div class="small muted">' + ic('lock', 'ic-sm') + ' Terkunci — tidak dapat dipakai kas</div></div>';
  $('#ps-cards', el).innerHTML = d.pos.map(posCard).join('');
  $('#ps-roll', el).innerHTML = nt.map((p) => '<div class="row-between" style="padding:8px 0;border-top:1px solid var(--ice)"><span class="small">Sisa ' + esc(p.nama) + ' s.d. ' + (d.tahun - 1) + '</span><b class="num ' + (p.saldoAwal < 0 ? 'neg' : '') + '">' + rp(p.saldoAwal) + '</b></div>').join('') +
    '<div class="row-between" style="padding:10px 12px;margin-top:8px;background:var(--ice);border-radius:10px"><b>Total kas awal ' + d.tahun + '</b><b class="num">' + rp(nt.reduce((a, p) => a + p.saldoAwal, 0)) + '</b></div>';
  const sel = $('#ps-pos', el); sel.innerHTML = '<option value="">Semua pos</option>' + d.pos.map((p) => '<option value="' + esc(p.id) + '"' + (p.id === POS.filterPos ? ' selected' : '') + '>' + esc(p.nama) + '</option>').join('');
}

function renderExp(el) {
  const rows = (POS.exp || []).filter((r) => !POS.q || (r.keterangan + ' ' + r.penerima + ' ' + r.pos).toLowerCase().indexOf(POS.q.toLowerCase()) > -1);
  const show = rows.slice(0, POS.limit);
  $('#ps-count', el).textContent = 'Menampilkan ' + show.length + ' dari ' + rows.length + ' transaksi tahun ' + POS.tahun;
  if (!rows.length) { $('#ps-exp', el).innerHTML = emptyState('receipt', 'Belum ada pengeluaran' + (POS.q ? ' yang cocok' : ' pada tahun ini') + '.'); return; }
  const bukti = (r) => r.bukti ? '<a href="' + esc(r.bukti) + '" target="_blank" rel="noopener" class="small">' + ic('link', 'ic-sm') + ' Bukti</a>' : '<span class="small muted">–</span>';
  const acts = (r) => isAdmin() && !r.idAnggota ? '<button class="btn ghost icon" data-act="editexp" data-id="' + esc(r.id) + '" aria-label="Ubah">' + ic('edit', 'ic-sm') + '</button><button class="btn ghost icon" data-act="delexp" data-id="' + esc(r.id) + '" aria-label="Hapus" style="color:var(--bad)">' + ic('trash', 'ic-sm') + '</button>' : '';
  $('#ps-exp', el).innerHTML =
    '<div class="list-desktop"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tanggal</th><th>Pos</th><th>Keterangan</th><th class="r">Nominal</th><th>Penerima</th><th>Bukti</th><th></th></tr></thead><tbody>' +
    show.map((r) => '<tr><td class="num" style="white-space:nowrap">' + fmtDate(r.tanggal) + '</td><td><span class="badge info">' + esc(r.pos) + '</span></td><td><b>' + esc(r.keterangan) + '</b></td><td class="r num neg" style="font-weight:700">' + rp(r.nominal) + '</td><td>' + esc(r.penerima || '-') + '</td><td>' + bukti(r) + '</td><td style="white-space:nowrap">' + acts(r) + '</td></tr>').join('') + '</tbody></table></div></div>' +
    '<div class="list-mobile">' + show.map((r) => '<article class="mrow st-gagal"><div class="row-between" style="align-items:flex-start"><div class="grow"><div class="name">' + esc(r.keterangan) + '</div><div class="sub">' + fmtDate(r.tanggal) + ' · ' + esc(r.penerima || '-') + '</div><div class="mt8" style="margin-top:6px"><span class="badge info">' + esc(r.pos) + '</span></div></div><div class="cur neg">' + rp(r.nominal) + '</div></div><div class="row-between mt8" style="margin-top:8px">' + bukti(r) + '<span>' + acts(r) + '</span></div></article>').join('') + '</div>' + pager(show.length, rows.length, 'more');
}

/* ---- Dialog pengeluaran ---- */
function openExpenseDialog(row) {
  row = row || null;
  const list = posList().filter((p) => p.jenis !== 'Tabungan' && p.aktif);
  const d = openDialog({
    title: row ? 'Ubah Pengeluaran' : 'Catat Pengeluaran Baru', sub: 'Pengeluaran mengurangi saldo pos yang dipilih. Lampirkan nota agar dapat diaudit.',
    body: '<div class="field"><label for="e-pos">Pos anggaran *</label><select class="input" id="e-pos" name="posId">' + list.map((p) => '<option value="' + esc(p.id) + '"' + (row && row.posId === p.id ? ' selected' : '') + '>' + esc(p.nama) + ' — sisa ' + rp(p.saldoKumulatif) + '</option>').join('') + '</select></div>' +
      '<div class="grid g2" style="gap:12px"><div class="field"><label for="e-tgl">Tanggal *</label><input class="input" type="date" id="e-tgl" name="tanggal" value="' + esc(row ? row.tanggal : todayStr()) + '"></div>' +
      '<div class="field"><label for="e-nom">Nominal (Rp) *</label><input class="input" id="e-nom" name="nominal" data-rupiah inputmode="numeric" value="' + (row ? row.nominal : '') + '" placeholder="0"></div></div>' +
      '<div class="field"><label for="e-ket">Keterangan / keperluan *</label><input class="input" id="e-ket" name="keterangan" maxlength="250" value="' + esc(row ? row.keterangan : '') + '" placeholder="mis. Banner & snack pelatihan Code Blue"></div>' +
      '<div class="field"><label for="e-pen">Penerima / vendor</label><input class="input" id="e-pen" name="penerima" maxlength="100" value="' + esc(row ? row.penerima : '') + '"></div>' +
      '<div class="field"><label for="e-file">Bukti (foto nota / PDF)' + (row && row.bukti ? ' — sudah ada, unggah lagi untuk mengganti' : '') + '</label><input class="input" type="file" id="e-file" accept="image/*,application/pdf" style="padding-top:10px"><div class="hint">Foto dikompres otomatis. Maks. ' + (AppState.boot.settings.MAX_UPLOAD_MB || 5) + ' MB.</div></div>',
    footer: '<button class="btn soft" data-act="close">Batal</button><button class="btn dark" data-act="save">' + ic('check-circle') + 'Simpan Pengeluaran</button>', footRow: true,
    actions: {
      save: async () => {
        const v = formVals(d.dlg);
        if (!v.posId) return toast('Pilih pos anggaran.', 'error');
        if (!(v.nominal > 0)) return fieldErr($('#e-nom', d.el), 'Isi nominal lebih dari 0.');
        if (!v.keterangan) return fieldErr($('#e-ket', d.el), 'Keterangan wajib diisi.');
        let bukti = '';
        try { const f = $('#e-file', d.el).files[0]; if (f) bukti = await uploadBukti(f); } catch (err) { return toast(err.message, 'error'); }
        const send = (force) => api('expenseSave', { id: row && row.id, posId: v.posId, tanggal: v.tanggal, nominal: v.nominal, keterangan: v.keterangan, penerima: v.penerima, bukti, force });
        let res = await send(false);
        if (!res.success && res.code === 'SALDO_KURANG' && AppState.boot.settings.BLOKIR_SALDO !== 'ya') {
          if (!await confirmDlg('Nominal <b>' + rp(v.nominal) + '</b> melebihi saldo pos (<b>' + rp(res.data && res.data.saldo) + '</b>). Saldo pos akan menjadi minus.<br>Tetap simpan?', { title: 'Saldo pos tidak cukup', okText: 'Tetap simpan', danger: true })) return;
          res = await send(true);
        }
        if (!res.success) return toast(res.message, 'error');
        d.close(); toast(res.message); dataChanged(['dashboard', 'pos']);
      }
    }
  });
  bindRupiah(d.dlg);
}

/* ---- Dialog alokasi tahunan ---- */
function alokasiDialog() {
  const admin = isAdmin();
  const nt = posList().filter((p) => p.jenis !== 'Tabungan' && p.aktif);
  const locked = AppState.boot.alokasiDikunci || [];
  const thisY = Number(periodeNow().slice(0, 4));
  let tahun = !locked.includes(thisY - 1) ? thisY - 1 : thisY;
  let overrides = {}, nominals = Store.get('alokasi-nominal', {}), ovBuilt = false, last = null, timpa = false;
  const d = openDialog({
    title: 'Alokasi Tahunan', wide: true, sub: 'Bagi iuran terbayar satu tahun ke pos-pos. <b>Sisa otomatis menjadi tabungan</b> tiap anggota.',
    badge: '<span class="badge ' + (admin ? 'info' : 'mute') + '">' + ic('lock', 'ic-sm') + (admin ? 'Dikunci setelah disimpan' : 'Hanya lihat') + '</span>',
    body: '<div class="field"><label for="al-th">Tahun iuran yang dialokasikan</label><select class="input" id="al-th">' + yearOptions(tahun, 4, 0) + '</select></div>' +
      '<div class="micro">Potongan per anggota per tahun (Rp)</div><div class="mt8" id="al-inputs">' + nt.map((p) => '<div class="field" style="margin-bottom:10px"><label for="al-' + esc(p.id) + '">' + esc(p.nama) + ' <span class="muted" style="font-weight:400" data-bln="' + esc(p.id) + '"></span></label><input class="input" id="al-' + esc(p.id) + '" data-pos="' + esc(p.id) + '" data-rupiah inputmode="numeric" placeholder="0" value="' + (nominals[p.id] || '') + '" ' + (admin ? '' : 'readonly') + '></div>').join('') + '</div>' +
      '<div id="al-prev" class="mt12"><div class="skel sk-card"></div></div>' +
      '<details class="mt12" id="al-ov"><summary class="btn soft block" style="justify-content:flex-start">' + ic('edit', 'ic-sm') + 'Penyesuaian per anggota (opsional)</summary><div id="al-ovbody" class="mt12"></div></details>',
    footer: '<button class="btn soft" data-act="close">' + (admin ? 'Batal' : 'Tutup') + '</button>' + (admin ? '<button class="btn dark" data-act="save">' + ic('lock', 'ic-sm') + 'Simpan & Kunci Alokasi</button>' : ''), footRow: admin,
    actions: {
      save: async () => {
        if (!last || !last.rows.some((r) => !r.locked)) return toast('Tidak ada anggota yang perlu dialokasikan.', 'error');
        const tot = Object.keys(last.totalPerPos).reduce((a, k) => a + last.totalPerPos[k], 0);
        if (!await confirmDlg('Simpan alokasi tahun <b>' + tahun + '</b> untuk <b>' + last.rows.filter((r) => !r.locked).length + '</b> anggota?<br>Total potongan pos ' + rp(tot) + ' · total tabungan <b>' + rp(last.totalTabungan) + '</b>' + (last.minus.length ? '<br><span class="neg">' + last.minus.length + ' anggota bertabungan minus.</span>' : '') + '<br><span class="small muted">Setelah disimpan, alokasi tahun ini dikunci.</span>', { title: 'Konfirmasi alokasi', okText: 'Simpan & kunci' })) return;
        Store.set('alokasi-nominal', nominals);
        let res = await api('alokasiSave', { tahun, nominals, overrides, timpa });
        if (!res.success && res.code === 'LOCKED') {
          if (!await confirmDlg('Alokasi tahun ' + tahun + ' <b>sudah dikunci</b>. Timpa dengan angka baru? Anggota yang sudah dicairkan tidak ikut diubah. Perubahan tercatat di log.', { title: 'Revisi alokasi', okText: 'Ya, timpa', danger: true })) return;
          timpa = true; res = await api('alokasiSave', { tahun, nominals, overrides, timpa: true });
        }
        if (!res.success) return toast(res.message, 'error');
        d.close(); toast(res.message);
        const r = await api('bootstrap'); if (r.success) loadBoot(r.data);
        dataChanged(['dashboard', 'pos', 'anggota']);
      }
    }
  });
  bindRupiah(d.dlg);
  const readNoms = () => { $$('[data-pos]', d.el).forEach((i) => { nominals[i.dataset.pos] = parseRupiah(i.value); const b = $('[data-bln="' + i.dataset.pos + '"]', d.el); if (b) b.textContent = nominals[i.dataset.pos] ? '(≈ ' + rp(nominals[i.dataset.pos] / 12) + ' / bln)' : ''; }); };
  const buildOv = () => {
    const rows = last.rows.filter((r) => !r.locked);
    $('#al-ovbody', d.el).innerHTML = (admin ? '<p class="small muted">Kosongkan kolom untuk memakai nominal standar di atas. Isi hanya bila anggota tertentu berbeda (mis. bergabung di tengah tahun).</p>' : '') +
      '<div class="tbl-wrap mt8" style="max-height:340px;overflow:auto"><table class="tbl"><thead><tr><th>Anggota</th><th class="r">Iuran terbayar</th>' + nt.map((p) => '<th>' + esc(p.nama) + '</th>').join('') + '<th class="r">Tabungan</th></tr></thead><tbody>' +
      rows.map((r) => '<tr><td>' + esc(r.nama) + '</td><td class="r num">' + rp(r.terbayar) + '</td>' + nt.map((p) => '<td><input class="input" style="min-height:36px;min-width:96px" data-ov="' + esc(r.id) + '|' + esc(p.id) + '" data-rupiah inputmode="numeric" placeholder="' + Number(nominals[p.id] || 0).toLocaleString('id-ID') + '" ' + (admin ? '' : 'readonly') + '></td>').join('') + '<td class="r num" data-tc="' + esc(r.id) + '"></td></tr>').join('') + '</tbody></table></div>';
    bindRupiah($('#al-ovbody', d.el)); ovBuilt = true;
  };
  const showPrev = () => {
    const p = last;
    $('#al-prev', d.el).innerHTML =
      (p.tahunDikunci ? '<div class="notice" style="background:var(--warn-bg);color:#7a4100">' + ic('lock', 'ic-sm') + '<span>Alokasi tahun ' + p.tahun + ' <b>sudah dikunci</b>' + (admin ? '. Menyimpan lagi akan meminta konfirmasi revisi.' : '.') + '</span></div>' : '') +
      '<div class="grid g3 mt8" style="gap:10px"><div class="card-flat"><div class="micro">Iuran terbayar</div><div class="cur">' + rp(p.totalTerbayar) + '</div></div><div class="card-flat"><div class="micro">Total potongan pos</div><div class="cur">' + rp(p.totalPotongan) + '</div></div><div class="card-flat" style="background:var(--ok-bg)"><div class="micro pos">Total ke tabungan</div><div class="cur ' + (p.totalTabungan < 0 ? 'neg' : 'pos') + '">' + rp(p.totalTabungan) + '</div></div></div>' +
      '<div class="tbl-wrap mt12"><table class="tbl" style="min-width:0"><tbody>' + p.pos.map((x) => '<tr><td>' + esc(x.nama) + '</td><td class="r num"><b>' + rp(p.totalPerPos[x.id] || 0) + '</b></td></tr>').join('') + '<tr><td>Tabungan anggota</td><td class="r num"><b>' + rp(p.totalTabungan) + '</b></td></tr></tbody></table></div>' +
      (p.minus.length ? '<div class="banner-warn mt12"><b>' + ic('alert-triangle', 'ic-sm') + ' ' + p.minus.length + ' anggota bertabungan minus</b><div class="small" style="margin-top:4px">' + p.minus.slice(0, 8).map((m) => esc(m.nama) + ' (' + rp(m.tabungan) + ')').join('; ') + (p.minus.length > 8 ? '; …' : '') + '</div><div class="small" style="margin-top:4px">Potongan tetap dibebankan penuh sesuai ketentuan.</div></div>' : '') +
      (p.terkunci ? '<div class="notice info">' + ic('info', 'ic-sm') + '<span>' + p.terkunci + ' anggota sudah memiliki alokasi tahun ini dan tidak diubah.</span></div>' : '') +
      ((admin && p.tahunDikunci) ? '' : '');
    if (!ovBuilt) buildOv();
    p.rows.filter((r) => !r.locked).forEach((r) => { const c = $('[data-tc="' + r.id + '"]', d.el); if (c) { c.textContent = rp(r.tabungan); c.classList.toggle('neg', r.tabungan < 0); } });
    $('#al-ov summary', d.el).lastChild.textContent = 'Penyesuaian per anggota' + (Object.keys(overrides).length ? ' (' + Object.keys(overrides).length + ' diubah)' : ' (opsional)');
  };
  const preview = async () => {
    readNoms();
    const res = await api('alokasiPreview', { tahun, nominals, overrides });
    if (d.closed) return;
    if (!res.success) { $('#al-prev', d.el).innerHTML = '<div class="banner-warn">' + esc(res.message) + '</div>'; return; }
    last = res.data; showPrev();
  };
  const pvDeb = debounce(preview, 450);
  $('#al-th', d.el).addEventListener('change', (e) => { tahun = Number(e.target.value); overrides = {}; ovBuilt = false; $('#al-ovbody', d.el).innerHTML = ''; preview(); });
  d.el.addEventListener('input', (e) => {
    if (e.target.dataset.pos) pvDeb();
    else if (e.target.dataset.ov) {
      const [mid, pid] = e.target.dataset.ov.split('|'), v = e.target.value.trim();
      if (v === '') { if (overrides[mid]) { delete overrides[mid][pid]; if (!Object.keys(overrides[mid]).length) delete overrides[mid]; } }
      else { overrides[mid] = overrides[mid] || {}; overrides[mid][pid] = parseRupiah(v); }
      pvDeb();
    }
  });
  readNoms(); preview();
}

/* ---- Kelola pos ---- */
function kelolaPosDialog() {
  const draw = () => posList().map((p) => '<div class="row" style="padding:10px 0;border-top:1px solid var(--ice)"><div class="grow"><div class="title">' + esc(p.nama) + ' ' + (p.jenis === 'Tabungan' ? '<span class="badge info">Wajib</span>' : '') + (p.aktif ? '' : '<span class="badge mute">Nonaktif</span>') + '</div><div class="small muted">' + esc(p.deskripsi || '-') + '</div></div><button class="btn soft sm" data-act="edit" data-id="' + esc(p.id) + '">' + ic('edit', 'ic-sm') + 'Ubah</button></div>').join('');
  const d = openDialog({
    title: 'Kelola Pos Anggaran', sub: 'Tambah, ubah nama, atau nonaktifkan pos. Pos Tabungan bersifat khusus dan tidak dapat dihapus.',
    body: '<div id="kp-list">' + draw() + '</div>', footer: '<button class="btn soft" data-act="close">Tutup</button><button class="btn dark" data-act="add">' + ic('plus') + 'Tambah Pos</button>', footRow: true,
    actions: { add: () => posForm(null) }
  });
  d.el.addEventListener('click', (e) => { const b = e.target.closest('[data-act="edit"]'); if (b) posForm(posList().find((p) => p.id === b.dataset.id)); });
  function posForm(p) {
    const f = openDialog({
      title: p ? 'Ubah Pos' : 'Tambah Pos Baru',
      body: '<div class="field"><label for="p-nama">Nama pos *</label><input class="input" id="p-nama" name="nama" maxlength="80" value="' + esc(p ? p.nama : '') + '"></div><div class="field"><label for="p-des">Deskripsi</label><input class="input" id="p-des" name="deskripsi" maxlength="250" value="' + esc(p ? p.deskripsi : '') + '"></div>' +
        (p && p.jenis === 'Tabungan' ? '' : '<label class="check"><input type="checkbox" name="aktif" ' + (!p || p.aktif ? 'checked' : '') + '><span>Pos aktif (ikut dalam alokasi & pengeluaran)</span></label>'),
      footer: '<button class="btn soft" data-act="close">Batal</button><button class="btn dark" data-act="save">' + ic('check') + 'Simpan</button>', footRow: true,
      actions: {
        save: async () => {
          const v = formVals(f.dlg); if (!v.nama) return fieldErr($('#p-nama', f.el), 'Nama pos wajib diisi.');
          const res = await api('posSave', { id: p && p.id, nama: v.nama, deskripsi: v.deskripsi, aktif: v.aktif !== false });
          if (!res.success) return toast(res.message, 'error');
          f.close(); toast('Pos disimpan.');
          const b = await api('bootstrap'); if (b.success) loadBoot(b.data);
          const s = await api('posList', { tahun: POS.tahun || AppState.boot.tahun }); if (s.success) POS.summary = s.data;
          $('#kp-list', d.el).innerHTML = draw(); dataChanged(['dashboard', 'pos']);
        }
      }
    });
  }
}

registerPage('pos', {
  template: () => '<div class="page-head"><div><h1 class="h-lg">Pos Anggaran & Alokasi</h1><p class="muted">Saldo tiap pos, pengeluaran, dan pembagian iuran tahunan</p></div>' +
    '<div class="actions"><select class="input" id="ps-th" style="width:auto" aria-label="Tahun anggaran"></select><button class="btn dark" data-act="addexp">' + ic('plus') + 'Catat Pengeluaran</button><button class="btn soft" data-act="alokasi">' + ic('lock', 'ic-sm') + '<span id="ps-alo-lbl">Alokasi Tahunan</span></button><button class="btn soft" data-act="kelola" id="ps-kelola" hidden>' + ic('sliders', 'ic-sm') + 'Kelola Pos</button><button class="btn soft" data-act="pdf">' + ic('printer', 'ic-sm') + 'Laporan</button></div></div>' +
    '<div class="grid g3" id="ps-stats"><div class="skel sk-card"></div><div class="skel sk-card"></div><div class="skel sk-card"></div></div>' +
    '<div class="grid g4 mt16" id="ps-cards"></div>' +
    '<div class="split mt16"><div class="card"><div class="row-between wrap" style="gap:10px"><div><h2 class="h-sm">' + ic('receipt', 'ic-sm') + ' Pengeluaran kas riil</h2><p class="small muted" id="ps-count"></p></div><div class="row wrap" style="gap:8px"><label class="search" style="min-height:40px">' + ic('search', 'ic-sm') + '<input id="ps-q" type="search" placeholder="Filter pengeluaran…" aria-label="Filter pengeluaran"></label><select class="input" id="ps-pos" style="width:auto;min-height:40px" aria-label="Filter pos"></select></div></div><div class="mt12" id="ps-exp">' + skeleton(2) + '</div></div>' +
    '<div class="stack"><div class="card"><h2 class="h-sm">' + ic('refresh', 'ic-sm') + ' Saldo bawaan (rollover)</h2><p class="small muted">Sisa kas tahun lalu otomatis dibawa ke tahun berikutnya.</p><div class="mt12" id="ps-roll"></div></div>' +
    '<div class="banner-info"><b>' + ic('landmark', 'ic-sm') + ' Rekening</b><div class="small" id="ps-bank" style="margin-top:4px"></div></div></div></div>',
  init(el) {
    $('#ps-th', el).addEventListener('change', (e) => { POS.tahun = Number(e.target.value); POS.limit = 20; this.show(el); });
    $('#ps-q', el).addEventListener('input', debounce((e) => { POS.q = e.target.value.trim(); POS.limit = 20; renderExp(el); }, 250));
    $('#ps-pos', el).addEventListener('change', (e) => { POS.filterPos = e.target.value; POS.limit = 20; this.loadExp(el); });
    if (isAdmin()) $('#ps-kelola', el).hidden = false; else $('#ps-alo-lbl', el).textContent = 'Lihat Alokasi';
    el.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act;
      if (a === 'addexp') openExpenseDialog(); else if (a === 'alokasi') alokasiDialog(); else if (a === 'kelola') kelolaPosDialog();
      else if (a === 'pdf') { AppState.laporanJenis = 'pos'; go('laporan'); }
      else if (a === 'tabungan') { AppState.anggotaTab = 'tabungan'; go('anggota'); }
      else if (a === 'filter') { POS.filterPos = b.dataset.pos; $('#ps-pos', el).value = POS.filterPos; this.loadExp(el); $('#ps-exp', el).scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      else if (a === 'more') { POS.limit += 20; renderExp(el); }
      else if (a === 'editexp') openExpenseDialog((POS.exp || []).find((r) => r.id === b.dataset.id));
      else if (a === 'delexp') {
        const r = (POS.exp || []).find((x) => x.id === b.dataset.id);
        if (r && await confirmDlg('Hapus pengeluaran <b>' + esc(r.keterangan) + '</b> (' + rp(r.nominal) + ')? Saldo pos akan bertambah kembali.', { title: 'Hapus pengeluaran', okText: 'Hapus', danger: true })) {
          const res = await api('expenseDelete', { id: r.id }); if (!res.success) return toast(res.message, 'error'); toast('Pengeluaran dihapus.'); dataChanged(['dashboard', 'pos']);
        }
      } else if (a === 'retry') this.show(el, null, { force: true });
    });
  },
  loadExp(el, force) {
    swr('exp:' + POS.tahun + ':' + POS.filterPos, 'expenseList', { tahun: POS.tahun, posId: POS.filterPos }, (d) => { POS.exp = d; renderExp(el); }, { force, fresh: 30000, onError: (r) => { $('#ps-exp', el).innerHTML = retryBox(r.message, 'retry'); } });
  },
  show(el, _, opt) {
    opt = opt || {};
    if (!POS.tahun) POS.tahun = AppState.boot.tahun;
    $('#ps-th', el).innerHTML = yearOptions(POS.tahun);
    $('#ps-bank', el).textContent = AppState.boot.settings.BANK_NAMA + ' · ' + AppState.boot.settings.NAMA_ORG;
    if (!POS.summary && AppState.boot.pos && POS.tahun === AppState.boot.tahun) { POS.summary = { tahun: POS.tahun, pos: AppState.boot.pos }; renderPos(el); }
    swr('pos:' + POS.tahun, 'posList', { tahun: POS.tahun }, (d) => { POS.summary = d; renderPos(el); }, { force: opt.force, fresh: 30000, onError: (r) => { $('#ps-cards', el).innerHTML = retryBox(r.message, 'retry'); } });
    this.loadExp(el, opt.force);
  }
});

'use strict';
/* ===== DATA ANGGOTA & TABUNGAN ===== */
const AG = { tab: 'daftar', q: '', unit: '', limit: 40, list: null, tabData: null, tahun: null, onlyMinus: false };

function agStatusBadge(s) { return { Aktif: '<span class="badge ok">Aktif</span>', Nonaktif: '<span class="badge mute">Nonaktif</span>', Purna: '<span class="badge info">Purna Tugas</span>', Berhenti: '<span class="badge warn">Berhenti</span>' }[s] || ''; }
const matchQ = (r, q) => !q || (r.nama + ' ' + (r.nira || '') + ' ' + (r.nip || '') + ' ' + (r.unit || '')).toLowerCase().indexOf(q.toLowerCase()) > -1;

function renderAnggota(el) {
  $$('[data-tab]', el).forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === AG.tab));
  $('#ag-tahun-wrap', el).hidden = AG.tab !== 'tabungan';
  if (AG.tab === 'daftar') renderDaftar(el); else renderTabungan(el);
  const src = AG.tab === 'daftar' ? AG.list : (AG.tabData && AG.tabData.rows);
  const units = Array.from(new Set((src || []).map((r) => r.unit).filter(Boolean))).sort();
  const us = $('#ag-unit', el); const cur = AG.unit;
  us.innerHTML = '<option value="">Semua unit/ruangan</option>' + units.map((u) => '<option' + (u === cur ? ' selected' : '') + '>' + esc(u) + '</option>').join('');
}

function renderDaftar(el) {
  if (!AG.list) return;
  const rows = AG.list.filter((r) => matchQ(r, AG.q) && (!AG.unit || r.unit === AG.unit));
  $('#ag-sum', el).innerHTML = '<span class="badge mute">' + AG.list.filter((r) => r.status === 'Aktif').length + ' aktif</span> <span class="badge mute">' + AG.list.length + ' total</span>';
  $('#ag-body', el).innerHTML = rows.length ? rows.slice(0, AG.limit).map((r) => '<article class="mrow ' + (r.status === 'Aktif' ? 'st-ok' : 'st-pending') + '" data-id="' + esc(r.id) + '"><div class="row" style="gap:12px;align-items:flex-start"><span class="initial">' + esc(initials(r.nama)) + '</span><div class="grow"><div class="name">' + esc(r.nama) + ' ' + agStatusBadge(r.status) + '</div>' +
    '<div class="sub">NIRA ' + esc(r.nira || '-') + (r.nip ? ' · NIP ' + esc(r.nip) : '') + '</div><div class="sub">' + ic('building', 'ic-sm') + ' ' + esc(r.unit || 'Unit belum diisi') + '</div></div>' +
    '<div class="row" style="gap:4px">' + (r.wa ? '<a class="btn soft icon" href="' + waLink(r.wa, '') + '" target="_blank" rel="noopener" aria-label="WhatsApp ' + esc(r.nama) + '" style="color:var(--wa-btn)">' + ic('wa') + '</a>' : '') +
    (isAdmin() ? '<button class="btn soft icon" data-act="edit" aria-label="Ubah ' + esc(r.nama) + '">' + ic('edit') + '</button>' : '') + '</div></div></article>').join('') + pager(Math.min(AG.limit, rows.length), rows.length, 'more')
    : emptyState('users', AG.list.length ? 'Tidak ada anggota yang cocok.' : 'Belum ada anggota.' + (isAdmin() ? '<br><button class="btn dark mt16" data-act="import">' + ic('upload') + 'Impor daftar anggota</button>' : ''));
}

function renderTabungan(el) {
  const d = AG.tabData; if (!d) return;
  const aktif = d.rows.filter((r) => !r.dicairkan);
  const rows = d.rows.filter((r) => matchQ(r, AG.q) && (!AG.unit || r.unit === AG.unit) && (!AG.onlyMinus || r.minus) && !(r.dicairkan && r.jumlahCair === 0 && r.saldo === 0 && false));
  rows.sort((a, b) => (b.minus - a.minus) || ((a.status === 'Purna' && !a.dicairkan ? 0 : 1) - (b.status === 'Purna' && !b.dicairkan ? 0 : 1)) || a.nama.localeCompare(b.nama));
  $('#ag-sum', el).innerHTML = '';
  let h = '<div class="card"><div class="micro">' + ic('wallet', 'ic-sm') + ' Saldo tabungan mengendap</div><div class="big-num mt8" style="margin-top:6px">' + rp(d.total) + '</div><div class="kv" style="grid-template-columns:1fr auto;margin-top:10px"><span class="l">Rata-rata per anggota</span><span class="v">' + rp(d.rata) + '</span></div></div>';
  if (d.jumlahMinus) h += '<div class="banner-warn mt12"><div class="row-between wrap"><div><b>' + ic('alert-triangle', 'ic-sm') + ' ' + d.jumlahMinus + ' anggota saldo minus</b><div class="small" style="margin-top:2px">Iuran belum lunas namun potongan pos tetap dipotong penuh sesuai ketentuan.</div></div><button class="btn danger sm" data-act="onlyminus">' + (AG.onlyMinus ? 'Tampilkan semua' : 'Lihat yang minus') + '</button></div></div>';
  h += '<div class="row-between mt16"><span class="micro">Ringkasan rekening anggota (tahun ' + d.tahun + ')</span><span class="small muted">' + rows.length + ' dari ' + d.rows.length + '</span></div><div class="mt8">';
  h += rows.length ? rows.slice(0, AG.limit).map((r) => tabCard(r, d)).join('') + pager(Math.min(AG.limit, rows.length), rows.length, 'more') : emptyState('piggy', 'Tidak ada data.');
  $('#ag-body', el).innerHTML = h + '</div>';
}

function tabCard(r, d) {
  const proy = r.proyeksi ? ' <span class="badge warn" title="Potongan memakai proyeksi dari alokasi terakhir">proyeksi</span>' : '';
  let h = '<article class="mrow ' + (r.minus ? 'st-minus' : r.dicairkan ? 'st-pending' : 'st-ok') + '" data-id="' + esc(r.id) + '"><div class="row" style="gap:12px;align-items:flex-start"><span class="initial ' + (r.minus ? 'bad' : '') + '">' + esc(initials(r.nama)) + '</span><div class="grow"><div class="name">' + esc(r.nama) + '</div><div class="sub">NIRA ' + esc(r.nira || '-') + ' · ' + esc(r.unit || '-') + '</div></div>' +
    '<div style="text-align:right">' + agStatusBadge(r.status) + (r.minus ? '<div class="mt8" style="margin-top:6px"><span class="badge bad">Saldo minus</span></div>' : '') + (r.dicairkan ? '<div class="mt8" style="margin-top:6px"><span class="badge mute">Sudah dicairkan</span></div>' : '') + '</div></div>';
  h += '<div class="kv ' + (r.tabunganTahun < 0 ? 'red' : '') + '"><div><div class="l">Iuran ' + d.tahun + ' terbayar</div><div class="v">' + rp(r.terbayar) + ' <span class="small muted" style="font-weight:400">/ ' + r.bulan + ' bln</span></div></div><div class="r"><div class="l">Potongan pos tetap' + proy + '</div><div class="v">' + rp(r.potongan) + '</div></div>' +
    '<div><div class="l">Tabungan ' + d.tahun + '</div><div class="v ' + (r.tabunganTahun < 0 ? 'neg' : 'pos') + '" style="font-size:17px">' + (r.tabunganTahun >= 0 ? '+' : '') + rp(r.tabunganTahun) + '</div></div><div class="r"><div class="l">Total tabungan kumulatif</div><div class="v ' + (r.saldo < 0 ? 'neg' : '') + '" style="font-size:17px">' + rp(r.saldo) + '</div></div></div>';
  h += '<div class="actions2"><button class="btn soft" data-act="buku">' + ic('book', 'ic-sm') + 'Buku Tabungan</button>';
  if (isAdmin() && !r.dicairkan) h += '<button class="btn ' + (r.status === 'Purna' || r.status === 'Berhenti' ? 'dark' : 'outline') + '" data-act="cair">' + ic('cash', 'ic-sm') + (r.status === 'Purna' ? 'Proses Pencairan' : 'Cairkan') + '</button>';
  else if (r.minus && r.wa) h += '<a class="btn wa" target="_blank" rel="noopener" href="' + waLink(r.wa, 'Yth. ' + r.nama + ', saldo tabungan iuran Anda per ' + d.tahun + ' tercatat ' + rp(r.saldo) + ' karena iuran belum lunas sementara potongan pos tetap dibebankan penuh. Mohon konfirmasi pelunasan ke pengurus DPK PPNI RSUD Soekandar. Terima kasih.') + '">' + ic('wa', 'ic-sm') + 'Kirim Nota WA</a>';
  else h += '<span></span>';
  return h + '</div></article>';
}

/* ---- Buku tabungan ---- */
async function bukuDialog(id, nama) {
  const d = openDialog({ title: 'Buku Tabungan', sub: esc(nama), body: '<div class="skel sk-card"></div>', footer: '<button class="btn dark" data-act="close">Tutup</button>', wide: true });
  const res = await api('tabunganDetail', { idAnggota: id });
  if (!res.success) return d.setBody('<p class="neg">' + esc(res.message) + '</p>');
  const t = res.data;
  d.setBody('<div class="grid g2" style="gap:10px"><div class="card-flat"><div class="micro">Saldo tabungan saat ini</div><div class="big-num ' + (t.saldo < 0 ? 'neg' : '') + '">' + rp(t.saldo) + '</div></div><div class="card-flat"><div class="micro">Sudah dicairkan</div><div class="big-num" style="color:var(--muted)">' + rp(t.dicairkan) + '</div></div></div>' +
    '<div class="tbl-wrap mt12"><table class="tbl"><thead><tr><th>Tahun</th><th class="r">Iuran</th><th class="r">Potongan pos</th><th class="r">Tabungan</th><th>Status</th></tr></thead><tbody>' +
    (t.tahunan.length ? t.tahunan.map((r) => '<tr><td><b>' + r.tahun + '</b><div class="small muted">' + r.bulan + ' bulan</div></td><td class="r num">' + rp(r.terbayar) + '</td><td class="r num">' + (r.dialokasi ? rp(r.potongan) : '–') + '</td><td class="r num ' + (r.dialokasi && r.tabungan < 0 ? 'neg' : '') + '">' + (r.dialokasi ? rp(r.tabungan) : '–') + '</td><td>' + (r.dialokasi ? '<span class="badge ok">Dialokasi</span>' : '<span class="badge warn">Belum dialokasi</span>') + '</td></tr>').join('') : '<tr><td colspan="5" class="c muted">Belum ada riwayat iuran.</td></tr>') + '</tbody></table></div>' +
    '<p class="small muted mt12">Rumus: Tabungan tahun = iuran terbayar − potongan pos non-tabungan. Tabungan tahun yang belum dialokasikan belum ikut dihitung dalam saldo.</p>');
}

/* ---- Pencairan ---- */
async function cairDialog(id, nama) {
  const d = openDialog({ title: 'Pencairan Dana Tabungan', sub: esc(nama), wide: true, body: '<div class="skel sk-card"></div>', noFocus: true });
  const res = await api('pencairanPreview', { idAnggota: id });
  if (!res.success) return d.setBody('<p class="neg">' + esc(res.message) + '</p>');
  const p = res.data, net = p.saldoBersih, a = p.anggota;
  d.setBody('<div class="card-flat row" style="gap:12px"><span class="initial" style="background:var(--primary);color:#fff;border-radius:12px">' + esc(initials(a.nama)) + '</span><div><div class="title">' + esc(a.nama) + '</div><div class="small muted">NIRA ' + esc(a.nira || '-') + ' · ' + esc(a.unit || '-') + '</div></div></div>' +
    '<div class="micro mt16">Rincian hak finansial & formula tabungan</div><div class="tbl-wrap mt8"><table class="tbl"><thead><tr><th>Tahun</th><th class="r">Iuran terbayar</th><th class="r">Potongan pos</th><th class="r">Tabungan</th></tr></thead><tbody>' +
    p.rincian.map((r) => '<tr><td>' + r.tahun + (r.proyeksi ? ' <span class="badge warn">proyeksi</span>' : '') + '</td><td class="r num">' + rp(r.terbayar) + '</td><td class="r num">' + rp(r.potongan) + '</td><td class="r num ' + (r.tabungan < 0 ? 'neg' : '') + '">' + rp(r.tabungan) + '</td></tr>').join('') + '</tbody></table></div>' +
    '<div class="banner mt12"><div class="micro" style="color:#a1bbff">Saldo tabungan bersih hak anggota</div><div style="font-size:30px;font-weight:700" class="num" id="c-total">' + rp(net) + '</div><div class="small" style="opacity:.85" id="c-note"></div></div>' +
    '<div class="grid g2 mt16" style="gap:12px"><div class="field"><label for="c-alasan">Alasan pencairan</label><select class="input" id="c-alasan" name="alasan"><option>Purna</option><option>Mengundurkan diri</option><option>Pindah</option><option>Meninggal</option></select></div>' +
    '<div class="field"><label for="c-tgl">Tanggal</label><input class="input" type="date" id="c-tgl" name="tanggal" value="' + todayStr() + '"></div></div>' +
    '<div class="field"><label for="c-adj">Penyesuaian (+/−, opsional)</label><input class="input" id="c-adj" name="penyesuaian" data-rupiah inputmode="numeric" placeholder="0"><div class="hint">Mis. pinjaman/klaim yang disepakati rapat. Gunakan tanda minus untuk pengurang.</div></div>' +
    '<div class="field"><label for="c-cat">Catatan</label><input class="input" id="c-cat" name="catatan" maxlength="150"></div>' +
    '<div class="field"><label for="c-file">Bukti serah terima / BAST (foto atau PDF, opsional)</label><input class="input" type="file" id="c-file" accept="image/*,application/pdf" style="padding-top:10px"></div>');
  bindRupiah(d.dlg);
  const upd = () => { const adj = parseRupiah($('#c-adj', d.el).value), fin = net + adj; $('#c-total', d.el).textContent = rp(fin); $('#c-note', d.el).textContent = fin > 0 ? 'Akan dicatat sebagai pengeluaran pos Tabungan dan status anggota diperbarui.' : 'Saldo minus/nol — tidak ada pencairan. Status anggota tetap diperbarui dan selisih dicatat.'; };
  $('#c-adj', d.el).addEventListener('input', upd); upd();
  d.setFooter('<button class="btn soft" data-act="close">Batal</button><button class="btn dark" data-act="go">' + ic('check-circle') + 'Konfirmasi Pencairan</button>');
  d.dlg.querySelector('.dialog-foot').classList.add('row2');
  d.el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act="go"]'); if (!b) return;
    const v = formVals(d.dlg), fin = net + (v.penyesuaian || 0);
    if (!await confirmDlg('Cairkan tabungan <b>' + esc(nama) + '</b> sebesar <b>' + rp(Math.max(fin, 0)) + '</b>?<br><span class="small muted">Tindakan ini tidak dapat dibatalkan dari aplikasi.</span>', { title: 'Konfirmasi pencairan', okText: 'Ya, cairkan', danger: true })) return;
    b.disabled = true; const o = b.innerHTML; b.innerHTML = '<span class="spin"></span>';
    try {
      let bukti = '';
      const f = $('#c-file', d.el).files[0];
      if (f) bukti = await uploadBukti(f);
      const r = await api('pencairan', { idAnggota: id, alasan: v.alasan, tanggal: v.tanggal, penyesuaian: v.penyesuaian, catatan: v.catatan, bukti });
      if (!r.success) return toast(r.message, 'error');
      d.close(); toast(r.message); dataChanged(['dashboard', 'pos']); AG.list = null; refreshPage('anggota');
    } catch (err) { toast(err.message, 'error'); } finally { if (!d.closed) { b.disabled = false; b.innerHTML = o; } }
  });
}

/* ---- Form anggota & impor ---- */
function memberDialog(r) {
  r = r || {};
  const units = (AppState.boot.units || []);
  const d = openDialog({
    title: r.id ? 'Ubah Data Anggota' : 'Tambah Anggota',
    body: '<div class="field"><label for="f-nama">Nama lengkap + gelar *</label><input class="input" id="f-nama" name="nama" value="' + esc(r.nama || '') + '" maxlength="120" autocomplete="off"></div>' +
      '<div class="grid g2" style="gap:12px"><div class="field"><label for="f-nira">NIRA / No. anggota</label><input class="input" id="f-nira" name="nira" value="' + esc(r.nira || '') + '" inputmode="numeric"></div><div class="field"><label for="f-nip">NIP</label><input class="input" id="f-nip" name="nip" value="' + esc(r.nip || '') + '" inputmode="numeric"></div></div>' +
      '<div class="field"><label for="f-unit">Unit / ruangan</label><input class="input" id="f-unit" name="unit" list="unit-list" value="' + esc(r.unit || '') + '"><datalist id="unit-list">' + units.map((u) => '<option value="' + esc(u) + '">').join('') + '</datalist></div>' +
      '<div class="field"><label for="f-wa">No. WhatsApp</label><input class="input" id="f-wa" name="wa" value="' + esc(r.wa || '') + '" inputmode="tel" placeholder="08xxxxxxxxxx"><div class="hint">Format otomatis dijadikan 62xxxxxxxx.</div></div>' +
      '<div class="grid g2" style="gap:12px"><div class="field"><label for="f-st">Status</label><select class="input" id="f-st" name="status">' + ['Aktif', 'Nonaktif', 'Purna', 'Berhenti'].map((s) => '<option' + (r.status === s ? ' selected' : '') + '>' + s + '</option>').join('') + '</select></div><div class="field"><label for="f-tgl">Tanggal bergabung</label><input class="input" type="date" id="f-tgl" name="tglBergabung" value="' + esc(r.tglBergabung || '') + '"></div></div>' +
      '<div class="field"><label for="f-cat">Catatan</label><input class="input" id="f-cat" name="catatan" value="' + esc(r.catatan || '') + '" maxlength="250"></div>',
    footer: '<button class="btn soft" data-act="close">Batal</button><button class="btn dark" data-act="save">' + ic('check') + 'Simpan</button>', footRow: true,
    actions: {
      save: async () => {
        const v = formVals(d.dlg);
        if (!v.nama) return fieldErr($('#f-nama', d.el), 'Nama wajib diisi.');
        const res = await api('anggotaSave', Object.assign({ id: r.id }, v));
        if (!res.success) return toast(res.message, 'error');
        d.close(); toast(res.message); dataChanged(['dashboard', 'iuran']); AG.list = null; AG.tabData = null; refreshPage('anggota');
      }
    }
  });
}

function importAnggotaDialog() {
  const d = openDialog({
    title: 'Impor Daftar Anggota', wide: true, sub: 'Unggah berkas <b>Excel (.xlsx)</b> atau CSV, atau tempel langsung dari Excel. Kolom berurutan: <b>Nama, NIRA, NIP, Unit, No WA</b>. Baris judul dilewati otomatis.',
    body: '<div class="field"><label for="a-file">Berkas Excel / CSV (opsional)</label><input class="input" type="file" id="a-file" accept=".xlsx,.csv,.txt,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" style="padding-top:10px"><div class="hint">Tips Excel: format kolom NIRA, NIP, dan No WA sebagai <b>Teks</b> agar angka nol di depan dan 18 digit NIP tidak berubah. <a href="#" id="a-tpl">Unduh contoh format</a></div></div>' +
      '<div class="field"><label for="a-txt">Data anggota (satu baris per anggota)</label><textarea class="input" id="a-txt" rows="9" placeholder="Ns. Dewi Sartika, S.Kep;3516008721;198804122012012003;ICU;081234567890"></textarea><div class="hint" id="a-cnt">0 baris terbaca</div></div>',
    footer: '<button class="btn soft" data-act="close">Batal</button><button class="btn dark" data-act="go">' + ic('upload') + 'Impor Anggota</button>', footRow: true,
    actions: {
      go: async () => {
        const rows = parseMembers($('#a-txt', d.el).value);
        if (!rows.length) return toast('Belum ada data yang terbaca.', 'error');
        const res = await api('anggotaImport', { rows });
        if (!res.success) return toast(res.message, 'error');
        d.close(); toast(res.message + (res.data.dilewati.length ? ' ' + res.data.dilewati.length + ' dilewati (sudah ada).' : ''));
        dataChanged(['dashboard', 'iuran']); AG.list = null; refreshPage('anggota');
      }
    }
  });
  const upd = () => { $('#a-cnt', d.el).textContent = parseMembers($('#a-txt', d.el).value).length + ' baris terbaca'; };
  $('#a-txt', d.el).addEventListener('input', upd);
  $('#a-file', d.el).addEventListener('change', async (e) => { const f = e.target.files[0]; if (!f) return; try { $('#a-txt', d.el).value = await readTableFile(f); upd(); toast($('#a-cnt', d.el).textContent + ' dari ' + f.name); } catch (err) { toast(err.message, 'error'); e.target.value = ''; } });
  $('#a-tpl', d.el).addEventListener('click', (e) => { e.preventDefault(); downloadCSV('contoh-impor-anggota.csv', ['Nama', 'NIRA', 'NIP', 'Unit', 'No WA'], [['Ns. Dewi Sartika, S.Kep', '3516008721', '198804122012012003', 'ICU', '081234567890'], ['Bambang Utami, A.Md.Kep', '3516008722', '', 'IGD', '081234567891']]); });
}
function parseMembers(text) {
  text = String(text || '').trim();
  let rows;
  if (!text) rows = [];
  else if (!/[;\t]/.test(text) && (text.split(/\r?\n/)[0].match(/,/g) || []).length < 4) rows = text.split(/\r?\n/).filter((l) => l.trim()).map((l) => [l]);  // hanya daftar nama (koma = bagian gelar)
  else rows = parseCSV(text + '\n');
  const out = [];
  rows.forEach((c, i) => {
    c = c.map((x) => x.trim());
    if (i === 0 && /^(no\.?|nama)/i.test(c[0]) && /nama|nira|nip/i.test(c.join(' '))) return;
    let nama = c[0], off = 0;
    if (/^\d+$/.test(c[0]) && c[1]) { nama = c[1]; off = 1; }
    if (!nama || !/[a-zA-Z]/.test(nama)) return;
    out.push({ nama, nira: c[1 + off] || '', nip: c[2 + off] || '', unit: c[3 + off] || '', wa: c[4 + off] || '' });
  });
  return out;
}

registerPage('anggota', {
  template: () => '<div class="page-head"><div><h1 class="h-lg">Data Anggota & Tabungan</h1><p class="muted">Kelola nakes & saldo tabungan kumulatif</p></div><div class="actions" id="ag-actions"></div></div>' +
    '<div class="seg" role="tablist"><button role="tab" data-tab="daftar" aria-selected="true">' + ic('users', 'ic-sm') + 'Daftar Anggota</button><button role="tab" data-tab="tabungan" aria-selected="false">' + ic('piggy', 'ic-sm') + 'Tabungan Kumulatif</button></div>' +
    '<div class="card mt16"><div class="row wrap" style="gap:10px"><label class="search grow" style="min-width:220px">' + ic('search') + '<input id="ag-q" type="search" placeholder="Cari NIRA, NIP, atau nama…" aria-label="Cari anggota"></label><select class="input" id="ag-unit" style="width:auto;min-width:200px" aria-label="Filter unit"></select><span id="ag-tahun-wrap" hidden><select class="input" id="ag-tahun" style="width:auto" aria-label="Tahun"></select></span></div><div class="mt8" id="ag-sum"></div></div>' +
    '<div class="mt16" id="ag-body">' + skeleton(3) + '</div>',
  init(el) {
    $('#ag-q', el).addEventListener('input', debounce((e) => { AG.q = e.target.value.trim(); AG.limit = 40; renderAnggota(el); }, 250));
    $('#ag-unit', el).addEventListener('change', (e) => { AG.unit = e.target.value; AG.limit = 40; renderAnggota(el); });
    $('#ag-tahun', el).addEventListener('change', (e) => { AG.tahun = Number(e.target.value); AG.tabData = null; this.show(el); });
    if (isAdmin()) $('#ag-actions', el).innerHTML = '<button class="btn soft" data-act="import">' + ic('upload') + 'Impor</button><button class="btn dark" data-act="add">' + ic('user-plus') + 'Tambah Anggota</button>';
    el.addEventListener('click', (e) => {
      const t = e.target.closest('[data-tab]'); if (t) { AG.tab = t.dataset.tab; AG.limit = 40; AG.onlyMinus = false; this.show(el); return; }
      const b = e.target.closest('[data-act]'); if (!b) return;
      const card = b.closest('[data-id]'), id = card && card.dataset.id, a = b.dataset.act;
      const m = id && ((AG.list || []).find((x) => x.id === id) || ((AG.tabData && AG.tabData.rows) || []).find((x) => x.id === id));
      if (a === 'add') memberDialog(); else if (a === 'edit' && m) memberDialog(AG.list.find((x) => x.id === id)); else if (a === 'import') importAnggotaDialog();
      else if (a === 'buku' && m) bukuDialog(id, m.nama); else if (a === 'cair' && m) cairDialog(id, m.nama);
      else if (a === 'more') { AG.limit += 40; renderAnggota(el); } else if (a === 'onlyminus') { AG.onlyMinus = !AG.onlyMinus; renderAnggota(el); }
      else if (a === 'retry') this.show(el, null, { force: true });
    });
  },
  show(el, _, opt) {
    opt = opt || {};
    if (AppState.anggotaTab) { AG.tab = AppState.anggotaTab; AppState.anggotaTab = null; }
    if (AppState.pendingSearch) { AG.q = AppState.pendingSearch; $('#ag-q', el).value = AG.q; AppState.pendingSearch = null; }
    if (!AG.tahun) AG.tahun = AppState.boot.tahun;
    $('#ag-tahun', el).innerHTML = yearOptions(AG.tahun);
    $$('[data-tab]', el).forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === AG.tab));
    const err = (r) => { $('#ag-body', el).innerHTML = retryBox(r.message, 'retry'); };
    if (AG.tab === 'daftar') swr('ang:list', 'anggotaList', {}, (d) => { AG.list = d; renderAnggota(el); }, { force: opt.force, fresh: 60000, onError: err });
    else swr('tab:' + AG.tahun, 'tabunganList', { tahun: AG.tahun }, (d) => { AG.tabData = d; renderAnggota(el); }, { force: opt.force, fresh: 30000, onError: err });
  }
});

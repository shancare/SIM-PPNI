'use strict';
/* ===== IURAN & AUTO DEBIT ===== */
const IU = { periode: null, filter: 'Semua', q: '', unit: '', limit: 40, data: null, members: null };

function iuranCounts(rows) {
  const c = { Semua: rows.length, Gagal: 0, 'Lunas Manual': 0, Berhasil: 0, Pending: 0, rp: 0, gagalRp: 0 };
  rows.forEach((r) => { c[r.status]++; if (r.status === 'Berhasil' || r.status === 'Lunas Manual') c.rp += r.nominal; if (r.status === 'Gagal') c.gagalRp += r.nominal; });
  return c;
}
function waText(r) {
  const tpl = AppState.boot.settings.TEMPLATE_WA, nom = AppState.boot.settings.NOMINAL_IURAN;
  return fillTpl(tpl, { nama: r.nama, bulan: bulanLabel(IU.periode), nominal: rp(r.nominal || nom), alasan: r.alasan ? ' (' + r.alasan + ')' : '' });
}
function saveIuranCache() { if (IU.data) Store.set(userKey('iur:' + IU.periode), { t: Date.now(), h: hashStr(JSON.stringify(IU.data)), data: IU.data }); }

function iuranCard(r) {
  const cls = { Gagal: 'st-gagal', Berhasil: 'st-ok', 'Lunas Manual': 'st-manual', Pending: 'st-pending' }[r.status];
  const mon = BULAN[Number(IU.periode.slice(5, 7)) - 1].toUpperCase();
  let h = '<article class="mrow ' + cls + '" data-id="' + esc(r.id) + '"><div class="row-between" style="align-items:flex-start"><div class="grow"><div class="name">' + esc(r.nama) + '</div>' +
    '<div class="sub">NIRA ' + esc(r.nira || '-') + (r.unit ? ' · ' + esc(r.unit) : '') + '</div><div class="mt8" style="margin-top:8px">' + statusBadge(r.status) + '</div></div>' +
    '<div style="text-align:right"><div class="cur ' + (r.status === 'Gagal' ? 'neg' : r.status === 'Berhasil' ? 'pos' : '') + '">' + rp(r.nominal || AppState.boot.settings.NOMINAL_IURAN) + '</div><div class="micro">Iuran ' + mon + '</div></div></div>';
  if (r.status === 'Gagal') {
    h += '<div class="notice bad">' + ic('alert-triangle', 'ic-sm') + '<span>Gagal auto debit' + (r.alasan ? ': ' + esc(r.alasan) : '') + '</span></div>';
    h += '<div class="small muted mt8" style="margin-top:8px">' + (r.dihubungi ? '<span class="pos">' + ic('check', 'ic-sm') + ' Dihubungi ' + fmtDate(r.dihubungi) + '</span>' : 'Belum dihubungi') + '</div>';
    h += '<div class="actions2">' + (r.wa ? '<button class="btn wa" data-act="wa">' + ic('wa') + (r.dihubungi ? 'Kirim Pengingat Ulang' : 'Hubungi via WA') + '</button>' : '<button class="btn soft" disabled title="No. WhatsApp belum diisi">' + ic('wa') + 'No. WA kosong</button>') +
      (isAdmin() ? '<button class="btn soft" data-act="manual">' + ic('cash') + 'Lunas Manual</button>' : '<span></span>') + '</div>';
  } else if (r.status === 'Lunas Manual') {
    h += '<div class="notice info">' + ic('receipt', 'ic-sm') + '<span>' + esc(r.metode) + ' · ' + fmtDate(r.tglBayar) + (r.catatan ? ' · ' + esc(r.catatan) : '') + '</span></div>';
  } else if (r.status === 'Berhasil') {
    h += '<div class="small muted mt8" style="margin-top:8px">' + ic('check-circle', 'ic-sm') + ' Terdebit ' + esc(AppState.boot.settings.BANK_NAMA) + ': ' + fmtDate(r.tglBayar) + (r.batch ? ' · Batch ' + esc(r.batch) : '') + '</div>';
  } else if (isAdmin()) {
    h += '<div class="actions2"><button class="btn soft" data-act="manual">' + ic('cash') + 'Lunas Manual</button><span></span></div>';
  }
  return h + '</article>';
}

function renderIuran(el) {
  const d = IU.data; if (!d) return;
  const c = iuranCounts(d.rows), tot = c.Berhasil + c['Lunas Manual'] + c.Gagal;
  const pBer = c.Semua ? Math.round(((c.Berhasil + c['Lunas Manual']) / c.Semua) * 1000) / 10 : 0;
  $('#iu-month', el).textContent = bulanLabel(IU.periode);
  $('#iu-next', el).disabled = IU.periode >= periodeNow();
  $('#iu-sum', el).innerHTML =
    '<div class="card-flat" style="background:var(--ok-bg)"><div class="micro pos">' + ic('check-circle', 'ic-sm') + ' ' + (c.Berhasil + c['Lunas Manual']) + ' Terbayar</div><div class="big-num pos" style="font-size:22px">' + pBer + '%</div><div class="small muted">' + rp(c.rp) + '</div></div>' +
    '<div class="card-flat" style="background:var(--bad-bg)"><div class="micro neg">' + ic('alert-circle', 'ic-sm') + ' ' + c.Gagal + ' Gagal</div><div class="big-num neg" style="font-size:22px">' + (c.Semua ? Math.round((c.Gagal / c.Semua) * 1000) / 10 : 0) + '%</div><div class="small muted">' + rp(c.gagalRp) + '</div></div>' +
    '<div class="card-flat"><div class="micro">' + ic('clock', 'ic-sm') + ' ' + c.Pending + ' Pending</div><div class="big-num" style="font-size:22px">' + (c.Semua ? Math.round((c.Pending / c.Semua) * 1000) / 10 : 0) + '%</div><div class="small muted">' + (c.Pending ? 'Belum ada data bank' : 'Semua terproses') + '</div></div>';
  $('#iu-chips', el).innerHTML = ['Semua', 'Gagal', 'Lunas Manual', 'Berhasil', 'Pending'].map((f) => '<button class="chip' + (f === 'Gagal' ? ' bad' : '') + '" data-f="' + f + '" aria-pressed="' + (IU.filter === f) + '">' + f + ' <span class="num" style="opacity:.8">(' + c[f] + ')</span></button>').join('');
  const q = IU.q.toLowerCase();
  const rows = d.rows.filter((r) => (IU.filter === 'Semua' || r.status === IU.filter) && (!IU.unit || r.unit === IU.unit) && (!q || (r.nama + ' ' + r.nira + ' ' + r.nip + ' ' + r.unit).toLowerCase().indexOf(q) > -1))
    .sort((a, b) => (a.status === 'Gagal' ? 0 : 1) - (b.status === 'Gagal' ? 0 : 1) || a.nama.localeCompare(b.nama));
  $('#iu-list', el).innerHTML = rows.length ? rows.slice(0, IU.limit).map(iuranCard).join('') + pager(Math.min(IU.limit, rows.length), rows.length, 'more') : emptyState('search', d.rows.length ? 'Tidak ada anggota yang cocok dengan filter.' : 'Belum ada data anggota. Tambahkan di menu Anggota.');
  const g = $('#iu-bar', el);
  g.hidden = !(c.Gagal > 0);
  g.innerHTML = '<div class="row" style="gap:12px"><span class="initial bad">' + ic('users', 'ic-sm') + '</span><div class="grow"><b>' + c.Gagal + ' Anggota Gagal</b><div class="small" style="opacity:.8">' + bulanLabel(IU.periode) + ' · ' + rp(c.gagalRp) + '</div></div><button class="btn wa" data-act="all">' + ic('send') + 'Hubungi Semua</button></div>';
  const us = $('#iu-unit', el); const units = Array.from(new Set(d.rows.map((r) => r.unit).filter(Boolean))).sort();
  us.innerHTML = '<option value="">Semua unit/ruangan</option>' + units.map((u) => '<option' + (u === IU.unit ? ' selected' : '') + '>' + esc(u) + '</option>').join('');
}

async function contactMember(r) {
  window.open(waLink(r.wa, waText(r)), '_blank', 'noopener');
  const now = todayStr() + ' ' + new Date().toTimeString().slice(0, 5);
  r.dihubungi = now; r.dihubungiOleh = AppState.user.email;
  const el = $('#view .page[data-page="iuran"]'); if (el) renderIuran(el);
  saveIuranCache();
  const res = await api('iuranContact', { periode: IU.periode, idAnggota: r.id });
  if (!res.success) toast('Catatan kontak tidak tersimpan: ' + res.message, 'error');
}

function manualDialog(r) {
  const d = openDialog({
    title: 'Tandai Lunas Manual', sub: esc(r.nama) + ' · ' + bulanLabel(IU.periode) + ' · <b>' + rp(r.nominal || AppState.boot.settings.NOMINAL_IURAN) + '</b>',
    body: '<div class="lbl" style="margin-bottom:8px">Metode pembayaran</div><div class="stack" style="margin-bottom:14px"><label class="opt"><input type="radio" name="metode" value="Tunai" checked>' + ic('cash') + '<div><div class="title">Tunai / Cash Bendahara</div><div class="small muted">Setor langsung ke bendahara</div></div></label>' +
      '<label class="opt"><input type="radio" name="metode" value="Transfer">' + ic('landmark') + '<div><div class="title">Transfer Bank</div><div class="small muted">Transfer ke rekening organisasi</div></div></label></div>' +
      '<div class="field"><label for="m-tgl">Tanggal penerimaan</label><input class="input" type="date" id="m-tgl" name="tanggal" value="' + todayStr() + '" max="' + todayStr() + '"></div>' +
      '<div class="field"><label for="m-cat">Keterangan / ID referensi (opsional)</label><input class="input" id="m-cat" name="catatan" maxlength="150" placeholder="mis. Transfer BCA a.n. …"></div>',
    footer: '<button class="btn soft" data-act="close">Batal</button><button class="btn dark" data-act="save">' + ic('check-circle') + 'Simpan & Tandai Lunas</button>', footRow: true,
    actions: {
      save: async () => {
        const v = formVals(d.dlg);
        const res = await api('iuranMark', { periode: IU.periode, idAnggota: r.id, metode: v.metode, tanggal: v.tanggal, catatan: v.catatan, nominal: r.nominal });
        if (!res.success) return toast(res.message, 'error');
        Object.assign(r, res.data); d.close(); toast(res.message);
        dataChanged(['dashboard']); saveIuranCache();
        const el = $('#view .page[data-page="iuran"]'); renderIuran(el);
      }
    }
  });
}

function waQueueDialog() {
  const gagal = IU.data.rows.filter((r) => r.status === 'Gagal');
  const draw = () => gagal.map((r) => '<div class="row" style="padding:10px 0;border-top:1px solid var(--ice)"><div class="grow"><div class="title" style="font-size:14px">' + esc(r.nama) + '</div><div class="small muted">' + esc(r.unit || '-') + (r.alasan ? ' · ' + esc(r.alasan) : '') + '</div></div>' +
    (r.dihubungi ? '<span class="badge ok">' + ic('check', 'ic-sm') + 'Dihubungi</span>' : '') + (r.wa ? '<button class="btn wa sm" data-act="send" data-id="' + esc(r.id) + '">' + ic('wa', 'ic-sm') + (r.dihubungi ? 'Ulang' : 'Kirim') + '</button>' : '<span class="badge warn">No. WA kosong</span>') + '</div>').join('');
  const tpl = AppState.boot.settings.TEMPLATE_WA;
  const d = openDialog({
    title: 'Penagihan via WhatsApp', badge: '<span class="badge info">' + gagal.length + ' anggota gagal · ' + bulanLabel(IU.periode) + '</span>', wide: true,
    sub: 'Browser hanya mengizinkan satu jendela WhatsApp per ketukan. Ketuk <b>Kirim</b> pada tiap anggota — statusnya otomatis tercatat.',
    body: '<div class="field"><label for="tpl">Template pesan' + (isAdmin() ? '' : ' (hanya Admin yang dapat mengubah)') + '</label><textarea class="input" id="tpl" rows="4" ' + (isAdmin() ? '' : 'readonly') + '>' + esc(tpl) + '</textarea>' +
      '<div class="hint">Variabel: <code>{nama}</code> <code>{bulan}</code> <code>{nominal}</code> <code>{alasan}</code></div>' + (isAdmin() ? '<button class="btn soft sm mt8" data-act="tpl" style="margin-top:8px">' + ic('check', 'ic-sm') + 'Simpan template</button>' : '') + '</div>' +
      '<div class="card-flat"><div class="micro">Pratinjau</div><p id="tpl-pv" class="mt8" style="margin-top:6px;white-space:pre-wrap"></p></div><div id="q-list" class="mt12">' + draw() + '</div>',
    footer: '<button class="btn dark" data-act="close">Selesai</button>',
    actions: {
      tpl: async () => {
        const v = $('#tpl', d.el).value.trim(); if (!v) return toast('Template tidak boleh kosong.', 'error');
        const res = await api('settingsSave', { settings: { TEMPLATE_WA: v } });
        if (!res.success) return toast(res.message, 'error');
        AppState.boot.settings.TEMPLATE_WA = v; Store.set(userKey('boot'), { t: Date.now(), data: AppState.boot }); toast('Template tersimpan.'); pv();
      },
      send: (e, c, b) => {}
    },
    onMount: (c) => pv(c)
  });
  function pv(c) { c = c || d; const sample = gagal[0] || { nama: 'Ns. Contoh', alasan: '', nominal: 100000 }; const live = $('#tpl', c.el).value; $('#tpl-pv', c.el).textContent = fillTpl(live, { nama: sample.nama, bulan: bulanLabel(IU.periode), nominal: rp(sample.nominal), alasan: sample.alasan ? ' (' + sample.alasan + ')' : '' }); }
  $('#tpl', d.el).addEventListener('input', () => pv());
  // tombol kirim memakai delegasi sendiri (tanpa spinner, karena membuka tab baru)
  d.el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act="send"]'); if (!b) return; e.stopPropagation();
    const r = gagal.find((x) => x.id === b.dataset.id); if (!r) return;
    const live = $('#tpl', d.el).value;
    window.open(waLink(r.wa, fillTpl(live, { nama: r.nama, bulan: bulanLabel(IU.periode), nominal: rp(r.nominal), alasan: r.alasan ? ' (' + r.alasan + ')' : '' })), '_blank', 'noopener');
    r.dihubungi = todayStr() + ' ' + new Date().toTimeString().slice(0, 5);
    $('#q-list', d.el).innerHTML = draw(); saveIuranCache(); renderIuran($('#view .page[data-page="iuran"]'));
    api('iuranContact', { periode: IU.periode, idAnggota: r.id });
  }, true);
}

/* ---- Impor laporan bank ---- */
function parseCSV(text) {
  const first = text.split(/\r?\n/)[0] || '';
  const delim = [';', '\t', ','].map((d) => [d, first.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === delim) { row.push(cur); cur = ''; }
    else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (ch !== '\r') cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}
function bankFileToLists(text) {
  const ber = [], gag = [], REASON = /(saldo|tidak|rekening|blokir|pasif|cukup|dormant|insufficient|rejected|limit|closed|ditutup|invalid)/i;
  const all = parseCSV(text).map((r) => r.map((c) => c.trim()));
  // Cari judul kolom: Nama / Alasan (bila ada) agar pemilihan kolom pasti
  let nameCol = -1, reasonCols = [];
  for (let i = 0; i < Math.min(all.length, 8) && nameCol < 0; i++) {
    const j = all[i].findIndex((c) => /^(nama|name|nama nasabah|nasabah|nama anggota|atas nama|nama rekening)$/i.test(c));
    if (j > -1) { nameCol = j; reasonCols = all[i].map((c, k) => (/^(alasan|keterangan|ket\.?|reason|remark|remarks|pesan|catatan|kode gagal)$/i.test(c) ? k : -1)).filter((k) => k > -1); }
  }
  all.forEach((cells) => {
    const joined = cells.join(' ');
    const isG = /(gagal|fail|tolak|reject|insufficient|saldo tidak|dormant|pasif|blokir)/i.test(joined);
    const isB = /(berhasil|sukses|success|\bok\b|lunas|terdebit)/i.test(joined);
    if (!isG && !isB) return;
    const isLabel = (c) => /^(gagal|berhasil|sukses|success|fail|ok)$/i.test(c);
    let nameCell = nameCol > -1 ? cells[nameCol] : '';
    if (!nameCell) nameCell = cells.filter((c) => /[a-zA-Z]{3,}/.test(c) && !isLabel(c) && !REASON.test(c)).sort((x, y) => y.length - x.length)[0] || cells.filter((c) => /[a-zA-Z]{3,}/.test(c) && !isLabel(c)).sort((x, y) => y.length - x.length)[0];
    if (!nameCell || nameCell === 'Nama' || /^nama$/i.test(nameCell)) return;
    if (isG) {
      const alasan = (reasonCols.length ? reasonCols.map((k) => cells[k] || '') : cells.filter((c) => c !== nameCell && /[a-zA-Z]{4,}/.test(c) && !isLabel(c) && !/^(gagal|fail)/i.test(c))).filter(Boolean).join(' ').slice(0, 80);
      gag.push(nameCell + (alasan ? ' | ' + alasan : ''));
    } else ber.push(nameCell);
  });
  return { ber, gag };
}
const linesOf = (t, withReason) => String(t || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean).map((s) => { const p = s.split(/\s*[|\t]\s*/); return withReason ? { nama: p[0], alasan: p.slice(1).join(' ') } : { nama: p[0] }; });

async function importDialog() {
  const per = IU.periode;
  const d = openDialog({
    title: 'Impor Rekap Bank', sub: 'Tempel daftar nama dari laporan auto debit bank, atau unggah berkas CSV. Satu nama per baris.', wide: true,
    body: '<div class="grid g2" style="gap:12px"><div class="field"><label for="i-per">Periode iuran</label><input class="input" type="month" id="i-per" name="periode" value="' + per + '" max="' + periodeNow() + '"></div>' +
      '<div class="field"><label for="i-tgl">Tanggal debit</label><input class="input" type="date" id="i-tgl" name="tanggal" value="' + per + '-' + String(AppState.boot.settings.TGL_AUTODEBIT || 10).padStart(2, '0') + '"></div></div>' +
      '<div class="field"><label for="i-file">Unggah berkas Excel/CSV dari bank (opsional)</label><input class="input" type="file" id="i-file" accept=".xlsx,.csv,.txt,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" style="padding-top:10px"><div class="hint">Baris yang mengandung kata "gagal/sukses" akan dipisah otomatis. Periksa hasilnya sebelum melanjutkan.</div></div>' +
      '<div class="field"><label for="i-ber">Daftar BERHASIL</label><textarea class="input" id="i-ber" name="ber" rows="5" placeholder="Ns. Hendra Kurniawan, A.Md.Kep&#10;Siti Rahmawati"></textarea></div>' +
      '<div class="field"><label for="i-gag">Daftar GAGAL — format: Nama | alasan</label><textarea class="input" id="i-gag" name="gag" rows="5" placeholder="Dewi Sartika | Saldo tidak cukup&#10;Bambang Prakoso | Rekening pasif"></textarea></div>' +
      '<label class="check"><input type="checkbox" name="sisa" id="i-sisa"><span>Anggota aktif yang <b>tidak disebut</b> di kedua daftar dianggap <b>berhasil</b><br><span class="hint">Berguna jika bank hanya mengirim daftar yang gagal.</span></span></label>',
    footer: '<button class="btn soft" data-act="close">Batal</button><button class="btn dark" data-act="check">' + ic('search') + 'Periksa Data</button>', footRow: true,
    actions: { check: () => doPreview() }
  });
  $('#i-file', d.el).addEventListener('change', async (e) => {
    const f = e.target.files[0]; if (!f) return;
    let txt; try { txt = await readTableFile(f); } catch (err) { e.target.value = ''; return toast(err.message, 'error'); }
    const { ber, gag } = bankFileToLists(txt);
    if (!ber.length && !gag.length) return toast('Tidak ada baris yang dikenali. Isi daftar secara manual.', 'error');
    $('#i-ber', d.el).value = ber.join('\n'); $('#i-gag', d.el).value = gag.join('\n'); toast(ber.length + ' berhasil, ' + gag.length + ' gagal terbaca.');
  });
  $('#i-per', d.el).addEventListener('change', (e) => { if (e.target.value) $('#i-tgl', d.el).value = e.target.value + '-' + String(AppState.boot.settings.TGL_AUTODEBIT || 10).padStart(2, '0'); });

  async function doPreview() {
    const v = formVals(d.dlg);
    if (!/^\d{4}-\d{2}$/.test(v.periode)) return fieldErr($('#i-per', d.el), 'Pilih periode.');
    const berhasil = linesOf(v.ber), gagal = linesOf(v.gag, true);
    if (!berhasil.length && !gagal.length) return toast('Isi minimal satu daftar nama.', 'error');
    const res = await api('iuranImportPreview', { berhasil, gagal });
    if (!res.success) return toast(res.message, 'error');
    if (!IU.members) { const m = await api('anggotaList'); IU.members = m.success ? m.data : []; }
    step2(v, berhasil, gagal, res.data);
  }
  function step2(v, berhasil, gagal, p) {
    const un = p.berhasil.unmatched.map((x) => Object.assign({ jenis: 'Berhasil' }, x)).concat(p.gagal.unmatched.map((x) => Object.assign({ jenis: 'Gagal' }, x)));
    const opts = (x) => '<option value="">— Lewati (jangan dicatat) —</option>' + (x.kandidat.length ? '<optgroup label="Kandidat">' + x.kandidat.map((k) => '<option value="' + esc(k.id) + '">' + esc(k.nama) + '</option>').join('') + '</optgroup>' : '') + '<optgroup label="Semua anggota">' + IU.members.map((m) => '<option value="' + esc(m.id) + '">' + esc(m.nama) + '</option>').join('') + '</optgroup>';
    d.setBody('<div class="grid g2" style="gap:10px"><div class="card-flat" style="background:var(--ok-bg)"><div class="micro pos">Cocok · Berhasil</div><div class="big-num pos">' + p.berhasil.matched.length + '</div></div><div class="card-flat" style="background:var(--bad-bg)"><div class="micro neg">Cocok · Gagal</div><div class="big-num neg">' + p.gagal.matched.length + '</div></div></div>' +
      '<div class="notice ' + (un.length ? '' : 'ok') + '" style="' + (un.length ? 'background:var(--warn-bg);color:#7a4100' : '') + '">' + ic(un.length ? 'alert-triangle' : 'check-circle', 'ic-sm') + '<span>' + (un.length ? '<b>' + un.length + ' nama perlu dicocokkan manual</b> — pilih anggota yang dimaksud.' : 'Semua nama cocok dengan data anggota.') + '</span></div>' +
      (v.sisa ? '<div class="notice info">' + ic('info', 'ic-sm') + '<span>' + p.sisaTanpaLaporan + ' anggota aktif tidak disebut → dicatat <b>berhasil</b>.</span></div>' : (p.sisaTanpaLaporan ? '<div class="notice info">' + ic('info', 'ic-sm') + '<span>' + p.sisaTanpaLaporan + ' anggota aktif tidak ada di laporan → tetap <b>Pending</b>.</span></div>' : '')) +
      (un.length ? '<div class="mt12">' + un.map((x, i) => '<div class="field" style="margin-bottom:10px"><label for="u' + i + '"><span class="badge ' + (x.jenis === 'Gagal' ? 'bad' : 'ok') + '">' + x.jenis + '</span> &nbsp;“' + esc(x.nama) + '”</label><select class="input" id="u' + i + '" data-nm="' + esc(x.nama) + '">' + opts(x) + '</select></div>').join('') + '</div>' : ''));
    d.setFooter('<button class="btn soft" data-act="back">Kembali</button><button class="btn dark" data-act="commit">' + ic('check-circle') + 'Simpan Impor</button>');
    d.el.querySelector('.dialog-foot').classList.add('row2');
    ACT.back = () => { d.close(); importDialog(); };
    ACT.commit = async () => {
      const resolved = {}; $$('select[data-nm]', d.el).forEach((s) => { if (s.value) resolved[s.dataset.nm] = s.value; });
      const res = await api('iuranImportCommit', { periode: v.periode, tanggal: v.tanggal, berhasil, gagal, resolved, sisaBerhasil: !!v.sisa });
      if (!res.success) return toast(res.message, 'error');
      d.close(); toast(res.message);
      IU.periode = v.periode; dataChanged(['dashboard']); refreshPage('iuran');
    };
  }
  const ACT = d.__act = {};
  const orig = d.el.__click;
  d.el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]'); if (!b || !ACT[b.dataset.act]) return;
    b.disabled = true; const o = b.innerHTML; b.innerHTML = '<span class="spin"></span>';
    try { await ACT[b.dataset.act](); } finally { if (!d.closed) { b.disabled = false; b.innerHTML = o; } }
  });
}

registerPage('iuran', {
  template: () => '<div class="page-head"><div><h1 class="h-lg">Iuran & Auto Debit</h1><p class="muted">Rekonsiliasi laporan bank dan tindak lanjut tunggakan anggota</p></div><div class="actions" id="iu-actions"></div></div>' +
    '<div class="card"><div class="row-between wrap"><div class="month-nav"><button class="btn soft icon" id="iu-prev" aria-label="Bulan sebelumnya">' + ic('chev-l') + '</button><span class="cur-month">' + ic('calendar', 'ic-sm') + '<span id="iu-month"></span></span><button class="btn soft icon" id="iu-next" aria-label="Bulan berikutnya">' + ic('chev-r') + '</button></div>' +
    '<span class="badge mute" id="iu-count"></span></div><div class="grid g3 mt12" id="iu-sum" style="gap:10px"><div class="skel sk-card"></div><div class="skel sk-card"></div><div class="skel sk-card"></div></div></div>' +
    '<div class="banner mt16" id="iu-import" hidden><div class="row-between wrap" style="gap:12px"><div class="row" style="gap:12px"><span class="initial" style="background:rgba(255,255,255,.16);color:#fff">' + ic('upload') + '</span><div><div class="title">Impor Rekap Bank ' + '</div><div class="small" style="opacity:.85">Sinkronisasi hasil auto debit (CSV / tempel daftar nama)</div></div></div><button class="btn" style="background:#fff;color:#0d47a1" data-act="import">' + ic('upload', 'ic-sm') + 'Impor</button></div></div>' +
    '<div class="card mt16"><div class="row wrap" style="gap:10px"><label class="search grow" style="min-width:220px">' + ic('search') + '<input id="iu-q" type="search" placeholder="Cari nama, NIRA, atau ruangan…" aria-label="Cari anggota"></label><select class="input" id="iu-unit" style="width:auto;min-width:200px" aria-label="Filter unit"></select></div><div class="chips mt12" id="iu-chips"></div></div>' +
    '<div class="mt16" id="iu-list">' + skeleton(3) + '</div>' +
    '<div id="iu-bar" hidden style="position:sticky;bottom:76px;margin-top:16px;z-index:20;background:var(--primary);color:#fff;border-radius:16px;padding:10px 12px;box-shadow:var(--sh2)"></div>',
  init(el) {
    $('#iu-prev', el).onclick = () => { IU.periode = shiftPeriode(IU.periode, -1); IU.limit = 40; this.show(el); };
    $('#iu-next', el).onclick = () => { IU.periode = shiftPeriode(IU.periode, 1); IU.limit = 40; this.show(el); };
    $('#iu-q', el).addEventListener('input', debounce((e) => { IU.q = e.target.value.trim(); IU.limit = 40; renderIuran(el); }, 250));
    $('#iu-unit', el).addEventListener('change', (e) => { IU.unit = e.target.value; IU.limit = 40; renderIuran(el); });
    el.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-f]'); if (chip) { IU.filter = chip.dataset.f; IU.limit = 40; renderIuran(el); return; }
      const b = e.target.closest('[data-act]'); if (!b) return;
      const card = b.closest('[data-id]'), r = card && IU.data.rows.find((x) => x.id === card.dataset.id), a = b.dataset.act;
      if (a === 'wa' && r) contactMember(r);
      else if (a === 'manual' && r) manualDialog(r);
      else if (a === 'all') waQueueDialog();
      else if (a === 'import') importDialog();
      else if (a === 'more') { IU.limit += 40; renderIuran(el); }
      else if (a === 'retry') this.show(el, null, { force: true });
    });
    if (isAdmin()) { $('#iu-import', el).hidden = false; }
  },
  show(el, _, opt) {
    opt = opt || {};
    if (!IU.periode) IU.periode = AppState.boot.periode;
    if (AppState.iuranFilter) { IU.filter = AppState.iuranFilter; AppState.iuranFilter = null; }
    const p = IU.periode;
    swr('iur:' + p, 'iuranList', { periode: p }, (data) => { if (data.periode !== IU.periode) return; IU.data = data; $('#iu-count', el).textContent = data.rows.length + ' anggota'; renderIuran(el); }, { force: opt.force, fresh: 30000, onError: (r) => { $('#iu-list', el).innerHTML = retryBox(r.message, 'retry'); } });
    if (AppState.openImport) { AppState.openImport = false; if (isAdmin()) setTimeout(importDialog, 50); }
  }
});

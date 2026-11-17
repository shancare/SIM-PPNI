'use strict';
/* ===== LAPORAN: tampil, unduh CSV (dibuka Excel), cetak/PDF ===== */
const LAP = { jenis: 'iuran_bulanan', periode: null, tahun: null, data: null };
const LAP_JENIS = [
  { k: 'iuran_bulanan', t: 'Iuran Bulanan', p: 'periode' },
  { k: 'iuran_tahunan', t: 'Iuran Tahunan', p: 'tahun' },
  { k: 'pos', t: 'Pos Anggaran', p: 'tahun' },
  { k: 'tabungan', t: 'Tabungan Anggota', p: 'tahun' }
];

function lapCell(col, v) {
  if (col.t === 'rp') return rp(v);
  if (col.t === 'int') return String(v == null ? '' : v);
  return esc(v == null ? '' : v);
}
function lapRender(el) {
  const d = LAP.data; if (!d) return;
  $('#lp-head', el).innerHTML = '<div class="print-head"><b>' + esc(d.org) + '</b><br>' + esc(d.judul) + '<br><span>Dicetak ' + esc(d.dicetak) + ' oleh ' + esc(d.oleh) + '</span></div>';
  const note = d.catatan ? '<div class="banner-info small" style="margin-bottom:12px">' + esc(d.catatan) + '</div>' : '';
  $('#lp-body', el).innerHTML = note + d.sections.map((s) => {
    const num = (c) => (c.t === 'rp' || c.t === 'int') ? ' class="r num"' : '';
    const head = '<tr>' + s.columns.map((c) => '<th' + (c.t === 'rp' || c.t === 'int' ? ' class="r"' : '') + '>' + esc(c.k) + '</th>').join('') + '</tr>';
    const body = s.rows.map((r) => '<tr>' + s.columns.map((c, i) => '<td' + num(c) + '>' + lapCell(c, r[i]) + '</td>').join('') + '</tr>').join('');
    const foot = s.footer ? '<tfoot><tr>' + s.columns.map((c, i) => '<td' + num(c) + ' style="font-weight:700">' + lapCell(c, s.footer[i]) + '</td>').join('') + '</tr></tfoot>' : '';
    return (s.title ? '<h3 class="h-sm" style="margin:16px 0 8px">' + esc(s.title) + '</h3>' : '') +
      (s.rows.length ? '<div class="tbl-wrap"><table class="tbl"><thead>' + head + '</thead><tbody>' + body + '</tbody>' + foot + '</table></div>' : emptyState('file', 'Tidak ada data untuk periode ini.'));
  }).join('');
}
function lapParam() { const j = LAP_JENIS.find((x) => x.k === LAP.jenis); return j.p === 'periode' ? { jenis: LAP.jenis, periode: LAP.periode } : { jenis: LAP.jenis, tahun: LAP.tahun }; }
function lapFilename(ext) { const j = LAP_JENIS.find((x) => x.k === LAP.jenis); return 'laporan-' + LAP.jenis + '-' + (j.p === 'periode' ? LAP.periode : LAP.tahun) + '.' + ext; }

registerPage('laporan', {
  template: () => '<div class="page-head"><div><h1 class="h-lg">Laporan</h1><p class="muted">Rekap iuran, pos anggaran, dan tabungan — unduh untuk Excel atau cetak PDF</p></div>' +
    '<div class="actions"><button class="btn soft" data-act="csv">' + ic('download', 'ic-sm') + 'Unduh Excel (CSV)</button><button class="btn dark" data-act="pdf">' + ic('printer', 'ic-sm') + 'Cetak / PDF</button></div></div>' +
    '<div class="card noprint"><div class="chips" id="lp-chips" role="group" aria-label="Jenis laporan"></div>' +
    '<div class="row wrap mt12" style="gap:10px"><label class="small muted" for="lp-per" id="lp-lbl">Periode</label><input type="month" class="input" id="lp-per" style="width:auto"><select class="input" id="lp-th" style="width:auto" hidden aria-label="Tahun"></select></div></div>' +
    '<div class="card mt16"><div id="lp-head"></div><div id="lp-body">' + skeleton(2) + '</div></div>',
  init(el) {
    $('#lp-chips', el).innerHTML = LAP_JENIS.map((j) => '<button class="chip" data-act="jenis" data-k="' + j.k + '" aria-pressed="false">' + j.t + '</button>').join('');
    $('#lp-per', el).addEventListener('change', (e) => { if (e.target.value) { LAP.periode = e.target.value; this.show(el); } });
    $('#lp-th', el).addEventListener('change', (e) => { LAP.tahun = Number(e.target.value); this.show(el); });
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act;
      if (a === 'jenis') { LAP.jenis = b.dataset.k; LAP.data = null; this.show(el); }
      else if (a === 'retry') this.show(el, null, { force: true });
      else if (a === 'pdf') { if (!LAP.data) return toast('Laporan belum siap.', 'error'); el.classList.add('printing'); const t = document.title; document.title = lapFilename('pdf').replace('.pdf', ''); window.print(); document.title = t; setTimeout(() => el.classList.remove('printing'), 500); }
      else if (a === 'csv') {
        if (!LAP.data) return toast('Laporan belum siap.', 'error');
        LAP.data.sections.forEach((s, i) => downloadCSV(i ? lapFilename('csv').replace('.csv', '-' + (i + 1) + '.csv') : lapFilename('csv'), s.columns.map((c) => c.k), s.rows.concat(s.footer ? [s.footer] : [])));
      }
    });
  },
  show(el, _, opt) {
    opt = opt || {};
    if (AppState.laporanJenis) { LAP.jenis = AppState.laporanJenis; AppState.laporanJenis = null; LAP.data = null; }
    if (!LAP.periode) LAP.periode = AppState.boot.periode || periodeNow();
    if (!LAP.tahun) LAP.tahun = AppState.boot.tahun;
    const j = LAP_JENIS.find((x) => x.k === LAP.jenis), perMode = j.p === 'periode';
    $$('#lp-chips .chip', el).forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.k === LAP.jenis)));
    $('#lp-per', el).hidden = !perMode; $('#lp-th', el).hidden = perMode; $('#lp-lbl', el).textContent = perMode ? 'Periode' : 'Tahun';
    $('#lp-per', el).value = LAP.periode; $('#lp-th', el).innerHTML = yearOptions(LAP.tahun);
    if (!LAP.data) $('#lp-body', el).innerHTML = skeleton(2);
    const p = lapParam();
    swr('lap:' + p.jenis + ':' + (p.periode || p.tahun), 'laporan', p, (d) => { if (LAP.jenis === p.jenis) { LAP.data = d; lapRender(el); } }, { force: opt.force, fresh: 30000, onError: (r) => { $('#lp-body', el).innerHTML = retryBox(r.message, 'retry'); } });
  }
});

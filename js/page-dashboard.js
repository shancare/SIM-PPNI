'use strict';
/* ===== DASHBOARD ===== */
const AKSI_LABEL = {
  LOGIN: 'Masuk ke aplikasi', IURAN_IMPOR: 'Impor laporan bank', IURAN_LUNAS_MANUAL: 'Tandai lunas manual', IURAN_DIHUBUNGI: 'Menghubungi anggota',
  ANGGOTA_TAMBAH: 'Anggota ditambah', ANGGOTA_UBAH: 'Data anggota diubah', ANGGOTA_IMPOR: 'Impor data anggota', POS_TAMBAH: 'Pos anggaran ditambah', POS_UBAH: 'Pos anggaran diubah',
  PENGELUARAN_TAMBAH: 'Pengeluaran dicatat', PENGELUARAN_UBAH: 'Pengeluaran diubah', PENGELUARAN_HAPUS: 'Pengeluaran dihapus', ALOKASI_SIMPAN: 'Alokasi tahunan disimpan',
  ALOKASI_TIMPA: 'Alokasi tahunan direvisi', PENCAIRAN: 'Pencairan tabungan', USER_SIMPAN: 'Pengguna diubah', PENGATURAN: 'Pengaturan diubah', UNGGAH_BUKTI: 'Bukti diunggah'
};
const POS_COLORS = ['#0d47a1', '#1976d2', '#42a5f5', '#90caf9', '#5c6bc0', '#26a69a', '#8d6e63'];

function trendChart(trend, max) {
  const W = 560, H = 230, pl = 8, pb = 34, pt = 26, n = trend.length, bw = Math.min(54, (W - pl * 2) / n - 22), gap = (W - pl * 2) / n;
  const ch = H - pb - pt, y = (v) => pt + ch - (v / max) * ch;
  let s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Tren pembayaran iuran 6 bulan terakhir">';
  s += '<line x1="' + pl + '" y1="' + (pt + ch) + '" x2="' + (W - pl) + '" y2="' + (pt + ch) + '" stroke="#90caf9" stroke-width="1"/>';
  trend.forEach((t, i) => {
    const x = pl + gap * i + (gap - bw) / 2, tot = t.berhasil + t.gagal, hb = (t.berhasil / max) * ch, hg = (t.gagal / max) * ch;
    const lbl = BULAN[Number(t.periode.slice(5, 7)) - 1].slice(0, 3) + " '" + t.periode.slice(2, 4);
    s += '<g><title>' + bulanLabel(t.periode) + ': ' + t.berhasil + ' berhasil, ' + t.gagal + ' gagal (' + rp(t.rp) + ')</title>';
    if (tot > 0) {
      s += '<rect x="' + x + '" y="' + (pt + ch - hb) + '" width="' + bw + '" height="' + hb + '" rx="4" fill="#1976d2"/>';
      if (t.gagal > 0) s += '<rect x="' + x + '" y="' + (pt + ch - hb - hg) + '" width="' + bw + '" height="' + Math.max(hg, 3) + '" rx="3" fill="#c62828"/>';
      s += '<text x="' + (x + bw / 2) + '" y="' + (y(tot) - 7) + '" text-anchor="middle" font-size="11" font-weight="700" fill="#0d47a1">' + Math.round((t.berhasil / tot) * 1000) / 10 + '%</text>';
    } else s += '<text x="' + (x + bw / 2) + '" y="' + (pt + ch - 8) + '" text-anchor="middle" font-size="11" fill="#78909c">–</text>';
    s += '<text x="' + (x + bw / 2) + '" y="' + (H - 12) + '" text-anchor="middle" font-size="12" fill="#546e7a">' + lbl + '</text></g>';
  });
  return s + '</svg>';
}

function dashHtml(d) {
  const u = AppState.user, per = d.periode, cur = d.bulanIni;
  const pct = d.target ? Math.min(100, (cur.rp / d.target) * 100) : 0;
  const totalPos = (d.pos || []).reduce((a, p) => a + p.saldoKumulatif, 0);
  const posPos = (d.pos || []).filter((p) => p.saldoKumulatif > 0);
  const sumPos = posPos.reduce((a, p) => a + p.saldoKumulatif, 0) || 1;
  const max = Math.max(d.anggotaAktif, 1, ...d.trend.map((t) => t.berhasil + t.gagal));
  const sukses = cur.berhasil + cur.gagal ? Math.round((cur.berhasil / (cur.berhasil + cur.gagal)) * 1000) / 10 : 0;
  const avg = d.trend.filter((t) => t.berhasil + t.gagal > 0);
  const avgSukses = avg.length ? Math.round(avg.reduce((a, t) => a + t.berhasil / (t.berhasil + t.gagal), 0) / avg.length * 1000) / 10 : 0;

  let h = '<div class="card row-between wrap"><div class="row" style="gap:14px"><div class="initial" style="width:48px;height:48px">' + esc(initials(u.nama || u.email)) + '</div><div><h1 class="h-sm">Selamat datang, ' + esc(u.nama || u.email) + '</h1><p class="muted small">' + esc(AppState.boot.settings.NAMA_ORG) + ' · <span class="badge info">' + esc(u.peran) + '</span></p></div></div>' +
    '<button class="btn soft sm" data-act="refresh">' + ic('refresh', 'ic-sm') + 'Segarkan</button></div>';

  h += '<div class="grid g4 mt16">' +
    '<div class="card stat"><div class="top"><span class="micro">Total anggota aktif</span><span class="ico">' + ic('users') + '</span></div><div class="big-num">' + d.anggotaAktif + ' <span class="small muted" style="font-weight:500">Perawat</span></div><div class="small muted">' + d.unit + ' unit kerja</div></div>' +
    '<div class="card stat"><div class="top"><span class="micro">Realisasi iuran ' + esc(BULAN[Number(per.slice(5, 7)) - 1]) + '</span><span class="ico ok">' + ic('cash') + '</span></div><div class="big-num" style="font-size:24px">' + rp(cur.rp) + '</div><div class="progress dark"><i style="width:' + pct + '%"></i></div><div class="row-between small muted"><span>' + Math.round(pct * 10) / 10 + '% dari target</span><span>Target ' + rp(d.target) + '</span></div></div>' +
    '<div class="card stat"><div class="top"><span class="micro">Gagal auto debit</span><span class="ico bad">' + ic('alert-triangle') + '</span></div><div class="big-num neg">' + cur.gagal + ' <span class="small muted" style="font-weight:500">Anggota</span></div><div class="small">' + rp(cur.gagalRp) + (d.pending ? ' · <span class="muted">' + d.pending + ' belum ada data</span>' : '') + '</div>' +
    (cur.gagal ? '<button class="btn wa sm" data-act="wa">' + ic('wa', 'ic-sm') + 'Tindaklanjuti via WA</button>' : '<span class="notice ok" style="margin:0">' + ic('check-circle', 'ic-sm') + 'Tidak ada tunggakan</span>') + '</div>' +
    '<div class="card stat"><div class="top"><span class="micro">Total saldo kas semua pos</span><span class="ico">' + ic('landmark') + '</span></div><div class="big-num" style="font-size:24px">' + rp(totalPos) + '</div><div class="small muted">' + (d.pos || []).length + ' pos akun</div></div></div>';

  h += '<div class="banner mt16"><div class="row-between wrap" style="gap:16px"><div class="grow" style="min-width:240px"><span class="tag">' + ic('lock', 'ic-sm') + 'Dana titipan khusus</span>' +
    '<div class="row wrap mt12" style="gap:8px 16px"><div style="font-size:15px;opacity:.9">Dana tabungan wajib anggota</div><div style="font-size:28px;line-height:34px;font-weight:700" class="num">' + rp(d.danaTabungan) + '</div></div>' +
    '<p class="small mt8" style="opacity:.8">Hak anggota yang wajib dijaga dan dicairkan saat purna atau berhenti. Dihitung terpisah dari kas operasional pos.</p></div>' +
    '<div style="background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);border-radius:12px;padding:12px 14px;min-width:220px"><div class="row" style="gap:8px;font-weight:600">' + ic('alert-circle', 'ic-sm') + d.jumlahMinus + ' anggota saldo tabungan minus</div>' +
    '<div class="small mt8" style="opacity:.85">' + d.belumPenuh + ' anggota belum membayar penuh tahun ini</div><button class="btn sm mt12" style="background:#fff;color:#0d47a1" data-act="tab">Lihat rincian</button></div></div></div>';

  h += '<div class="split mt16"><div class="stack"><div class="card"><div class="row-between wrap"><div><h2 class="h-sm">Tren pembayaran & keberhasilan auto debit</h2><p class="small muted">6 bulan terakhir sampai ' + bulanLabel(per) + '</p></div>' +
    '<div class="legend"><span><i style="background:#1976d2"></i>Berhasil</span><span><i style="background:#c62828"></i>Gagal</span></div></div><div class="mt12">' + trendChart(d.trend, max) + '</div>' +
    '<div class="grid g3 mt12"><div class="card-flat"><div class="micro">Rata-rata sukses</div><div class="title mt8" style="margin-top:4px">' + avgSukses + '%</div></div><div class="card-flat"><div class="micro">Iuran per anggota</div><div class="title" style="margin-top:4px">' + rp(d.nominal) + ' / bln</div></div><div class="card-flat"><div class="micro">Bulan ini</div><div class="title" style="margin-top:4px">' + sukses + '% sukses</div></div></div></div>';

  if (isAdmin() && d.log) {
    h += '<div class="card"><div class="row-between"><h2 class="h-sm">Log aktivitas terkini</h2><span class="micro" style="color:var(--blue)">Audit trail</span></div><div class="mt12">' +
      (d.log.length ? d.log.map((l) => '<div class="row" style="align-items:flex-start;padding:8px 0;border-top:1px solid var(--ice)"><span class="initial" style="width:32px;height:32px;font-size:11px">' + esc(initials(l.email.split('@')[0])) + '</span><div class="grow"><div class="title" style="font-size:13px">' + esc(AKSI_LABEL[l.aksi] || l.aksi) + '</div><div class="small muted" style="word-break:break-word">' + esc(l.detail) + '</div><div class="small muted">' + fmtDate(l.waktu) + ' · ' + esc(l.email) + '</div></div></div>').join('') : '<p class="muted small">Belum ada aktivitas.</p>') + '</div></div>';
  }
  h += '</div><div class="stack"><div class="card"><h2 class="h-sm">Komposisi pos anggaran ' + d.tahun + '</h2><p class="small muted">Total saldo ' + rp(totalPos) + '</p>' +
    '<div class="stackbar mt12" role="img" aria-label="Komposisi saldo per pos">' + posPos.map((p, i) => '<i style="width:' + (p.saldoKumulatif / sumPos) * 100 + '%;background:' + POS_COLORS[i % POS_COLORS.length] + '"></i>').join('') + '</div><div class="mt12">' +
    (d.pos || []).map((p, i) => '<div class="comp"><span class="dot" style="background:' + POS_COLORS[i % POS_COLORS.length] + '"></span><div class="grow"><div class="title" style="font-size:13px">' + esc(p.nama) + '</div><div class="small muted">' + (p.jenis === 'Tabungan' ? 'Hak anggota · dilindungi' : 'Operasional') + '</div></div><div style="text-align:right"><div class="num" style="font-weight:700;' + (p.saldoKumulatif < 0 ? 'color:var(--bad)' : '') + '">' + rp(p.saldoKumulatif) + '</div><div class="small muted">' + (p.saldoKumulatif > 0 ? Math.round((p.saldoKumulatif / sumPos) * 1000) / 10 + '%' : '–') + '</div></div></div>').join('') + '</div></div>' +
    '<div class="card"><h2 class="h-sm">Aksi cepat</h2><div class="stack mt12">' +
    (isAdmin() ? '<button class="btn wa block" data-act="wa" ' + (cur.gagal ? '' : 'disabled') + '>' + ic('send') + 'Follow-up WA ' + cur.gagal + ' anggota gagal</button><button class="btn soft block" data-act="imp">' + ic('upload') + 'Impor laporan bank</button>' : '') +
    '<button class="btn soft block" data-act="exp">' + ic('receipt') + 'Catat pengeluaran pos</button><button class="btn soft block" data-act="lap">' + ic('download') + 'Unduh laporan rekap</button></div></div></div></div>';
  return h;
}

registerPage('dashboard', {
  template: () => '<div id="dash-body"><div class="skel sk-card"></div><div class="grid g4 mt16"><div class="skel sk-card"></div><div class="skel sk-card"></div><div class="skel sk-card"></div><div class="skel sk-card"></div></div></div>',
  init(el) {
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const a = b.dataset.act;
      if (a === 'refresh') { this.show(el, null, { force: true }); toast('Memuat data terbaru…'); }
      else if (a === 'wa') { AppState.iuranFilter = 'Gagal'; go('iuran'); }
      else if (a === 'imp') { AppState.openImport = true; go('iuran'); }
      else if (a === 'tab') { AppState.anggotaTab = 'tabungan'; go('anggota'); }
      else if (a === 'exp') openExpenseDialog();
      else if (a === 'lap') go('laporan');
      else if (a === 'retry') this.show(el, null, { force: true });
    });
  },
  show(el, _, opt) {
    opt = opt || {};
    const per = AppState.boot.periode, body = $('#dash-body', el);
    if (!Store.get(userKey('dash:' + per), null) && AppState.boot.dashboard) body.innerHTML = dashHtml(AppState.boot.dashboard);
    swr('dash:' + per, 'dashboard', { periode: per }, (d) => { body.innerHTML = dashHtml(d); }, { force: opt.force, fresh: 30000, onError: (r) => { body.innerHTML = retryBox(r.message, 'retry'); } });
  }
});

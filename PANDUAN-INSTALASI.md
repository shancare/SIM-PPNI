# Panduan Instalasi SIM-IURAN PPNI

Ada 2 bagian: **A. Backend (Google Apps Script)** dan **B. Frontend (GitHub Pages)**. Login memakai username + sandi (tanpa Google/OAuth).

## A. Backend — Google Apps Script
1. Buka https://script.google.com → **Proyek baru**. Beri nama `SIM-IURAN PPNI`.
2. Hapus isi `Kode.gs` bawaan, tempel seluruh isi file **Kode.gs** (dikirim terpisah). Simpan.
3. (Disarankan) ⚙ **Project Settings** → centang **Show "appsscript.json" manifest file**. Buka `appsscript.json`, ganti isinya dengan file **appsscript.json** yang dikirim. Simpan.
4. Pilih fungsi **`setupAppEnvironment`** → **Jalankan**. Izinkan akses (Review permissions → akun Anda → Advanced → Go to … → Allow).
5. Buka **Log eksekusi**. **Catat username `admin` dan sandi yang tampil — sandi hanya muncul sekali** (disimpan terenkripsi, tidak bisa dilihat lagi).
6. **Deploy → New deployment** → ⚙ → **Web app** → *Execute as:* **Me**, *Who has access:* **Anyone** → Deploy → salin **Web app URL** (berakhiran `/exec`).

**Sudah pernah setup versi lama (login Google)?** Tempel kode baru, Simpan, pilih **`resetSandiAdmin`** → Jalankan → catat sandi barunya di Log eksekusi, lalu **Deploy → Manage deployments → ✏ → New version → Deploy**. Akun lama yang berupa email tetap ada di sheet *Pengguna*; Anda bisa menambah akun baru lewat menu Pengaturan atau `resetSandi('namauser')`.

**Lupa sandi?** Pilih `resetSandiAdmin` (atau panggil `resetSandi('username')`) di editor Apps Script → Jalankan → sandi baru di Log eksekusi. Salah sandi 5× mengunci akun 15 menit.

## B. Frontend — GitHub Pages
**Folder kerja = folder hasil ekstraksi ZIP `sim-iuran-ppni`** (di dalamnya langsung terlihat `index.html`, `css`, `js`). Di folder inilah `git init` dijalankan — jangan masuk lebih dalam, jangan naik satu level.

1. Ekstrak ZIP. Buka `js/config.js` dengan Notepad, isi:
   ```js
   window.APP_CONFIG = { GAS_URL: 'URL /exec dari langkah A6' };
   ```
2. Buat repository **Public** baru di GitHub (jangan centang README/.gitignore/license).
3. Buka PowerShell/Terminal di folder tersebut (Windows: buka folder di File Explorer → klik address bar → ketik `powershell` → Enter). Cek dengan `dir` — **`index.html` harus tampak di daftar teratas**.
4. Jalankan satu per satu:
   ```bash
   git init
   git add .
   git commit -m "Upload pertama"
   git branch -M main
   git remote add origin https://github.com/USERNAME/NAMA-REPO.git
   git push -u origin main
   ```
   Saat diminta password, tempel **Personal Access Token** (GitHub → Settings → Developer settings → Tokens (classic) → scope `repo`). Layar tidak menampilkan apa pun saat menempel — itu normal.
5. Di repo: **Settings → Pages** → Source *Deploy from a branch* → `main` / `(root)` → Save → centang **Enforce HTTPS**. Tunggu 1–2 menit, buka `https://USERNAME.github.io/NAMA-REPO/`.

## Cara memperbarui
- **Frontend:** ubah file → `git add .` → `git commit -m "pesan"` → `git push` → Ctrl+Shift+R di browser.
- **Backend:** tempel kode baru → Simpan → **Deploy → Manage deployments → ✏ Edit → Version: New version → Deploy**. (Jangan *New deployment*, URL akan berubah.)

## Pemakaian awal
1. Masuk dengan `admin` + sandi dari Log → **ganti sandi** (ikon avatar → Ganti sandi) → menu **Pengaturan**: cek nama organisasi, nominal, tahun aktif, nama bank; tambahkan pengurus (username + sandi awal) dan Admin ke-2.
2. **Data Anggota → Impor**: tempel daftar 260 anggota (Nama, NIRA, Unit, WA).
3. **Pos Anggaran → Kelola Pos**: ubah nama Pos ke-4.
4. **Iuran → Impor Rekap Bank** tiap bulan; anggota gagal → tombol **Hubungi via WA**.
5. Setiap Januari: **Pos Anggaran → Alokasi Tahunan** → isi potongan tiap pos → Kunci. Sisa otomatis menjadi tabungan anggota.
6. Anggota purna/berhenti: **Data Anggota → Tabungan → Cairkan**.

## Pemecahan masalah
| Gejala | Penyebab / solusi |
|---|---|
| Halaman login: "Konfigurasi belum lengkap" | `js/config.js` belum diisi |
| "Username atau sandi salah" | Cek huruf kecil/besar sandi; lupa → `resetSandi` di editor |
| Menu hanya "lihat" / tombol Tambah tidak ada | Akun berperan Pengurus; ubah peran jadi Admin di Pengaturan → Pengguna |
| Situs 404 | `git init` dijalankan di folder yang salah; ulangi dari folder berisi `index.html` |
| Tampilan tanpa gaya | Struktur `css/` dan `js/` rusak (jangan upload lewat web GitHub) |
| Perubahan backend tidak terlihat | Belum *New version* pada Manage deployments |
| Data baru lambat muncul bila diedit langsung di Sheets | Gunakan tombol Segarkan di menu akun |

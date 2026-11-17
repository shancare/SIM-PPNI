# Panduan Instalasi SIM-IURAN PPNI

Ada 3 bagian: **A. Backend (Google Apps Script)**, **B. Login Google (Client ID)**, **C. Frontend (GitHub Pages)**. Kerjakan berurutan.

## A. Backend — Google Apps Script
1. Buka https://script.google.com → **Proyek baru**. Beri nama `SIM-IURAN PPNI`.
2. Hapus isi `Kode.gs` bawaan, tempel seluruh isi file **Kode.gs** (dikirim terpisah). Simpan.
3. (Disarankan) Klik ikon ⚙ **Project Settings** → centang **Show "appsscript.json" manifest file**. Buka `appsscript.json`, ganti isinya dengan file **appsscript.json** yang dikirim. Simpan.
4. Pilih fungsi **`setupAppEnvironment`** di menu atas → **Jalankan**. Izinkan akses (Review permissions → akun Anda → Advanced → Go to … → Allow).
   Hasil: folder Drive + spreadsheet database dibuat otomatis, akun Anda terdaftar sebagai **Admin pertama**, dan 4 pos awal terisi. Jalankan hanya sekali (aman bila terulang).
5. Lanjutkan ke bagian B untuk mendapatkan Client ID, lalu kembali ke sini.

## B. Login Google (OAuth Client ID)
1. Buka https://console.cloud.google.com → buat proyek baru (mis. `SIM-IURAN`).
2. **APIs & Services → OAuth consent screen** → External → isi nama aplikasi & email → Simpan. Tambahkan email pengurus sebagai *Test users* (atau klik *Publish app*).
3. **Credentials → Create credentials → OAuth client ID** → Application type **Web application**.
4. **Authorized JavaScript origins** → tambahkan `https://USERNAME.github.io` (ganti USERNAME dengan username GitHub Anda; tanpa garis miring di akhir).
5. Create → salin **Client ID** (berakhiran `.apps.googleusercontent.com`).
6. Kembali ke Apps Script: buka `Kode.gs`, pada editor fungsi `setGoogleClientId` butuh argumen, jadi tambahkan baris sementara di bawah file:
   ```js
   function pasangClientId() { setGoogleClientId('PASTE_CLIENT_ID_DI_SINI'); }
   ```
   Pilih `pasangClientId` → Jalankan. Setelah sukses, baris itu boleh dihapus.
7. **Deploy → New deployment** → ikon ⚙ → **Web app**. *Execute as:* **Me**, *Who has access:* **Anyone**. Deploy → salin **Web app URL** (berakhiran `/exec`).

## C. Frontend — GitHub Pages
**Folder kerja = folder hasil ekstraksi ZIP `sim-iuran-ppni`** (di dalamnya langsung terlihat `index.html`, `css`, `js`). Di folder inilah `git init` dijalankan — jangan masuk lebih dalam, jangan naik satu level.

1. Ekstrak ZIP. Buka `js/config.js` dengan Notepad, isi:
   ```js
   window.APP_CONFIG = { GAS_URL: 'URL /exec dari langkah A7', GOOGLE_CLIENT_ID: 'Client ID dari B5' };
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
6. Pastikan alamat itu sama dengan origin di B4 (hanya `https://USERNAME.github.io`).

## Cara memperbarui
- **Frontend:** ubah file → `git add .` → `git commit -m "pesan"` → `git push` → Ctrl+Shift+R di browser.
- **Backend:** tempel kode baru → Simpan → **Deploy → Manage deployments → ✏ Edit → Version: New version → Deploy**. (Jangan *New deployment*, URL akan berubah.)

## Pemakaian awal
1. Masuk dengan akun Google Admin pertama → menu **Pengaturan**: cek nama organisasi, nominal, tahun aktif, nama bank; tambahkan pengurus (email Google mereka) dan Admin ke-2.
2. **Data Anggota → Impor**: tempel daftar 260 anggota (Nama, NIRA, Unit, WA).
3. **Pos Anggaran → Kelola Pos**: ubah nama Pos ke-4.
4. **Iuran → Impor Rekap Bank** tiap bulan; anggota gagal → tombol **Hubungi via WA**.
5. Setiap Januari: **Pos Anggaran → Alokasi Tahunan** → isi potongan tiap pos → Kunci. Sisa otomatis menjadi tabungan anggota.
6. Anggota purna/berhenti: **Data Anggota → Tabungan → Cairkan**.

## Pemecahan masalah
| Gejala | Penyebab / solusi |
|---|---|
| Halaman login: "Konfigurasi belum lengkap" | `js/config.js` belum diisi |
| Tombol Google tidak muncul / error origin | Origin di B4 tidak sama dengan alamat situs |
| "Email belum terdaftar" | Tambahkan email di Pengaturan → Pengguna (oleh Admin) |
| Situs 404 | `git init` dijalankan di folder yang salah; ulangi dari folder berisi `index.html` |
| Tampilan tanpa gaya | Struktur `css/` dan `js/` rusak (jangan upload lewat web GitHub) |
| Perubahan backend tidak terlihat | Belum *New version* pada Manage deployments |
| Data baru lambat muncul bila diedit langsung di Sheets | Gunakan tombol Segarkan di menu akun |

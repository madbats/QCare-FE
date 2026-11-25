# QCare — Frontend Pasien & Portal Admin (React)

Website responsive QCare dalam satu project:

- **Portal pasien** (`/`): daftar akun, ambil nomor antrean online, pantau status antrean, lihat riwayat, dan kelola profil.
- **Portal admin** (`/admin`): kelola antrean real-time (panggil → layani → selesai), registrasi pasien di loket, jadwal & kuota dokter, data pasien, dokter, layanan, fasilitas, riwayat (ekspor CSV), dan akun admin. Detail di bagian [Portal admin](#portal-admin).

- **Stack:** React 19 + Vite, Redux Toolkit (`createAsyncThunk`), React Router v7 (data router), Axios.
- **Arsitektur:** mengikuti materi *React Redux State Management*: store → slice → thunk → Axios instance + interceptor, `ProtectedRoute`, `ErrorBoundary`, bootstrap sesi sekali di `RootLayout`.
- **Backend:** disesuaikan dengan repo `Projek-Akhir-QCARE-BE` (Express + Supabase). Untuk sementara backend **belum disambungkan**. Semua request dijawab *mock adapter* yang meniru endpoint, validasi, dan format respons backend.

---

## Menjalankan

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # hasil di folder dist/
```

Akun demo (mode simulasi):

| Portal | Alamat | Email | Password |
|---|---|---|---|
| Pasien | `/masuk` | demo@qcare.id | password123 |
| Admin | `/admin/masuk` | nadia.admin@qcare.id (juga fajar.loket@qcare.id, rina.loket@qcare.id) | admin123 |

Di halaman masuk pasien ada tombol "Isi otomatis"; di halaman masuk admin ada kartu "Masuk cepat akun demo". Data simulasi tersimpan di `localStorage` (`qcare_mock_db_v3`); hapus kunci itu untuk mengulang dari data awal.

### Menyambungkan ke backend asli

1. Jalankan backend (`npm run dev` di repo backend, port default **3000**).
2. Ubah `.env` di project ini:
   ```env
   VITE_API_URL=http://localhost:3000/api
   VITE_USE_MOCK=false
   ```
3. Restart `npm run dev`.

Kode halaman, slice, dan thunk tidak perlu diubah. Yang berganti hanya adapter Axios di `src/services/api.js` (pasien) dan `src/admin/api.js` (admin).

---

## Struktur folder

```
src/
├── app/store.js                  # configureStore (auth, catalog, queue, ui)
├── assets/                       # logo & ikon yang diekspor dari Figma
├── config/env.js                 # VITE_API_URL & VITE_USE_MOCK
├── services/
│   ├── api.js                    # Axios instance, Bearer token, handler 401
│   └── mock/                     # simulasi backend (db.js + adapter.js)
├── features/
│   ├── auth/authSlice.js         # register, login, bootstrap, profil
│   ├── catalog/catalogSlice.js   # fasilitas, layanan, dokter, jadwal + selectors
│   ├── queue/queueSlice.js       # buat, detail, progres, batal, riwayat antrean
│   └── ui/uiSlice.js             # aksesibilitas, panduan, toast
├── hooks/                        # useCatalog, useQueueNotifier
├── components/                   # Navbar, ProtectedRoute, ui, cards, dll.
├── layouts/                      # RootLayout, AuthLayout
├── pages/                        # Home, Services, FacilityDetail, QueueRegister,
│                                 # QueueTicket, History, Profile, Login, Register,
│                                 # ForgotPassword, NotFound
├── router/index.jsx
├── constants/patient.js          # kategori, kebutuhan khusus, encode/decode
├── utils/                        # format tanggal/rupiah, storage, status antrean
├── admin/                        # PORTAL ADMIN (lihat bagian Portal admin)
├── ErrorBoundary.jsx
├── index.css                     # design tokens + seluruh style (mobile-first)
└── main.jsx
```

## Halaman & rute (sesuai layar Figma)

| Rute | Layar Figma | Akses |
|---|---|---|
| `/masuk` | Login | Tamu |
| `/daftar` | Registrasi (+ field Kategori pasien) | Tamu |
| `/lupa-password` | Reset Password → OTP → kata sandi baru | Tamu |
| `/` | 01 • Beranda | Pasien |
| `/layanan` | 02 • Katalog Layanan (pencarian & chip filter disimpan di URL) | Pasien |
| `/fasilitas/:id` | 03 • Detail Fasilitas | Pasien |
| `/antrean/daftar` | 04 • Ambil Antrean + modal ringkasan | Pasien |
| `/antrean/:id` | 05 • Tiket Antrean (pemantauan otomatis) | Pasien |
| `/riwayat` | 06 • Riwayat | Pasien |
| `/profil` | 07 • Profil + modal Edit Profil, Notifikasi, Bantuan, Pengaturan | Pasien |

Navigasi bawah (Beranda · Layanan · Riwayat · Profil) dipakai di HP/tablet. Di layar ≥1024 px, navigasi yang sama pindah ke bar atas dan konten disusun 2 kolom.

## Endpoint backend yang dipakai

| Fitur | Method & endpoint |
|---|---|
| Registrasi pasien | `POST /pasien-auth/register` |
| Login pasien | `POST /pasien-auth/login` → `{ data, token }` |
| Profil | `GET /pasien/:id`, `PUT /pasien/:id` |
| Master data | `GET /fasilitas`, `/layanan`, `/dokter`, `/jadwal-dokter` |
| Ambil antrean | `POST /antrean` |
| Tiket / status | `GET /antrean/:id` |
| Batalkan antrean | `PUT /antrean/:id` `{ status_antrean: "dibatalkan" }` |
| Lupa password | `POST /password-reset/request` → `/verify` → `/reset` (role `pasien`) |

Token JWT dikirim lewat header `Authorization: Bearer <token>`. Jika server membalas 401, sesi dihapus dan pasien diarahkan ke `/masuk`.

---

## Penyesuaian di frontend

### Mengikuti user flow (board "User Flows")

- **Online Registration:** pilih fasilitas & poli → *Layanan tersedia?* (tidak: pesan + pilihan layanan lain) → isi jadwal, tanggal & kategori → *Data valid?* (tidak: bagian yang salah ditandai merah) → **ringkasan pendaftaran** → konfirmasi → nomor & status antrean.
- **Patient Categorization:** kategori → *Memerlukan bantuan khusus?* → kebutuhan pendampingan / akses / komunikasi → ringkasan di modal konfirmasi.
- **Queue Monitoring:** tiket → *Informasi tersedia?* (tidak: "status belum tersedia" + Coba lagi) → menunggu / dipanggil / selesai, diperbarui otomatis tiap 15 detik + notifikasi browser.
- **User Guidance:** panduan pop-up saat pertama masuk (bisa dibuka lagi dari Profil → Bantuan & Dukungan), ukuran teks & kontras tinggi di Profil → Pengaturan.

### Penyesuaian karena perbedaan desain ↔ backend

1. **Kategori pasien.** Figma memakai *Umum / Lansia / Disabilitas*, sedangkan backend terbaru (`pasienController`) hanya menerima `kategori_pasien` = `Umum | BPJS | Asuransi`. Frontend memakai dua dropdown bergaya komponen Figma: **Kategori Pasien** (Umum/BPJS/Asuransi → `kategori_pasien`) dan **Kelompok Pasien** (Umum/Anak/Lansia/Disabilitas → disimpan di `kebutuhan_khusus`, contoh `Kelompok: Lansia; Kursi roda`). *Rekomendasi backend:* kolom `kelompok_pasien`.
2. **Registrasi.** Backend mewajibkan `kategori_pasien`, padahal tidak ada di layar Registrasi → ditambahkan satu dropdown. Checkbox persetujuan dari desain dibuat wajib.
3. **Ambil Antrean.** Backend butuh `dokter_id` & `jadwal_dokter_id` → ditambahkan dropdown *Dokter & Jadwal Praktik*. *Nama Pasien* otomatis dari akun (backend mengambil pasien dari token). Pilihan tanggal hanya hari praktik & mulai besok (sesuai validasi backend).
4. **Login dengan Google** belum ada di backend → tombol tetap tampil sesuai desain, tetapi memberi info "belum tersedia".
5. **Jarak ("1,2 km") & chip "Terdekat"** butuh data lokasi yang tidak ada di backend → diganti jenis fasilitas dan chip "Buka hari ini".
6. **Riwayat antrean.** `GET /antrean` khusus admin → ID antrean pasien dicatat di perangkat lalu diambil lewat `GET /antrean/:id`. *Rekomendasi:* `GET /antrean/saya`.
7. **Nomor yang sedang dilayani & estimasi.** Belum ada endpoint untuk pasien → tampil di mode simulasi saja; dengan backend asli baris itu disembunyikan. *Rekomendasi:* `GET /antrean/:id/progres`.
8. **Ubah profil.** Validasi frontend disamakan dengan backend (nomor HP 8–20 karakter angka/+/-/spasi, tanggal lahir tidak di masa depan, jenis kelamin hanya dikirim bila dipilih).
9. **Tidak ada `/auth/me` & refresh token.** Sesi dipulihkan dari token tersimpan dan divalidasi lewat `GET /pasien/:id`; jika 401 pasien diarahkan ke `/masuk`.
10. Salah ketik di Figma "Paktis!" ditampilkan sebagai "Praktis!".

### Catatan desain

Token warna diambil dari variables Figma (Primary `#0340DA`, Secondary `#16A6A1`, Neutral `#343B4A/#778394/#F5F7FA`) dan dipusatkan di `:root` pada `src/index.css`. Logo dan ikon kunci diekspor dari file Figma (`src/assets/`); ikon navigasi bawah memakai Material Icons yang sama dengan desain. Logo masih resolusi 1×; untuk tampilan lebih tajam, timpa `src/assets/logo-qcare.png` dengan file logo asli. File Figma tidak diubah sama sekali.

---

## Portal admin

Mengikuti file Figma **QCare → halaman Admin** (22 layar mobile, Inter + Plus Jakarta Sans, palet teal/slate). Di layar ≥ 1024 px navigasi bawah berubah menjadi sidebar kiri dan kartu tampil dalam grid.

### Struktur

```
src/admin/
├── api.js                 # Axios admin + sesi admin terpisah (qcare_admin_session) + handler 401
├── store/
│   ├── adminAuthSlice.js  # login (POST /auth/login), bootstrap (GET /admin/:id), logout, sesi habis
│   └── adminDataSlice.js  # fetch/create/update/delete generik per resource + ubah status antrean
├── model.js               # hook useAdminResources (polling 15 dtk), selector antrean diperkaya, helper
├── ui.jsx                 # komponen dasar a-* (Pill, Btn, Card, Field, FilterChips, ConfirmDialog, …)
├── ResourceForm.jsx       # form tambah/ubah generik + forms.js (konfigurasi layar 16–20)
├── useQueueActions.js     # panggil / layani / selesai / batal antrean
├── useAdminAction.js      # jalankan aksi + toast sukses/gagal
├── AdminLayout.jsx        # header, sidebar desktop, navigasi bawah, guard sesi
├── admin.css              # seluruh style admin (prefix a-, mobile-first)
└── pages/                 # 22 layar
```

Sesi admin disimpan terpisah dari sesi pasien, jadi kedua portal bisa dibuka di browser yang sama. "Ingat perangkat ini" → `localStorage`, selain itu → `sessionStorage`. Token kedaluwarsa (401) → otomatis keluar ke `/admin/masuk` dengan pesan "Sesi berakhir".

### Layar & rute

| Figma | Rute |
|---|---|
| 01 Masuk | `/admin/masuk` (+ `/admin/lupa-password`, OTP) |
| 02 Dashboard | `/admin` |
| 03 Antrean Aktif | `/admin/antrean` (filter status, poli, kategori, tanggal, pencarian di URL) |
| 04 Registrasi Antrean | `/admin/antrean/baru` (`?pasien=` / `?layanan=` untuk isi otomatis) |
| 05 Nomor Antrean Terbit | `/admin/antrean/:id/terbit` (bisa dicetak) |
| 06 Pelayanan Pasien | `/admin/antrean/:id` |
| 21 Ubah / Batalkan Antrean | `/admin/antrean/:id/ubah` |
| 07 Jadwal Dokter · 18 Tambah Jadwal | `/admin/jadwal`, `/admin/jadwal/baru`, `/admin/jadwal/:id/ubah` |
| 08 Data Pasien · 09 Detail · 16 Tambah | `/admin/pasien`, `/admin/pasien/:id`, `/admin/pasien/baru`, `/admin/pasien/:id/ubah` |
| 10 Data Dokter · 17 Tambah | `/admin/dokter`, `/admin/dokter/baru`, `/admin/dokter/:id/ubah` |
| 11 Layanan Medis · 19 Tambah | `/admin/layanan`, `/admin/layanan/baru`, `/admin/layanan/:id/ubah` |
| 12 Fasilitas Klinik · 20 Tambah | `/admin/fasilitas`, `/admin/fasilitas/baru`, `/admin/fasilitas/:id/ubah` |
| 13 Riwayat Antrean | `/admin/riwayat` (rentang tanggal, status, ekspor CSV) |
| 14 Kelola Admin & Akun · 22 Reset Password | `/admin/akun`, `/admin/akun/:id/password` |
| 15 Menu Lainnya | `/admin/lainnya` |

### Endpoint backend yang dipakai admin

| Fitur | Endpoint |
|---|---|
| Masuk / cek sesi | `POST /auth/login`, `GET /admin/:id` |
| Lupa password | `POST /password-reset/request` → `/verify` → `/reset` (role `admin`) |
| Antrean | `GET /antrean`, `POST /antrean`, `PUT /antrean/:id` `{ status_antrean }` |
| Riwayat | `GET /riwayat-antrean`, `POST`/`PUT /riwayat-antrean/:id` (catatan pelayanan) |
| Master data | `GET/POST/PUT/DELETE` `/pasien`, `/dokter`, `/layanan`, `/fasilitas`, `/jadwal-dokter`, `/admin` |

### Penyesuaian desain ↔ backend (admin)

1. **Login pakai email**, bukan username. Tabel `admin` tidak punya kolom username; NIK, No. STR, dan kode antrean per poli (UMM-001, GIG-008) juga tidak ada di database, jadi tidak ditampilkan.
2. **Role "Super Admin / Staff Loket"** diganti satu role `admin`. Semua endpoint pengelolaan memakai `authorizeRole("admin")`, jadi role lain akan ditolak backend.
3. **Nomor antrean** dibuat backend (`A001`, `A002`, … per jadwal & tanggal). Form layanan tidak meminta kode antrean.
4. **Tanggal kunjungan** ditambahkan di registrasi loket karena backend mewajibkannya (harus setelah hari ini dan jatuh pada hari praktik). Kuota tersisa dihitung per tanggal; tanggal yang penuh tidak bisa dipilih.
5. **Jalur pendaftaran** dibaca dari `admin_id`: diisi → "Loket Admin", kosong → "Online Registration".
6. **Kelompok pasien** (Umum, Lansia, Anak, Ibu Hamil, Difabel) disimpan di `kebutuhan_khusus` dengan awalan `Kelompok: …`, sama seperti portal pasien. Kolom `kategori_pasien` tetap Umum/BPJS/Asuransi.
7. **Ubah jadwal antrean.** `PUT /antrean/:id` hanya mengubah status, jadi frontend mendaftarkan antrean baru di jadwal baru, membatalkan antrean lama, lalu mencatat alasannya di riwayat. Nomor antrean berganti.
8. **Catatan hasil pelayanan** disimpan di `keterangan` riwayat antrean (baris status Selesai/Dibatalkan).
9. **Fasilitas Klinik** dipetakan ke tabel `fasilitas_kesehatan` (nama, jenis, alamat, telepon, email). Tabel ini tidak punya status perbaikan, jadi tombol "Set Perbaikan" diganti "Lihat Layanan". Status "Tersedia/Belum siap" dihitung dari jumlah layanan & dokter aktif.
10. **Jadwal "Libur"** memakai kolom `aktif` (false = Libur). Status "Penuh" muncul bila kuota tanggal praktik berikutnya habis.
11. **Hapus data** yang masih dipakai (pasien dengan antrean, dokter/layanan dengan jadwal, fasilitas dengan layanan) ditolak dan pesannya ditampilkan. Untuk dokter/layanan disarankan "Nonaktifkan".
12. **Password admin** minimal 6 karakter saat dibuat/di-reset oleh admin (sesuai desain), minimal 8 karakter di alur lupa password (sesuai backend).
13. **Real-time** memakai polling tiap 15 detik (backend tidak punya websocket).

---

## Pengujian yang sudah dilakukan

Aplikasi di-build dan diklik otomatis di Chrome pada lebar 412 px (ukuran frame Figma) dan 1366 px, plus pengecekan tidak ada scroll horizontal di 320/390/768/1366 px. Skenario yang lolos: proteksi rute, validasi login & registrasi, registrasi → masuk, reset kata sandi via OTP, panduan pop-up, rekomendasi beranda, pencarian & filter katalog, detail fasilitas, layanan tidak tersedia → alternatif, data tidak valid → ditandai, ringkasan → buat antrean → tiket, kuota penuh → field tanggal ditandai, batalkan antrean, filter riwayat, edit profil (validasi & simpan), ukuran teks, logout, statistik pemantauan, serta mode backend asli (request ke `localhost:3000/api` dengan header Bearer).

**Portal admin** diuji otomatis di 412 px dan 1366 px (43 pengecekan per ukuran): proteksi rute, validasi & salah password, dashboard, panggil → layani → selesai dengan catatan, pencarian antrean, registrasi loket → nomor terbit, ubah jadwal (nomor baru) & batalkan antrean, toggle jadwal Libur/Tersedia, validasi jam & tambah jadwal, filter pasien prioritas, tambah pasien → lanjut daftar antrean, detail/edit/hapus pasien (termasuk penolakan 409), aktif/nonaktif & tambah/hapus dokter, tambah/edit layanan, fasilitas → layanan, tambah fasilitas & penolakan hapus, riwayat + ekspor CSV, tambah admin, reset password admin lalu masuk dengan password baru, token kedaluwarsa → keluar otomatis, portal pasien tetap terpisah, dan tidak ada scroll horizontal di semua halaman admin. Mode backend asli juga dicek (body login, header Bearer, 401 → keluar).

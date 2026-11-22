# QCare — Frontend Pasien (React)

Website responsive untuk **pasien** QCare: daftar akun, ambil nomor antrean online, pantau status antrean, lihat riwayat, dan kelola profil. Bagian admin dibuat terpisah (menyusul).

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

Akun demo (mode simulasi): **demo@qcare.id / password123**. Di halaman masuk juga ada tombol "Isi otomatis".

### Menyambungkan ke backend asli

1. Jalankan backend (`npm run dev` di repo backend, port default **3000**).
2. Ubah `.env` di project ini:
   ```env
   VITE_API_URL=http://localhost:3000/api
   VITE_USE_MOCK=false
   ```
3. Restart `npm run dev`.

Kode halaman, slice, dan thunk tidak perlu diubah. Yang berganti hanya adapter Axios di `src/services/api.js`.

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

## Pengujian yang sudah dilakukan

Aplikasi di-build dan diklik otomatis di Chrome pada lebar 412 px (ukuran frame Figma) dan 1366 px, plus pengecekan tidak ada scroll horizontal di 320/390/768/1366 px. Skenario yang lolos: proteksi rute, validasi login & registrasi, registrasi → masuk, reset kata sandi via OTP, panduan pop-up, rekomendasi beranda, pencarian & filter katalog, detail fasilitas, layanan tidak tersedia → alternatif, data tidak valid → ditandai, ringkasan → buat antrean → tiket, kuota penuh → field tanggal ditandai, batalkan antrean, filter riwayat, edit profil (validasi & simpan), ukuran teks, logout, statistik pemantauan, serta mode backend asli (request ke `localhost:3000/api` dengan header Bearer).

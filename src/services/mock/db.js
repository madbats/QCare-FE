// =====================================================================
// DATA SIMULASI (hanya dipakai saat VITE_USE_MOCK=true)
// Struktur kolom mengikuti qcare.sql & controller backend QCare.
// Data disimpan di localStorage agar tetap ada setelah halaman di-refresh.
// =====================================================================

<<<<<<< HEAD
import { nextDatesForHari, todayJakarta, hariDariTanggal, addDays } from '../../utils/format';
import { STATUS } from '../../constants/queue';

const DB_KEY = 'qcare_mock_db_v3';
=======
import { nextDatesForHari } from '../../utils/format';

const DB_KEY = 'qcare_mock_db_v2';
>>>>>>> 70022d6b3150e76b505d0f2f72b76916f9069b73

// Jadwal Sabtu Poli Penyakit Dalam (kuota 2) dibuat penuh pada Sabtu terdekat
// untuk menguji cabang "kuota penuh".
const fullQuota = (startId) => {
  const [sabtu] = nextDatesForHari('Sabtu', 1);
  return [0, 1].map((i) => ({
    id: startId + i,
    pasien_id: 2,
    fasilitas_id: 1,
    layanan_id: 3,
    dokter_id: 3,
    jadwal_dokter_id: 7,
    admin_id: null,
<<<<<<< HEAD
    nomor_antrean: `A00${i + 1}`,
    tanggal_kunjungan: sabtu,
    kategori_pasien: 'BPJS',
    status_antrean: STATUS.MENUNGGU,
=======
    nomor_antrean: `C-00${i + 1}`,
    tanggal_kunjungan: sabtu,
    kategori_pasien: 'BPJS',
    status_antrean: 'menunggu',
>>>>>>> 70022d6b3150e76b505d0f2f72b76916f9069b73
    created_at: new Date().toISOString(),
  }));
};

<<<<<<< HEAD
// Antrean hari ini (untuk layar admin) memakai jadwal yang praktik hari ini.
const todayQueues = (startId, jadwalList, riwayat) => {
  const today = todayJakarta();
  const hari = hariDariTanggal(today);
  const slots = jadwalList.filter((j) => j.hari === hari && j.aktif);
  if (!slots.length) return [];
  const rows = [
    { pasien_id: 3, status: STATUS.DILAYANI, menit: 50, jalur: null },
    { pasien_id: 4, status: STATUS.DIPANGGIL, menit: 35, jalur: 1 },
    { pasien_id: 5, status: STATUS.MENUNGGU, menit: 30, jalur: null },
    { pasien_id: 6, status: STATUS.MENUNGGU, menit: 20, jalur: 2 },
    { pasien_id: 7, status: STATUS.MENUNGGU, menit: 10, jalur: null },
  ];
  const counter = {};
  return rows.map((r, i) => {
    const slot = slots[i % slots.length];
    counter[slot.id] = (counter[slot.id] ?? 0) + 1;
    const created = new Date(Date.now() - r.menit * 60000 - 86400000).toISOString();
    const id = startId + i;
    riwayat.push({ antrean_id: id, admin_id: r.jalur, status_antrean: STATUS.MENUNGGU, keterangan: 'Pendaftaran antrean', created_at: created });
    if (r.status !== STATUS.MENUNGGU) {
      riwayat.push({ antrean_id: id, admin_id: 1, status_antrean: STATUS.DIPANGGIL, keterangan: null, created_at: new Date(Date.now() - r.menit * 30000).toISOString() });
    }
    if (r.status === STATUS.DILAYANI) {
      riwayat.push({ antrean_id: id, admin_id: 1, status_antrean: STATUS.DILAYANI, keterangan: null, created_at: new Date(Date.now() - r.menit * 20000).toISOString() });
    }
    return {
      id,
      pasien_id: r.pasien_id,
      fasilitas_id: null, // diisi saat seed() dari layanan
      layanan_id: slot.layanan_id,
      dokter_id: slot.dokter_id,
      jadwal_dokter_id: slot.id,
      admin_id: r.jalur,
      nomor_antrean: `A${String(counter[slot.id]).padStart(3, '0')}`,
      tanggal_kunjungan: today,
      kategori_pasien: null,
      status_antrean: r.status,
      created_at: created,
    };
  });
};

// Riwayat kunjungan yang sudah selesai/dibatalkan beberapa hari terakhir.
const pastQueues = (startId, riwayat) => {
  const today = todayJakarta();
  const rows = [
    { pasien_id: 7, layanan_id: 1, dokter_id: 1, jadwal: 1, hari: -1, status: STATUS.SELESAI, note: 'Pemeriksaan fisik normal, diberikan resep vitamin.' },
    { pasien_id: 4, layanan_id: 3, dokter_id: 3, jadwal: 6, hari: -1, status: STATUS.SELESAI, note: 'Kontrol tekanan darah 125/80 mmHg, lanjut terapi.' },
    { pasien_id: 6, layanan_id: 6, dokter_id: 6, jadwal: 14, hari: -2, status: STATUS.DIBATALKAN, note: 'Pasien berhalangan hadir dan menjadwalkan ulang.' },
    { pasien_id: 5, layanan_id: 2, dokter_id: 2, jadwal: 4, hari: -3, status: STATUS.SELESAI, note: 'Imunisasi booster selesai tanpa keluhan.' },
  ];
  return rows.map((r, i) => {
    const id = startId + i;
    const tanggal = addDays(today, r.hari);
    const created = `${tanggal}T0${2 + i}:${10 + i * 7}:00.000Z`;
    riwayat.push({ antrean_id: id, admin_id: null, status_antrean: STATUS.MENUNGGU, keterangan: 'Pendaftaran antrean', created_at: `${addDays(tanggal, -1)}T09:00:00.000Z` });
    riwayat.push({ antrean_id: id, admin_id: 1, status_antrean: r.status, keterangan: r.note, created_at: created });
    return {
      id,
      pasien_id: r.pasien_id,
      fasilitas_id: null,
      layanan_id: r.layanan_id,
      dokter_id: r.dokter_id,
      jadwal_dokter_id: r.jadwal,
      admin_id: null,
      nomor_antrean: `A${String(10 + i).padStart(3, '0')}`,
      tanggal_kunjungan: tanggal,
      kategori_pasien: null,
      status_antrean: r.status,
      created_at: `${addDays(tanggal, -1)}T09:00:00.000Z`,
    };
  });
};

const baseSeed = () => ({
=======
const seed = () => ({
>>>>>>> 70022d6b3150e76b505d0f2f72b76916f9069b73
  fasilitas_kesehatan: [
    {
      id: 1,
      nama_fasilitas: 'RSUD Harapan Bersama',
      jenis_fasilitas: 'Rumah Sakit',
      alamat: 'Jl. Ahmad Yani No. 12, Surabaya',
      no_telepon: '031-7788990',
      email: 'info@rsudharapan.example',
    },
    {
      id: 2,
      nama_fasilitas: 'Puskesmas Sukamaju',
      jenis_fasilitas: 'Puskesmas',
      alamat: 'Jl. Ketintang Baru No. 5, Surabaya',
      no_telepon: '031-8290011',
      email: 'puskesmas.sukamaju@example.id',
    },
    {
      id: 3,
      nama_fasilitas: 'Klinik Pratama Sehat Sentosa',
      jenis_fasilitas: 'Klinik',
      alamat: 'Jl. Raya Darmo No. 88, Surabaya',
      no_telepon: '031-5671234',
      email: 'halo@sehatsentosa.example',
    },
  ],
  layanan: [
    { id: 1, fasilitas_id: 1, nama_layanan: 'Poli Umum', deskripsi: 'Pemeriksaan kesehatan umum dan konsultasi keluhan ringan.', estimasi_durasi: 15, biaya: 50000, aktif: true },
    { id: 2, fasilitas_id: 1, nama_layanan: 'Poli Anak', deskripsi: 'Pemeriksaan tumbuh kembang, imunisasi, dan keluhan kesehatan anak.', estimasi_durasi: 20, biaya: 75000, aktif: true },
    { id: 3, fasilitas_id: 1, nama_layanan: 'Poli Penyakit Dalam', deskripsi: 'Konsultasi penyakit dalam seperti diabetes, hipertensi, dan gangguan pencernaan.', estimasi_durasi: 25, biaya: 120000, aktif: true },
    { id: 4, fasilitas_id: 1, nama_layanan: 'Poli Mata', deskripsi: 'Pemeriksaan mata dan gangguan penglihatan.', estimasi_durasi: 20, biaya: 100000, aktif: false },
    { id: 5, fasilitas_id: 2, nama_layanan: 'Poli Umum', deskripsi: 'Pemeriksaan kesehatan dasar untuk seluruh warga.', estimasi_durasi: 10, biaya: 0, aktif: true },
    { id: 6, fasilitas_id: 2, nama_layanan: 'Poli Gigi', deskripsi: 'Pemeriksaan, pembersihan karang, dan penambalan gigi.', estimasi_durasi: 20, biaya: 0, aktif: true },
    { id: 7, fasilitas_id: 2, nama_layanan: 'Pelayanan Lansia', deskripsi: 'Pemeriksaan rutin dan konsultasi kesehatan khusus lansia.', estimasi_durasi: 15, biaya: 0, aktif: true },
    { id: 8, fasilitas_id: 2, nama_layanan: 'KIA (Ibu & Anak)', deskripsi: 'Pemeriksaan kehamilan, KB, dan kesehatan ibu & anak.', estimasi_durasi: 20, biaya: 0, aktif: true },
    { id: 9, fasilitas_id: 3, nama_layanan: 'Konsultasi Dokter Umum', deskripsi: 'Konsultasi dan pemeriksaan dokter umum.', estimasi_durasi: 15, biaya: 60000, aktif: true },
    { id: 10, fasilitas_id: 3, nama_layanan: 'Laboratorium', deskripsi: 'Cek darah lengkap, gula darah, dan kolesterol.', estimasi_durasi: 10, biaya: 85000, aktif: true },
  ],
  dokter: [
    { id: 1, fasilitas_id: 1, nama_dokter: 'dr. Rina Kartika', spesialisasi: 'Dokter Umum', no_telepon: null, aktif: true },
    { id: 2, fasilitas_id: 1, nama_dokter: 'dr. Bayu Pratama, Sp.A', spesialisasi: 'Spesialis Anak', no_telepon: null, aktif: true },
    { id: 3, fasilitas_id: 1, nama_dokter: 'dr. Hendra Wijaya, Sp.PD', spesialisasi: 'Spesialis Penyakit Dalam', no_telepon: null, aktif: true },
    { id: 4, fasilitas_id: 1, nama_dokter: 'dr. Maya Salsabila, Sp.M', spesialisasi: 'Spesialis Mata', no_telepon: null, aktif: false },
    { id: 5, fasilitas_id: 2, nama_dokter: 'dr. Andi Saputra', spesialisasi: 'Dokter Umum', no_telepon: null, aktif: true },
    { id: 6, fasilitas_id: 2, nama_dokter: 'drg. Lestari Ayu', spesialisasi: 'Dokter Gigi', no_telepon: null, aktif: true },
    { id: 7, fasilitas_id: 2, nama_dokter: 'dr. Siti Rahmawati', spesialisasi: 'Dokter Umum', no_telepon: null, aktif: true },
    { id: 8, fasilitas_id: 3, nama_dokter: 'dr. Kevin Halim', spesialisasi: 'Dokter Umum', no_telepon: null, aktif: true },
    { id: 9, fasilitas_id: 3, nama_dokter: 'dr. Nadia Putri', spesialisasi: 'Dokter Umum', no_telepon: null, aktif: true },
  ],
  jadwal_dokter: [
    // RSUD Harapan Bersama
    { id: 1, dokter_id: 1, layanan_id: 1, hari: 'Senin', jam_mulai: '08:00:00', jam_selesai: '12:00:00', kuota: 30, aktif: true },
    { id: 2, dokter_id: 1, layanan_id: 1, hari: 'Rabu', jam_mulai: '08:00:00', jam_selesai: '12:00:00', kuota: 30, aktif: true },
    { id: 3, dokter_id: 1, layanan_id: 1, hari: 'Jumat', jam_mulai: '13:00:00', jam_selesai: '16:00:00', kuota: 20, aktif: true },
    { id: 4, dokter_id: 2, layanan_id: 2, hari: 'Selasa', jam_mulai: '09:00:00', jam_selesai: '13:00:00', kuota: 20, aktif: true },
    { id: 5, dokter_id: 2, layanan_id: 2, hari: 'Kamis', jam_mulai: '09:00:00', jam_selesai: '13:00:00', kuota: 20, aktif: true },
    { id: 6, dokter_id: 3, layanan_id: 3, hari: 'Senin', jam_mulai: '13:00:00', jam_selesai: '16:00:00', kuota: 15, aktif: true },
    { id: 7, dokter_id: 3, layanan_id: 3, hari: 'Sabtu', jam_mulai: '08:00:00', jam_selesai: '11:00:00', kuota: 2, aktif: true },
    { id: 8, dokter_id: 4, layanan_id: 4, hari: 'Rabu', jam_mulai: '08:00:00', jam_selesai: '12:00:00', kuota: 15, aktif: false },
    // Puskesmas Sukamaju
    { id: 9, dokter_id: 5, layanan_id: 5, hari: 'Senin', jam_mulai: '07:30:00', jam_selesai: '12:00:00', kuota: 40, aktif: true },
    { id: 10, dokter_id: 5, layanan_id: 5, hari: 'Selasa', jam_mulai: '07:30:00', jam_selesai: '12:00:00', kuota: 40, aktif: true },
    { id: 11, dokter_id: 7, layanan_id: 5, hari: 'Rabu', jam_mulai: '07:30:00', jam_selesai: '12:00:00', kuota: 40, aktif: true },
    { id: 12, dokter_id: 7, layanan_id: 5, hari: 'Kamis', jam_mulai: '07:30:00', jam_selesai: '12:00:00', kuota: 40, aktif: true },
    { id: 13, dokter_id: 5, layanan_id: 5, hari: 'Jumat', jam_mulai: '07:30:00', jam_selesai: '11:00:00', kuota: 30, aktif: true },
    { id: 14, dokter_id: 6, layanan_id: 6, hari: 'Selasa', jam_mulai: '08:00:00', jam_selesai: '12:00:00', kuota: 15, aktif: true },
    { id: 15, dokter_id: 6, layanan_id: 6, hari: 'Kamis', jam_mulai: '08:00:00', jam_selesai: '12:00:00', kuota: 15, aktif: true },
    { id: 16, dokter_id: 7, layanan_id: 7, hari: 'Senin', jam_mulai: '08:00:00', jam_selesai: '11:00:00', kuota: 25, aktif: true },
    { id: 17, dokter_id: 7, layanan_id: 7, hari: 'Jumat', jam_mulai: '08:00:00', jam_selesai: '11:00:00', kuota: 25, aktif: true },
    // KIA (layanan 8) sengaja belum punya jadwal -> uji cabang "layanan tidak tersedia".
    // Klinik Pratama Sehat Sentosa
    { id: 18, dokter_id: 8, layanan_id: 9, hari: 'Senin', jam_mulai: '16:00:00', jam_selesai: '21:00:00', kuota: 25, aktif: true },
    { id: 19, dokter_id: 9, layanan_id: 9, hari: 'Selasa', jam_mulai: '16:00:00', jam_selesai: '21:00:00', kuota: 25, aktif: true },
    { id: 20, dokter_id: 8, layanan_id: 9, hari: 'Rabu', jam_mulai: '16:00:00', jam_selesai: '21:00:00', kuota: 25, aktif: true },
    { id: 21, dokter_id: 9, layanan_id: 9, hari: 'Kamis', jam_mulai: '16:00:00', jam_selesai: '21:00:00', kuota: 25, aktif: true },
    { id: 22, dokter_id: 8, layanan_id: 9, hari: 'Sabtu', jam_mulai: '09:00:00', jam_selesai: '14:00:00', kuota: 25, aktif: true },
    { id: 23, dokter_id: 9, layanan_id: 9, hari: 'Minggu', jam_mulai: '09:00:00', jam_selesai: '14:00:00', kuota: 20, aktif: true },
    { id: 24, dokter_id: 9, layanan_id: 10, hari: 'Senin', jam_mulai: '07:00:00', jam_selesai: '12:00:00', kuota: 30, aktif: true },
    { id: 25, dokter_id: 9, layanan_id: 10, hari: 'Rabu', jam_mulai: '07:00:00', jam_selesai: '12:00:00', kuota: 30, aktif: true },
    { id: 26, dokter_id: 9, layanan_id: 10, hari: 'Jumat', jam_mulai: '07:00:00', jam_selesai: '12:00:00', kuota: 30, aktif: true },
  ],
  pasien: [
    {
      id: 1,
      nama_pasien: 'Iza Pratiwi',
      email: 'demo@qcare.id',
      password: 'password123', // simulasi saja; backend asli menyimpan bcrypt hash
      tanggal_lahir: '2004-05-17',
      jenis_kelamin: 'Perempuan',
      no_telepon: '081234567890',
      alamat: 'Jl. Ketintang No. 10, Surabaya',
      kategori_pasien: 'Umum',
      kebutuhan_khusus: null,
    },
    {
      id: 2,
      nama_pasien: 'Pasien Lain',
      email: 'pasien.lain@qcare.id',
      password: 'password123',
      tanggal_lahir: '1958-01-01',
      jenis_kelamin: 'Laki-laki',
      no_telepon: null,
      alamat: null,
      kategori_pasien: 'BPJS',
      kebutuhan_khusus: 'Kelompok: Lansia; Kursi roda',
    },
<<<<<<< HEAD
    // Pasien yang didaftarkan petugas loket (tanpa akun login)
    { id: 3, nama_pasien: 'Siti Rahmawati', email: null, password: null, tanggal_lahir: '1994-05-19', jenis_kelamin: 'Perempuan', no_telepon: '0813-9012-4411', alamat: 'Jl. Dharmahusada No. 42, Surabaya', kategori_pasien: 'BPJS', kebutuhan_khusus: 'Kelompok: Ibu Hamil; Pendampingan petugas; Kursi tunggu prioritas (trimester 2)' },
    { id: 4, nama_pasien: 'Budi Santoso', email: null, password: null, tanggal_lahir: '1988-11-22', jenis_kelamin: 'Laki-laki', no_telepon: '0856-4421-9800', alamat: 'Jl. Manyar Kertoarjo No. 7, Surabaya', kategori_pasien: 'Umum', kebutuhan_khusus: null },
    { id: 5, nama_pasien: 'Aisyah Putri Maharani', email: null, password: null, tanggal_lahir: '2019-02-03', jenis_kelamin: 'Perempuan', no_telepon: '0812-7788-3321', alamat: 'Jl. Kertajaya No. 19, Surabaya', kategori_pasien: 'BPJS', kebutuhan_khusus: 'Kelompok: Anak; Didampingi orang tua, perlu komunikasi ramah anak' },
    { id: 6, nama_pasien: 'Rizky Pratama Putra', email: null, password: null, tanggal_lahir: '1997-07-14', jenis_kelamin: 'Laki-laki', no_telepon: '0821-3309-5512', alamat: 'Jl. Gubeng No. 3, Surabaya', kategori_pasien: 'Asuransi', kebutuhan_khusus: 'Kelompok: Disabilitas; Kursi roda; Akses tanpa tangga' },
    { id: 7, nama_pasien: 'Dewi Anggraini', email: null, password: null, tanggal_lahir: '1958-09-28', jenis_kelamin: 'Perempuan', no_telepon: '0818-5501-2290', alamat: 'Jl. Raya Darmo No. 101, Surabaya', kategori_pasien: 'Umum', kebutuhan_khusus: 'Kelompok: Lansia; Pendampingan petugas; Informasi teks besar' },
  ],
  admin: [
    { id: 1, nama_admin: 'Nadia Kusuma', email: 'nadia.admin@qcare.id', password: 'admin123', role: 'admin', created_at: '2026-01-12T02:00:00.000Z' },
    { id: 2, nama_admin: 'Fajar Ramadhan', email: 'fajar.loket@qcare.id', password: 'admin123', role: 'admin', created_at: '2026-02-04T02:00:00.000Z' },
    { id: 3, nama_admin: 'Rina Marlina', email: 'rina.loket@qcare.id', password: 'admin123', role: 'admin', created_at: '2026-03-18T02:00:00.000Z' },
=======
>>>>>>> 70022d6b3150e76b505d0f2f72b76916f9069b73
  ],
  antrean: [
    {
      id: 1,
      pasien_id: 1,
      fasilitas_id: 2,
      layanan_id: 6,
      dokter_id: 6,
      jadwal_dokter_id: 14,
      admin_id: null,
<<<<<<< HEAD
      nomor_antrean: 'A004',
      tanggal_kunjungan: '2026-11-03',
      kategori_pasien: 'Umum',
      status_antrean: STATUS.SELESAI,
=======
      nomor_antrean: 'B-004',
      tanggal_kunjungan: '2026-11-03',
      kategori_pasien: 'Umum',
      status_antrean: 'selesai',
>>>>>>> 70022d6b3150e76b505d0f2f72b76916f9069b73
      created_at: '2026-11-02T09:12:00.000Z',
    },
    {
      id: 2,
      pasien_id: 1,
      fasilitas_id: 1,
      layanan_id: 1,
      dokter_id: 1,
      jadwal_dokter_id: 2,
      admin_id: null,
<<<<<<< HEAD
      nomor_antrean: 'A011',
      tanggal_kunjungan: '2026-11-12',
      kategori_pasien: 'Umum',
      status_antrean: STATUS.DIBATALKAN,
=======
      nomor_antrean: 'A-011',
      tanggal_kunjungan: '2026-11-12',
      kategori_pasien: 'Umum',
      status_antrean: 'dibatalkan',
>>>>>>> 70022d6b3150e76b505d0f2f72b76916f9069b73
      created_at: '2026-11-10T02:40:00.000Z',
    },
    ...fullQuota(3),
  ],
  riwayat_antrean: [],
  password_reset_otps: [],
});

<<<<<<< HEAD
const seed = () => {
  const db = baseSeed();
  const riwayat = [];
  db.antrean.push(...todayQueues(10, db.jadwal_dokter, riwayat), ...pastQueues(20, riwayat));
  db.antrean.forEach((a) => {
    if (!a.fasilitas_id) a.fasilitas_id = db.layanan.find((l) => l.id === a.layanan_id)?.fasilitas_id ?? null;
  });
  db.riwayat_antrean = riwayat.map((r, i) => ({ id: i + 1, ...r }));
  return db;
};

=======
>>>>>>> 70022d6b3150e76b505d0f2f72b76916f9069b73
let cache = null;

export const getDB = () => {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(DB_KEY);
    cache = raw ? JSON.parse(raw) : null;
  } catch {
    cache = null;
  }
  if (!cache) {
    cache = seed();
    // Agar halaman Riwayat akun demo tidak kosong.
    try {
      if (!localStorage.getItem('qcare_history_1')) localStorage.setItem('qcare_history_1', JSON.stringify([2, 1]));
    } catch {
      /* abaikan */
    }
    saveDB();
  }
  return cache;
};

export const saveDB = () => {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(cache));
  } catch {
    /* abaikan */
  }
};

export const resetDB = () => {
  cache = null;
  try {
    localStorage.removeItem(DB_KEY);
  } catch {
    /* abaikan */
  }
};

export const nextId = (table) => getDB()[table].reduce((max, row) => Math.max(max, row.id), 0) + 1;

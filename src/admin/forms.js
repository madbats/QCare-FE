// Konfigurasi form layar 16–20. Field & validasi mengikuti controller backend.
import { KATEGORI_PASIEN, JENIS_KELAMIN, KELOMPOK_PASIEN, PHONE_REGEX, parseKebutuhan } from '../constants/patient';
import { URUTAN_HARI, todayJakarta } from '../utils/format';

const phone = (v) => (PHONE_REGEX.test(String(v).trim()) ? null : 'Format nomor telepon tidak valid (8–20 angka, +, -, spasi)');
const fasilitasOptions = (s) => s.fasilitas.items.map((f) => ({ value: String(f.id), label: f.nama_fasilitas }));
const toTime = (v) => (v ? String(v).slice(0, 5) : '');
const toTimeSql = (v) => (v && v.length === 5 ? `${v}:00` : v);

// ---------- 16 · Tambah Pasien & Kategori ----------
export const pasienForm = {
  name: 'pasien',
  entity: 'Data pasien',
  title: 'Tambah Pasien & Kategori',
  editTitle: 'Ubah Data Pasien',
  subtitle: 'Lengkapi data pasien sebelum mendaftarkan antrean.',
  steps: ['Identitas', 'Kategori', 'Simpan'],
  cardTitle: 'Identitas pasien',
  submitLabel: 'Simpan Pasien',
  backTo: '/admin/pasien',
  footnote: 'Pastikan kategori sesuai hasil verifikasi. Kelompok: Umum · Lansia · Anak · Ibu Hamil · Difabel / Kebutuhan Khusus.',
  fields: [
    { key: 'nama_pasien', label: 'Nama Lengkap', required: true, placeholder: 'Hendra Gunawan', wide: true },
    { key: 'kategori_pasien', label: 'Kategori Pasien', required: true, type: 'select', options: KATEGORI_PASIEN.map((k) => ({ value: k.value, label: `${k.label} — ${k.desc}` })) },
    {
      key: 'kelompok',
      label: 'Kelompok Pasien',
      type: 'select',
      default: 'Umum',
      options: KELOMPOK_PASIEN.map((k) => ({ value: k.value, label: k.value === 'Disabilitas' ? 'Difabel / Kebutuhan Khusus' : k.label })),
    },
    { key: 'jenis_kelamin', label: 'Jenis Kelamin', required: true, type: 'select', options: JENIS_KELAMIN.map((j) => ({ value: j, label: j })) },
    { key: 'tanggal_lahir', label: 'Tanggal Lahir', required: true, type: 'date', max: () => todayJakarta(), validate: (v) => (v > todayJakarta() ? 'Tanggal lahir tidak valid' : null) },
    { key: 'no_telepon', label: 'No. Telepon', required: true, type: 'tel', inputMode: 'tel', placeholder: '0812-3344-5566', validate: phone },
    { key: 'alamat', label: 'Alamat', required: true, placeholder: 'Jl. Pemuda No. 10, Surabaya', wide: true },
    { key: 'kebutuhan', label: 'Kebutuhan Khusus / Pendampingan', type: 'textarea', placeholder: 'Tidak ada kebutuhan khusus', wide: true },
  ],
  toForm: (row) => {
    const p = parseKebutuhan(row.kebutuhan_khusus);
    return {
      ...row,
      tanggal_lahir: row.tanggal_lahir ? String(row.tanggal_lahir).slice(0, 10) : '',
      kelompok: p.kelompok,
      kebutuhan: [...p.needs, ...(p.otherNeed ? [p.otherNeed] : [])].join('; '),
    };
  },
  toPayload: (f) => {
    const kebutuhan = [f.kelompok && f.kelompok !== 'Umum' ? `Kelompok: ${f.kelompok}` : null, f.kebutuhan?.trim() || null].filter(Boolean).join('; ');
    return {
      nama_pasien: f.nama_pasien.trim(),
      kategori_pasien: f.kategori_pasien,
      jenis_kelamin: f.jenis_kelamin,
      tanggal_lahir: f.tanggal_lahir || null,
      no_telepon: f.no_telepon.trim(),
      alamat: f.alamat.trim(),
      kebutuhan_khusus: kebutuhan || null,
    };
  },
  afterSave: (saved, params, isEdit) =>
    !isEdit && params.get('lanjut') === 'antrean' && saved?.id ? `/admin/antrean/baru?pasien=${saved.id}` : saved?.id ? `/admin/pasien/${saved.id}` : '/admin/pasien',
};

// ---------- 17 · Tambah Dokter Baru ----------
export const dokterForm = {
  name: 'dokter',
  needs: ['fasilitas'],
  entity: 'Data dokter',
  title: 'Tambah Dokter Baru',
  editTitle: 'Ubah Data Dokter',
  subtitle: 'Lengkapi profil tenaga medis.',
  cardTitle: 'Data Dokter',
  submitLabel: 'Simpan Dokter',
  backTo: '/admin/dokter',
  infoTitle: 'Profil dokter',
  infoText: 'Nama, spesialisasi, dan telepon digunakan pada jadwal praktik serta tiket antrean pasien.',
  fields: [
    { key: 'nama_dokter', label: 'Nama Dokter', required: true, placeholder: 'dr. Lestari Wulandari, Sp.A', wide: true },
    { key: 'spesialisasi', label: 'Spesialisasi', required: true, placeholder: 'Spesialis Anak' },
    { key: 'fasilitas_id', label: 'Fasilitas Kesehatan', required: true, type: 'select', options: fasilitasOptions, placeholder: 'Pilih fasilitas' },
    { key: 'no_telepon', label: 'No. Telepon', type: 'tel', inputMode: 'tel', placeholder: '0812-3456-7890', validate: phone },
    { key: 'aktif', label: 'Status Aktif', type: 'toggle' },
  ],
  toForm: (row) => ({ ...row, fasilitas_id: String(row.fasilitas_id ?? ''), aktif: row.aktif !== false }),
  toPayload: (f) => ({
    fasilitas_id: Number(f.fasilitas_id),
    nama_dokter: f.nama_dokter.trim(),
    spesialisasi: f.spesialisasi.trim(),
    no_telepon: f.no_telepon?.trim() || null,
    aktif: Boolean(f.aktif),
  }),
};

// ---------- 18 · Tambah Jadwal Dokter ----------
export const jadwalForm = {
  name: 'jadwal',
  needs: ['dokter', 'layanan', 'fasilitas'],
  entity: 'Jadwal dokter',
  title: 'Tambah Jadwal Dokter',
  editTitle: 'Ubah Jadwal Dokter',
  subtitle: 'Tentukan hari praktik, jam, dan kuota pelayanan.',
  cardTitle: 'Data Jadwal Dokter',
  submitLabel: 'Simpan Jadwal',
  backTo: '/admin/jadwal',
  infoTitle: 'Kuota pelayanan',
  infoText: 'Pasien hanya dapat didaftarkan pada jadwal yang tersedia dan kuotanya belum penuh.',
  fields: [
    {
      key: 'dokter_id',
      label: 'Dokter',
      required: true,
      type: 'select',
      wide: true,
      options: (s) => s.dokter.items.map((d) => ({ value: String(d.id), label: `${d.nama_dokter}${d.aktif === false ? ' (nonaktif)' : ''}` })),
    },
    {
      key: 'layanan_id',
      label: 'Layanan / Poli',
      required: true,
      type: 'select',
      wide: true,
      hint: 'Hanya layanan di fasilitas yang sama dengan dokter.',
      options: (s, form) => {
        const dok = s.dokter.items.find((d) => String(d.id) === String(form.dokter_id));
        return s.layanan.items
          .filter((l) => !dok || String(l.fasilitas_id) === String(dok.fasilitas_id))
          .map((l) => ({ value: String(l.id), label: l.nama_layanan }));
      },
    },
    { key: 'hari', label: 'Hari', required: true, type: 'select', options: URUTAN_HARI.map((h) => ({ value: h, label: h })) },
    { key: 'kuota', label: 'Kuota', required: true, type: 'number', min: 1, inputMode: 'numeric', validate: (v) => (Number(v) >= 1 ? null : 'Kuota minimal 1') },
    { key: 'jam_mulai', label: 'Jam Mulai', required: true, type: 'time' },
    { key: 'jam_selesai', label: 'Jam Selesai', required: true, type: 'time', validate: (v, f) => (f.jam_mulai && v <= f.jam_mulai ? 'Jam selesai harus setelah jam mulai' : null) },
    { key: 'aktif', label: 'Status Jadwal', type: 'toggle', onLabel: 'Tersedia', offLabel: 'Libur' },
  ],
  // Dokter berganti -> kosongkan layanan bila beda fasilitas
  onChange: (key) => (key === 'dokter_id' ? { layanan_id: '' } : null),
  initial: (params) => ({ hari: params.get('hari') ?? '', kuota: '20', jam_mulai: '08:00', jam_selesai: '13:00' }),
  toForm: (row) => ({ ...row, dokter_id: String(row.dokter_id), layanan_id: String(row.layanan_id), jam_mulai: toTime(row.jam_mulai), jam_selesai: toTime(row.jam_selesai), kuota: String(row.kuota ?? ''), aktif: row.aktif !== false }),
  toPayload: (f) => ({
    dokter_id: Number(f.dokter_id),
    layanan_id: Number(f.layanan_id),
    hari: f.hari,
    jam_mulai: toTimeSql(f.jam_mulai),
    jam_selesai: toTimeSql(f.jam_selesai),
    kuota: Number(f.kuota),
    aktif: Boolean(f.aktif),
  }),
};

// ---------- 19 · Tambah Layanan Klinik ----------
export const layananForm = {
  name: 'layanan',
  needs: ['fasilitas'],
  entity: 'Layanan',
  title: 'Tambah Layanan Klinik',
  editTitle: 'Ubah Layanan Klinik',
  subtitle: 'Tentukan layanan, estimasi, dan tarif klinik.',
  cardTitle: 'Data Layanan Klinik',
  submitLabel: 'Simpan Layanan',
  backTo: '/admin/layanan',
  infoTitle: 'Identitas layanan',
  infoText: 'Nomor antrean dibuat otomatis oleh backend (A001, A002, …) untuk setiap jadwal & tanggal, sehingga kode antrean tidak perlu diisi.',
  initial: (params) => ({ fasilitas_id: params.get('fasilitas') ?? '' }),
  fields: [
    { key: 'nama_layanan', label: 'Nama Layanan', required: true, placeholder: 'Poli Mata', wide: true },
    { key: 'fasilitas_id', label: 'Fasilitas Kesehatan', required: true, type: 'select', options: fasilitasOptions, placeholder: 'Pilih fasilitas', wide: true },
    { key: 'deskripsi', label: 'Deskripsi', type: 'textarea', placeholder: 'Konsultasi dan pemeriksaan kesehatan mata.', wide: true },
    { key: 'estimasi_durasi', label: 'Estimasi Waktu (menit)', required: true, type: 'number', min: 1, inputMode: 'numeric', validate: (v) => (Number(v) > 0 ? null : 'Isi angka lebih dari 0') },
    { key: 'biaya', label: 'Tarif (Rp)', required: true, type: 'number', min: 0, inputMode: 'numeric', placeholder: '100000', validate: (v) => (Number(v) >= 0 ? null : 'Tarif tidak valid') },
    { key: 'aktif', label: 'Status Layanan', type: 'toggle' },
  ],
  toForm: (row) => ({ ...row, fasilitas_id: String(row.fasilitas_id ?? ''), estimasi_durasi: String(row.estimasi_durasi ?? ''), biaya: String(row.biaya ?? ''), aktif: row.aktif !== false }),
  toPayload: (f) => ({
    fasilitas_id: Number(f.fasilitas_id),
    nama_layanan: f.nama_layanan.trim(),
    deskripsi: f.deskripsi?.trim() || null,
    estimasi_durasi: Number(f.estimasi_durasi),
    biaya: Number(f.biaya),
    aktif: Boolean(f.aktif),
  }),
};

// ---------- 20 · Tambah Fasilitas Klinik ----------
export const JENIS_FASILITAS = ['Rumah Sakit', 'Puskesmas', 'Klinik', 'Laboratorium'];
export const fasilitasForm = {
  name: 'fasilitas',
  entity: 'Fasilitas',
  title: 'Tambah Fasilitas Klinik',
  editTitle: 'Ubah Fasilitas Klinik',
  subtitle: 'Tambahkan fasilitas kesehatan yang melayani antrean QCARE.',
  cardTitle: 'Data Fasilitas Klinik',
  submitLabel: 'Simpan Fasilitas',
  backTo: '/admin/fasilitas',
  infoTitle: 'Kesiapan fasilitas',
  infoText: 'Fasilitas dipakai sebagai induk layanan & dokter. Fasilitas yang masih memiliki layanan/dokter tidak bisa dihapus.',
  fields: [
    { key: 'nama_fasilitas', label: 'Nama Fasilitas', required: true, placeholder: 'Klinik Pratama Sehat', wide: true },
    { key: 'jenis_fasilitas', label: 'Kategori', type: 'select', options: JENIS_FASILITAS.map((j) => ({ value: j, label: j })) },
    { key: 'no_telepon', label: 'No. Telepon', type: 'tel', inputMode: 'tel', placeholder: '031-5671234' },
    { key: 'email', label: 'Email', type: 'email', placeholder: 'info@klinik.id', validate: (v) => (/^\S+@\S+\.\S+$/.test(v) ? null : 'Format email tidak valid') },
    { key: 'alamat', label: 'Alamat', type: 'textarea', placeholder: 'Jl. Raya Darmo No. 88, Surabaya', wide: true },
  ],
  toPayload: (f) => ({
    nama_fasilitas: f.nama_fasilitas.trim(),
    jenis_fasilitas: f.jenis_fasilitas || null,
    alamat: f.alamat?.trim() || null,
    no_telepon: f.no_telepon?.trim() || null,
    email: f.email?.trim() || null,
  }),
};

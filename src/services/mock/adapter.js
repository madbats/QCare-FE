// =====================================================================
// MOCK ADAPTER AXIOS
// Meniru endpoint backend QCare (routes/*.js) beserta validasi & format
// respons { message, data } — untuk pasien maupun admin.
// Dipakai selama backend belum disambungkan (VITE_USE_MOCK=true).
// =====================================================================
import { AxiosError } from 'axios';
import { getDB, saveDB, nextId } from './db';
import { todayJakarta, hariDariTanggal } from '../../utils/format';
import { STATUS, sameStatus } from '../../constants/queue';

const LATENCY = [200, 450];
const SIM_STEP_MS = 15000; // simulasi pasien: antrean maju 1 nomor tiap 15 detik
const VALID_STATUS = Object.values(STATUS);

const wait = () => new Promise((r) => setTimeout(r, LATENCY[0] + Math.random() * (LATENCY[1] - LATENCY[0])));

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const ok = (status, body) => ({ status, body });
const fail = (status, message) => {
  throw new HttpError(status, message);
};

// ---------- token simulasi (bukan JWT asli) ----------
const encodeToken = (payload) => `mock.${btoa(JSON.stringify({ ...payload, exp: Date.now() + 24 * 60 * 60 * 1000 }))}`;

const decodeToken = (header) => {
  if (!header || !String(header).startsWith('Bearer ')) return null;
  try {
    const payload = JSON.parse(atob(String(header).split(' ')[1].replace(/^mock\./, '')));
    return payload.exp < Date.now() ? null : payload;
  } catch {
    return null;
  }
};

// verifyToken
const requireAuth = (ctx) => {
  const header = ctx.headers.Authorization || ctx.headers.authorization;
  if (!header) fail(401, 'Akses ditolak. Token tidak ditemukan.');
  const user = decodeToken(header);
  if (!user) fail(401, 'Token tidak valid atau sudah kedaluwarsa.');
  return user;
};

// authorizeRole("admin")
const requireAdmin = (ctx) => {
  const user = requireAuth(ctx);
  if (user.role !== 'admin') fail(403, 'Akses ditolak. Kamu tidak memiliki izin.');
  return user;
};

const publicPasien = ({ password, ...rest }) => rest;
const publicAdmin = ({ password, ...rest }) => rest;
const findById = (table, id) => getDB()[table].find((row) => String(row.id) === String(id));
const strip = ({ sim_ahead, ...row }) => row;
const now = () => new Date().toISOString();

const logRiwayat = (antreanId, status, adminId = null, keterangan = null) => {
  const db = getDB();
  db.riwayat_antrean.push({ id: nextId('riwayat_antrean'), antrean_id: antreanId, admin_id: adminId, status_antrean: status, keterangan, created_at: now() });
};

// ---------- simulasi pergerakan antrean (hanya untuk antrean buatan pasien) ----------
const simulate = (antrean) => {
  if (antrean.sim_ahead === undefined) return antrean;
  if (!sameStatus(antrean.status_antrean, STATUS.MENUNGGU) && !sameStatus(antrean.status_antrean, STATUS.DIPANGGIL)) return antrean;
  const steps = Math.floor((Date.now() - new Date(antrean.created_at).getTime()) / SIM_STEP_MS);
  const next = steps >= antrean.sim_ahead + 3 ? STATUS.SELESAI : steps >= antrean.sim_ahead ? STATUS.DIPANGGIL : null;
  if (next && !sameStatus(next, antrean.status_antrean)) {
    antrean.status_antrean = next;
    logRiwayat(antrean.id, next, null, 'Simulasi otomatis');
  }
  return antrean;
};

const numberOf = (nomor) => Number(String(nomor).replace(/\D/g, '')) || 1;
const prefixOf = (nomor) => String(nomor).replace(/[\d-]+$/, '') || 'A';

const progressOf = (antrean) => {
  const durasi = Number(findById('layanan', antrean.layanan_id)?.estimasi_durasi) || 15;
  if (sameStatus(antrean.status_antrean, STATUS.SELESAI) || sameStatus(antrean.status_antrean, STATUS.DIBATALKAN)) {
    return { nomor_berjalan: null, sisa_antrean_di_depan: 0, total_menunggu: 0, estimasi_menit: 0 };
  }
  const steps = Math.floor((Date.now() - new Date(antrean.created_at).getTime()) / SIM_STEP_MS);
  const ahead = Math.max(0, (antrean.sim_ahead ?? 0) - steps);
  const running = Math.max(1, numberOf(antrean.nomor_antrean) - ahead);
  const waiting = sameStatus(antrean.status_antrean, STATUS.MENUNGGU);
  return {
    nomor_berjalan: `${prefixOf(antrean.nomor_antrean)}${String(running).padStart(3, '0')}`,
    sisa_antrean_di_depan: waiting ? ahead : 0,
    total_menunggu: ahead + 4,
    estimasi_menit: waiting ? ahead * durasi : 0,
  };
};

// ---------- validator kecil (mengikuti controller) ----------
const validDate = (value) => {
  const t = new Date(value);
  return typeof value === 'string' && !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === value && value <= new Date().toISOString().slice(0, 10);
};
const PHONE = /^[0-9+\-\s]{8,20}$/;

// ---------- CRUD master data (fasilitas, layanan, dokter, jadwal) ----------
const MASTER = [
  {
    path: 'fasilitas',
    table: 'fasilitas_kesehatan',
    label: 'Fasilitas kesehatan',
    fields: ['nama_fasilitas', 'jenis_fasilitas', 'alamat', 'no_telepon', 'email'],
    required: (b) => (!b.nama_fasilitas ? 'Nama fasilitas wajib diisi' : null),
    msgs: { list: 'Data fasilitas kesehatan berhasil diambil', one: 'Data fasilitas berhasil ditemukan', create: 'Fasilitas kesehatan berhasil ditambahkan', update: 'Fasilitas kesehatan berhasil diperbarui', del: 'Fasilitas kesehatan berhasil dihapus', notFound: 'Fasilitas kesehatan tidak ditemukan' },
    children: [['layanan', 'fasilitas_id'], ['dokter', 'fasilitas_id'], ['antrean', 'fasilitas_id']],
  },
  {
    path: 'layanan',
    table: 'layanan',
    label: 'Layanan',
    fields: ['fasilitas_id', 'nama_layanan', 'deskripsi', 'estimasi_durasi', 'biaya', 'aktif'],
    required: (b) => (!b.fasilitas_id || !b.nama_layanan ? 'Fasilitas ID dan nama layanan wajib diisi' : null),
    msgs: { list: 'Data layanan berhasil diambil', one: 'Data layanan berhasil ditemukan', create: 'Layanan berhasil ditambahkan', update: 'Layanan berhasil diperbarui', del: 'Layanan berhasil dihapus', notFound: 'Layanan tidak ditemukan' },
    children: [['jadwal_dokter', 'layanan_id'], ['antrean', 'layanan_id']],
  },
  {
    path: 'dokter',
    table: 'dokter',
    label: 'Dokter',
    fields: ['fasilitas_id', 'nama_dokter', 'spesialisasi', 'no_telepon', 'aktif'],
    required: (b) => (!b.fasilitas_id || !b.nama_dokter ? 'Fasilitas ID dan nama dokter wajib diisi' : null),
    msgs: { list: 'Data dokter berhasil diambil', one: 'Data dokter berhasil ditemukan', create: 'Dokter berhasil ditambahkan', update: 'Data dokter berhasil diperbarui', del: 'Dokter berhasil dihapus', notFound: 'Dokter tidak ditemukan' },
    children: [['jadwal_dokter', 'dokter_id'], ['antrean', 'dokter_id']],
  },
  {
    path: 'jadwal-dokter',
    table: 'jadwal_dokter',
    label: 'Jadwal dokter',
    fields: ['dokter_id', 'layanan_id', 'hari', 'jam_mulai', 'jam_selesai', 'kuota', 'aktif'],
    required: (b) =>
      !b.dokter_id || !b.layanan_id || !b.hari || !b.jam_mulai || !b.jam_selesai ? 'Dokter ID, layanan ID, hari, jam mulai, dan jam selesai wajib diisi' : null,
    msgs: { list: 'Data jadwal dokter berhasil diambil', one: 'Jadwal dokter berhasil ditemukan', create: 'Jadwal dokter berhasil ditambahkan', update: 'Jadwal dokter berhasil diperbarui', del: 'Jadwal dokter berhasil dihapus', notFound: 'Jadwal dokter tidak ditemukan' },
    children: [['antrean', 'jadwal_dokter_id']],
  },
];

const masterRoutes = MASTER.flatMap((m) => [
  ['GET', new RegExp(`^/${m.path}$`), (ctx) => (requireAuth(ctx), ok(200, { message: m.msgs.list, data: getDB()[m.table] }))],
  [
    'GET',
    new RegExp(`^/${m.path}/(\\d+)$`),
    (ctx) => {
      requireAuth(ctx);
      const row = findById(m.table, ctx.params[0]);
      if (!row) fail(404, m.msgs.notFound);
      return ok(200, { message: m.msgs.one, data: row });
    },
  ],
  [
    'POST',
    new RegExp(`^/${m.path}$`),
    (ctx) => {
      requireAdmin(ctx);
      const err = m.required(ctx.body);
      if (err) fail(400, err);
      const row = { id: nextId(m.table) };
      m.fields.forEach((f) => {
        row[f] = ctx.body[f] ?? (f === 'aktif' ? true : null);
      });
      getDB()[m.table].push(row);
      saveDB();
      return ok(201, { message: m.msgs.create, data: row });
    },
  ],
  [
    'PUT',
    new RegExp(`^/${m.path}/(\\d+)$`),
    (ctx) => {
      requireAdmin(ctx);
      const row = findById(m.table, ctx.params[0]);
      if (!row) fail(404, m.msgs.notFound);
      m.fields.forEach((f) => {
        if (ctx.body[f] !== undefined) row[f] = ctx.body[f];
      });
      saveDB();
      return ok(200, { message: m.msgs.update, data: row });
    },
  ],
  [
    'DELETE',
    new RegExp(`^/${m.path}/(\\d+)$`),
    (ctx) => {
      requireAdmin(ctx);
      const db = getDB();
      const row = findById(m.table, ctx.params[0]);
      if (!row) fail(404, m.msgs.notFound);
      // Simulasi foreign key Postgres (backend mengembalikan 500 dengan pesan FK).
      const used = m.children.find(([t, key]) => db[t].some((c) => String(c[key]) === String(row.id)));
      if (used) fail(409, `${m.label} tidak dapat dihapus karena masih digunakan pada data ${used[0].replace('_', ' ')}`);
      db[m.table] = db[m.table].filter((r) => r !== row);
      saveDB();
      return ok(200, { message: m.msgs.del });
    },
  ],
]);

// ---------- handler per endpoint ----------
const routes = [
  // ===== Auth =====
  [
    'POST',
    /^\/auth\/login$/,
    ({ body }) => {
      const { email, password } = body;
      if (!email || !password) fail(400, 'Email dan password wajib diisi');
      const admin = getDB().admin.find((a) => a.email.toLowerCase() === String(email).trim().toLowerCase());
      if (!admin || admin.password !== password) fail(401, 'Email atau password salah');
      const token = encodeToken({ id: admin.id, email: admin.email, role: admin.role });
      return ok(200, { message: 'Login berhasil', data: { id: admin.id, nama_admin: admin.nama_admin, email: admin.email, role: admin.role }, token });
    },
  ],
  [
    'POST',
    /^\/pasien-auth\/register$/,
    ({ body }) => {
      const { nama_pasien, email, password, kategori_pasien } = body;
      if (!nama_pasien || !email || !password || !kategori_pasien) fail(400, 'Nama, email, password, dan kategori pasien wajib diisi');
      if (password.length < 8) fail(400, 'Password minimal 8 karakter');
      const db = getDB();
      if (db.pasien.some((p) => p.email && p.email.toLowerCase() === email.trim().toLowerCase())) fail(400, 'Email sudah terdaftar');
      const row = {
        id: nextId('pasien'),
        nama_pasien,
        email: email.trim().toLowerCase(),
        password,
        tanggal_lahir: body.tanggal_lahir || null,
        jenis_kelamin: body.jenis_kelamin || null,
        no_telepon: body.no_telepon || null,
        alamat: body.alamat || null,
        kategori_pasien,
        kebutuhan_khusus: body.kebutuhan_khusus || null,
      };
      db.pasien.push(row);
      saveDB();
      return ok(201, { message: 'Registrasi pasien berhasil', data: { id: row.id, nama_pasien, email: row.email, kategori_pasien } });
    },
  ],
  [
    'POST',
    /^\/pasien-auth\/login$/,
    ({ body }) => {
      const { email, password } = body;
      if (!email || !password) fail(400, 'Email dan password wajib diisi');
      const pasien = getDB().pasien.find((p) => p.email && p.email.toLowerCase() === email.trim().toLowerCase());
      if (!pasien || pasien.password !== password) fail(401, 'Email atau password salah');
      const token = encodeToken({ id: pasien.id, email: pasien.email, role: 'pasien' });
      return ok(200, { message: 'Login pasien berhasil', data: { id: pasien.id, nama_pasien: pasien.nama_pasien, email: pasien.email, role: 'pasien' }, token });
    },
  ],

  // ===== Reset password (OTP) — pasien & admin =====
  [
    'POST',
    /^\/password-reset\/request$/,
    ({ body }) => {
      const { email, role } = body;
      if (!email || !role) fail(400, 'Email dan role wajib diisi');
      if (!['admin', 'pasien'].includes(role)) fail(400, 'Role tidak valid');
      const db = getDB();
      const normalized = email.trim().toLowerCase();
      const table = role === 'admin' ? db.admin : db.pasien;
      if (!table.find((p) => p.email && p.email.toLowerCase() === normalized)) return ok(200, { message: 'Jika akun ditemukan, OTP akan diproses.' });
      db.password_reset_otps.forEach((o) => {
        if (o.email === normalized && o.role === role && !o.used_at) o.used_at = now();
      });
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      db.password_reset_otps.push({ id: nextId('password_reset_otps'), email: normalized, role, otp, attempts: 0, expires_at: new Date(Date.now() + 300000).toISOString(), used_at: null, created_at: now() });
      saveDB();
      // Backend asli mencetak OTP di console server; mock mengirimkannya agar bisa diuji.
      return ok(200, { message: 'Jika akun ditemukan, OTP akan diproses.', simulasi_otp: otp });
    },
  ],
  ...['verify', 'reset'].map((step) => [
    'POST',
    new RegExp(`^/password-reset/${step}$`),
    ({ body }) => {
      const { email, role, otp, new_password } = body;
      if (step === 'verify' && (!email || !role || !otp)) fail(400, 'Email, role, dan OTP wajib diisi');
      if (step === 'reset' && (!email || !role || !otp || !new_password)) fail(400, 'Semua field wajib diisi');
      if (!['admin', 'pasien'].includes(role)) fail(400, 'Role tidak valid');
      if (!/^\d{6}$/.test(otp)) fail(400, 'Format OTP tidak valid');
      if (step === 'reset' && new_password.length < 8) fail(400, 'Password minimal 8 karakter');
      const db = getDB();
      const normalized = email.trim().toLowerCase();
      const otpData = db.password_reset_otps
        .filter((o) => o.email === normalized && o.role === role && !o.used_at)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
      if (!otpData) fail(400, 'OTP tidak ditemukan atau sudah digunakan');
      if (new Date(otpData.expires_at) < new Date()) fail(400, 'OTP sudah kedaluwarsa');
      if (otpData.attempts >= 5) fail(429, 'Batas percobaan OTP telah tercapai');
      if (otpData.otp !== otp) {
        otpData.attempts += 1;
        saveDB();
        fail(400, 'Kode OTP salah');
      }
      if (step === 'verify') return ok(200, { message: 'OTP berhasil diverifikasi' });
      const account = (role === 'admin' ? db.admin : db.pasien).find((p) => p.email && p.email.toLowerCase() === normalized);
      if (account) account.password = new_password;
      otpData.used_at = now();
      saveDB();
      return ok(200, { message: 'Password berhasil diperbarui' });
    },
  ]),

  ...masterRoutes,

  // ===== Admin (semua butuh role admin) =====
  ['GET', /^\/admin$/, (ctx) => (requireAdmin(ctx), ok(200, { message: 'Data admin berhasil diambil', data: getDB().admin.map(publicAdmin) }))],
  [
    'GET',
    /^\/admin\/(\d+)$/,
    (ctx) => {
      requireAdmin(ctx);
      const row = findById('admin', ctx.params[0]);
      if (!row) fail(404, 'Admin tidak ditemukan');
      return ok(200, { message: 'Data admin berhasil ditemukan', data: publicAdmin(row) });
    },
  ],
  [
    'POST',
    /^\/admin$/,
    (ctx) => {
      requireAdmin(ctx);
      const { nama_admin, email, password, role } = ctx.body;
      if (!nama_admin || !email || !password) fail(400, 'Nama admin, email, dan password wajib diisi');
      const db = getDB();
      if (db.admin.some((a) => a.email.toLowerCase() === email.trim().toLowerCase())) fail(400, 'Email admin sudah terdaftar');
      const row = { id: nextId('admin'), nama_admin, email: email.trim(), password, role: role || 'admin', created_at: now() };
      db.admin.push(row);
      saveDB();
      return ok(201, { message: 'Admin berhasil ditambahkan', data: publicAdmin(row) });
    },
  ],
  [
    'PUT',
    /^\/admin\/(\d+)$/,
    (ctx) => {
      requireAdmin(ctx);
      const db = getDB();
      const row = findById('admin', ctx.params[0]);
      if (!row) fail(404, 'Admin tidak ditemukan');
      const { nama_admin, email, password, role } = ctx.body;
      if (email && db.admin.some((a) => a !== row && a.email.toLowerCase() === email.trim().toLowerCase())) fail(400, 'Email admin sudah digunakan');
      if (nama_admin !== undefined) row.nama_admin = nama_admin;
      if (email !== undefined) row.email = email;
      if (role !== undefined) row.role = role;
      if (password) row.password = password;
      saveDB();
      return ok(200, { message: 'Data admin berhasil diperbarui', data: publicAdmin(row) });
    },
  ],
  [
    'DELETE',
    /^\/admin\/(\d+)$/,
    (ctx) => {
      requireAdmin(ctx);
      const db = getDB();
      const row = findById('admin', ctx.params[0]);
      if (!row) fail(404, 'Admin tidak ditemukan');
      db.admin = db.admin.filter((a) => a !== row);
      saveDB();
      return ok(200, { message: 'Admin berhasil dihapus' });
    },
  ],

  // ===== Pasien =====
  ['GET', /^\/pasien$/, (ctx) => (requireAdmin(ctx), ok(200, { message: 'Data pasien berhasil diambil', data: getDB().pasien.map(publicPasien) }))],
  [
    'GET',
    /^\/pasien\/(\d+)$/,
    (ctx) => {
      const user = requireAuth(ctx);
      if (user.role === 'pasien' && String(user.id) !== String(ctx.params[0])) fail(403, 'Akses ditolak. Kamu hanya dapat melihat data milik sendiri.');
      const row = findById('pasien', ctx.params[0]);
      if (!row) fail(404, 'Pasien tidak ditemukan');
      return ok(200, { message: 'Data pasien berhasil ditemukan', data: publicPasien(row) });
    },
  ],
  [
    'POST',
    /^\/pasien$/,
    (ctx) => {
      requireAdmin(ctx);
      const b = ctx.body;
      if (!b.nama_pasien || typeof b.nama_pasien !== 'string' || !b.nama_pasien.trim() || !b.kategori_pasien || !String(b.kategori_pasien).trim()) {
        fail(400, 'Nama pasien dan kategori pasien wajib diisi');
      }
      if (b.tanggal_lahir && !validDate(b.tanggal_lahir)) fail(400, 'Tanggal lahir tidak valid');
      if (b.no_telepon && !PHONE.test(String(b.no_telepon).trim())) fail(400, 'Format nomor telepon tidak valid');
      if (!['Umum', 'BPJS', 'Asuransi'].includes(String(b.kategori_pasien).trim())) fail(400, 'Kategori pasien harus Umum, BPJS, atau Asuransi');
      if (typeof b.jenis_kelamin !== 'string' || !['Laki-laki', 'Perempuan'].includes(b.jenis_kelamin.trim())) fail(400, 'Jenis kelamin harus Laki-laki atau Perempuan');
      const row = {
        id: nextId('pasien'),
        nama_pasien: b.nama_pasien.trim(),
        email: null,
        password: null,
        tanggal_lahir: b.tanggal_lahir || null,
        jenis_kelamin: b.jenis_kelamin.trim(),
        no_telepon: b.no_telepon ? String(b.no_telepon).trim() : null,
        alamat: b.alamat ?? null,
        kategori_pasien: String(b.kategori_pasien).trim(),
        kebutuhan_khusus: b.kebutuhan_khusus ?? null,
      };
      getDB().pasien.push(row);
      saveDB();
      return ok(201, { message: 'Pasien berhasil ditambahkan', data: publicPasien(row) });
    },
  ],
  [
    'PUT',
    /^\/pasien\/(\d+)$/,
    (ctx) => {
      const user = requireAuth(ctx);
      if (user.role === 'pasien' && String(user.id) !== String(ctx.params[0])) fail(403, 'Akses ditolak. Kamu hanya dapat mengubah data milik sendiri.');
      const row = findById('pasien', ctx.params[0]);
      if (!row) fail(404, 'Pasien tidak ditemukan');
      const b = ctx.body;
      const update = {};
      if (b.nama_pasien !== undefined) {
        if (typeof b.nama_pasien !== 'string' || !b.nama_pasien.trim()) fail(400, 'Nama pasien tidak boleh kosong');
        update.nama_pasien = b.nama_pasien.trim();
      }
      if (b.tanggal_lahir !== undefined) {
        if (b.tanggal_lahir === null || b.tanggal_lahir === '') update.tanggal_lahir = null;
        else if (!validDate(b.tanggal_lahir)) fail(400, 'Tanggal lahir tidak valid');
        else update.tanggal_lahir = b.tanggal_lahir;
      }
      if (b.no_telepon !== undefined) {
        if (b.no_telepon === null || b.no_telepon === '') update.no_telepon = null;
        else if (!PHONE.test(String(b.no_telepon).trim())) fail(400, 'Format nomor telepon tidak valid');
        else update.no_telepon = String(b.no_telepon).trim();
      }
      if (b.kategori_pasien !== undefined) {
        if (typeof b.kategori_pasien !== 'string' || !['Umum', 'BPJS', 'Asuransi'].includes(b.kategori_pasien.trim())) fail(400, 'Kategori pasien harus Umum, BPJS, atau Asuransi');
        update.kategori_pasien = b.kategori_pasien.trim();
      }
      if (b.jenis_kelamin !== undefined) {
        if (typeof b.jenis_kelamin !== 'string' || !['Laki-laki', 'Perempuan'].includes(b.jenis_kelamin.trim())) fail(400, 'Jenis kelamin harus Laki-laki atau Perempuan');
        update.jenis_kelamin = b.jenis_kelamin.trim();
      }
      if (b.alamat !== undefined) update.alamat = b.alamat;
      if (b.kebutuhan_khusus !== undefined) update.kebutuhan_khusus = b.kebutuhan_khusus;
      if (Object.keys(update).length === 0) fail(400, 'Tidak ada data yang diperbarui');
      Object.assign(row, update);
      saveDB();
      return ok(200, { message: 'Data pasien berhasil diperbarui', data: publicPasien(row) });
    },
  ],
  [
    'DELETE',
    /^\/pasien\/(\d+)$/,
    (ctx) => {
      requireAdmin(ctx);
      const db = getDB();
      const row = findById('pasien', ctx.params[0]);
      if (!row) fail(404, 'Pasien tidak ditemukan');
      if (db.antrean.some((a) => String(a.pasien_id) === String(row.id))) fail(409, 'Pasien tidak dapat dihapus karena masih memiliki data antrean');
      db.pasien = db.pasien.filter((p) => p !== row);
      saveDB();
      return ok(200, { message: 'Pasien berhasil dihapus' });
    },
  ],

  // ===== Antrean =====
  [
    'GET',
    /^\/antrean$/,
    (ctx) => {
      requireAdmin(ctx);
      const db = getDB();
      db.antrean.forEach(simulate);
      saveDB();
      return ok(200, { message: 'Data antrean berhasil diambil', data: db.antrean.map(strip) });
    },
  ],
  [
    'GET',
    /^\/antrean\/(\d+)$/,
    (ctx) => {
      const user = requireAuth(ctx);
      const row = findById('antrean', ctx.params[0]);
      if (!row) fail(404, 'Data antrean tidak ditemukan');
      if (user.role === 'pasien' && String(row.pasien_id) !== String(user.id)) fail(403, 'Akses ditolak. Kamu hanya dapat melihat antrean milik sendiri.');
      simulate(row);
      saveDB();
      return ok(200, { message: 'Data antrean berhasil ditemukan', data: strip(row) });
    },
  ],
  // Endpoint tambahan KHUSUS simulasi (belum ada di backend), lihat README.
  [
    'GET',
    /^\/antrean\/(\d+)\/progres$/,
    (ctx) => {
      const user = requireAuth(ctx);
      const row = findById('antrean', ctx.params[0]);
      if (!row) fail(404, 'Data antrean tidak ditemukan');
      if (user.role === 'pasien' && String(row.pasien_id) !== String(user.id)) fail(403, 'Akses ditolak. Kamu hanya dapat melihat antrean milik sendiri.');
      simulate(row);
      saveDB();
      return ok(200, { message: 'Progres antrean berhasil diambil', data: progressOf(row) });
    },
  ],
  [
    'POST',
    /^\/antrean$/,
    (ctx) => {
      const user = requireAuth(ctx);
      const { fasilitas_id, layanan_id, dokter_id, jadwal_dokter_id, tanggal_kunjungan, kategori_pasien } = ctx.body;
      if (!fasilitas_id || !layanan_id || !dokter_id || !jadwal_dokter_id || !tanggal_kunjungan) fail(400, 'Fasilitas, layanan, dokter, jadwal dokter, dan tanggal kunjungan wajib diisi');
      const finalPasienId = user.role === 'pasien' ? user.id : ctx.body.pasien_id;
      if (!finalPasienId) fail(400, 'Pasien ID wajib diisi');
      if (!findById('pasien', finalPasienId)) fail(400, 'Pasien tidak ditemukan');

      const layanan = findById('layanan', layanan_id);
      if (!layanan) fail(400, 'Layanan tidak ditemukan');
      if (String(layanan.fasilitas_id) !== String(fasilitas_id)) fail(400, 'Layanan tidak sesuai dengan fasilitas kesehatan');
      const dokter = findById('dokter', dokter_id);
      if (!dokter) fail(400, 'Dokter tidak ditemukan');
      if (String(dokter.fasilitas_id) !== String(fasilitas_id)) fail(400, 'Dokter tidak bertugas di fasilitas yang dipilih');
      const jadwal = findById('jadwal_dokter', jadwal_dokter_id);
      if (!jadwal) fail(400, 'Jadwal dokter tidak ditemukan');
      if (String(jadwal.dokter_id) !== String(dokter_id) || String(jadwal.layanan_id) !== String(layanan_id)) fail(400, 'Jadwal dokter tidak sesuai dengan dokter atau layanan yang dipilih');
      if (!jadwal.aktif) fail(400, 'Jadwal dokter sedang tidak aktif');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal_kunjungan)) fail(400, 'Format tanggal kunjungan tidak valid');
      if (tanggal_kunjungan <= todayJakarta()) fail(400, 'Tanggal kunjungan harus setelah hari ini');
      if (hariDariTanggal(tanggal_kunjungan) !== jadwal.hari) fail(400, `Jadwal dokter hanya tersedia pada hari ${jadwal.hari}`);

      const db = getDB();
      const sameSlot = db.antrean.filter((a) => String(a.jadwal_dokter_id) === String(jadwal_dokter_id) && a.tanggal_kunjungan === tanggal_kunjungan);
      if (sameSlot.length >= jadwal.kuota) fail(400, 'Kuota antrean pada jadwal ini sudah penuh');
      if (sameSlot.some((a) => String(a.pasien_id) === String(finalPasienId) && !sameStatus(a.status_antrean, STATUS.DIBATALKAN))) {
        fail(400, 'Pasien sudah terdaftar pada jadwal dan tanggal yang sama');
      }

      // Backend: nomor dimulai A001 untuk setiap kombinasi jadwal & tanggal.
      const number = sameSlot.length + 1;
      const row = {
        id: nextId('antrean'),
        pasien_id: Number(finalPasienId),
        fasilitas_id: Number(fasilitas_id),
        layanan_id: Number(layanan_id),
        dokter_id: Number(dokter_id),
        jadwal_dokter_id: Number(jadwal_dokter_id),
        admin_id: user.role === 'admin' ? user.id : null,
        nomor_antrean: `A${String(number).padStart(3, '0')}`,
        tanggal_kunjungan,
        kategori_pasien: kategori_pasien ?? null,
        status_antrean: STATUS.MENUNGGU,
        created_at: now(),
      };
      // Simulasi pergerakan hanya untuk antrean yang dibuat pasien (agar tampilan pasien bisa diuji).
      if (user.role === 'pasien') row.sim_ahead = 3;
      db.antrean.push(row);
      logRiwayat(row.id, STATUS.MENUNGGU, row.admin_id, 'Pendaftaran antrean');
      saveDB();
      return ok(201, { message: 'Antrean berhasil ditambahkan', data: strip(row) });
    },
  ],
  [
    'PUT',
    /^\/antrean\/(\d+)$/,
    (ctx) => {
      const user = requireAuth(ctx);
      const { status_antrean } = ctx.body;
      if (!status_antrean) fail(400, 'Status antrean wajib diisi');
      const row = findById('antrean', ctx.params[0]);
      if (!row) fail(404, 'Data antrean tidak ditemukan');
      simulate(row);
      const target = VALID_STATUS.find((s) => sameStatus(s, status_antrean));
      if (!target) fail(400, 'Status antrean tidak valid');
      if (user.role === 'pasien') {
        if (String(row.pasien_id) !== String(user.id)) fail(403, 'Kamu tidak memiliki akses ke antrean ini');
        if (target !== STATUS.DIBATALKAN) fail(403, 'Pasien hanya dapat membatalkan antrean');
        if (!sameStatus(row.status_antrean, STATUS.MENUNGGU)) fail(409, 'Antrean tidak dapat dibatalkan karena sudah diproses');
      } else if (user.role === 'admin') {
        if (sameStatus(row.status_antrean, STATUS.SELESAI) || sameStatus(row.status_antrean, STATUS.DIBATALKAN)) {
          fail(409, 'Antrean yang sudah selesai atau dibatalkan tidak dapat diubah');
        }
      } else fail(409, 'Role tidak valid');
      row.status_antrean = target;
      logRiwayat(row.id, target, user.role === 'admin' ? user.id : null, null);
      saveDB();
      return ok(200, { message: user.role === 'pasien' ? 'Antrean berhasil dibatalkan' : 'Status antrean berhasil diperbarui', data: strip(row) });
    },
  ],
  [
    'DELETE',
    /^\/antrean\/(\d+)$/,
    (ctx) => {
      requireAdmin(ctx);
      const db = getDB();
      const row = findById('antrean', ctx.params[0]);
      if (!row) fail(404, 'Data antrean tidak ditemukan');
      if (db.riwayat_antrean.some((r) => String(r.antrean_id) === String(row.id))) fail(409, 'Antrean tidak dapat dihapus karena masih memiliki data riwayat');
      db.antrean = db.antrean.filter((a) => a !== row);
      saveDB();
      return ok(200, { message: 'Antrean berhasil dihapus', id: row.id });
    },
  ],

  // ===== Riwayat antrean =====
  [
    'GET',
    /^\/riwayat-antrean$/,
    (ctx) => {
      requireAdmin(ctx);
      return ok(200, { message: 'Data riwayat antrean berhasil diambil', data: [...getDB().riwayat_antrean].sort((a, b) => b.id - a.id) });
    },
  ],
  [
    'GET',
    /^\/riwayat-antrean\/(\d+)$/,
    (ctx) => {
      const user = requireAuth(ctx);
      const row = findById('riwayat_antrean', ctx.params[0]);
      if (!row) fail(404, 'Riwayat antrean tidak ditemukan');
      const antrean = findById('antrean', row.antrean_id);
      if (user.role === 'pasien' && String(antrean?.pasien_id) !== String(user.id)) fail(403, 'Akses ditolak. Kamu hanya dapat melihat riwayat antrean milik sendiri.');
      return ok(200, { message: 'Data riwayat antrean berhasil ditemukan', data: { ...row, antrean: { pasien_id: antrean?.pasien_id } } });
    },
  ],
  [
    'POST',
    /^\/riwayat-antrean$/,
    (ctx) => {
      requireAdmin(ctx);
      const { antrean_id, admin_id, status_antrean, keterangan } = ctx.body;
      if (!antrean_id || !status_antrean) fail(400, 'Antrean ID dan status antrean wajib diisi');
      const row = { id: nextId('riwayat_antrean'), antrean_id, admin_id: admin_id || null, status_antrean, keterangan: keterangan ?? null, created_at: now() };
      getDB().riwayat_antrean.push(row);
      saveDB();
      return ok(201, { message: 'Riwayat antrean berhasil ditambahkan', data: row });
    },
  ],
  [
    'PUT',
    /^\/riwayat-antrean\/(\d+)$/,
    (ctx) => {
      requireAdmin(ctx);
      const { antrean_id, admin_id, status_antrean, keterangan } = ctx.body;
      if (!antrean_id || !status_antrean) fail(400, 'Antrean ID dan status antrean wajib diisi');
      const row = findById('riwayat_antrean', ctx.params[0]);
      if (!row) fail(404, 'Riwayat antrean tidak ditemukan');
      Object.assign(row, { antrean_id, admin_id: admin_id ?? row.admin_id, status_antrean, keterangan: keterangan ?? null });
      saveDB();
      return ok(200, { message: 'Riwayat antrean berhasil diperbarui', data: row });
    },
  ],
  [
    'DELETE',
    /^\/riwayat-antrean\/(\d+)$/,
    (ctx) => {
      requireAdmin(ctx);
      const db = getDB();
      const row = findById('riwayat_antrean', ctx.params[0]);
      if (!row) fail(404, 'Riwayat antrean tidak ditemukan');
      db.riwayat_antrean = db.riwayat_antrean.filter((r) => r !== row);
      saveDB();
      return ok(200, { message: 'Riwayat antrean berhasil dihapus' });
    },
  ],
];

const parseBody = (data) => {
  if (!data) return {};
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }
  return data;
};

export async function mockAdapter(config) {
  await wait();
  const method = (config.method || 'get').toUpperCase();
  const path = String(config.url || '').replace(/^https?:\/\/[^/]+/, '').replace(/^\/api/, '').split('?')[0];
  const headers = { ...(config.headers?.toJSON?.() ?? config.headers ?? {}) };

  let status = 404;
  let body = { message: `Endpoint ${method} ${path} tidak ditemukan` };

  for (const [m, pattern, handler] of routes) {
    const match = m === method && path.match(pattern);
    if (!match) continue;
    try {
      ({ status, body } = handler({ params: match.slice(1), body: parseBody(config.data), headers }));
    } catch (err) {
      status = err instanceof HttpError ? err.status : 500;
      body = { message: err instanceof HttpError ? err.message : 'Terjadi kesalahan pada server' };
      if (!(err instanceof HttpError)) console.error(err);
    }
    break;
  }

  // Serialisasi seperti respons HTTP asli: objek DB simulasi tidak boleh
  // ikut masuk ke Redux (Immer membekukan objek tersebut).
  body = JSON.parse(JSON.stringify(body));
  const response = { data: body, status, statusText: String(status), headers: {}, config, request: {} };
  if (status >= 200 && status < 300) return response;
  throw new AxiosError(body.message, status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST, config, {}, response);
}

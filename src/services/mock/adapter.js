// =====================================================================
// MOCK ADAPTER AXIOS
// Meniru endpoint backend QCare (routes/*.js) beserta validasi & format
// respons { message, data }. Dipakai selama backend belum disambungkan.
// Ketika VITE_USE_MOCK=false, file ini tidak dipakai sama sekali.
// =====================================================================
import { AxiosError } from 'axios';
import { getDB, saveDB, nextId } from './db';
import { todayJakarta, hariDariTanggal } from '../../utils/format';

const LATENCY = [250, 600];
const SIM_STEP_MS = 15000; // simulasi: antrean maju 1 nomor tiap 15 detik

const wait = () =>
  new Promise((r) => setTimeout(r, LATENCY[0] + Math.random() * (LATENCY[1] - LATENCY[0])));

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
const encodeToken = (payload) =>
  `mock.${btoa(JSON.stringify({ ...payload, exp: Date.now() + 24 * 60 * 60 * 1000 }))}`;

const decodeToken = (header) => {
  if (!header || !String(header).startsWith('Bearer ')) return null;
  try {
    const token = String(header).split(' ')[1];
    const payload = JSON.parse(atob(token.replace(/^mock\./, '')));
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
};

// verifyToken middleware
const requireAuth = (ctx) => {
  if (!ctx.headers.Authorization && !ctx.headers.authorization) {
    fail(401, 'Akses ditolak. Token tidak ditemukan.');
  }
  const user = decodeToken(ctx.headers.Authorization || ctx.headers.authorization);
  if (!user) fail(401, 'Token tidak valid atau sudah kedaluwarsa.');
  return user;
};

const publicPasien = ({ password, ...rest }) => rest;
const findById = (table, id) => getDB()[table].find((row) => String(row.id) === String(id));

// ---------- simulasi pergerakan antrean ----------
const simulate = (antrean) => {
  if (!antrean.sim_ahead && antrean.sim_ahead !== 0) return antrean;
  const status = antrean.status_antrean;
  if (!['menunggu', 'dipanggil'].includes(status)) return antrean;
  const steps = Math.floor((Date.now() - new Date(antrean.created_at).getTime()) / SIM_STEP_MS);
  if (steps >= antrean.sim_ahead + 3) antrean.status_antrean = 'selesai';
  else if (steps >= antrean.sim_ahead) antrean.status_antrean = 'dipanggil';
  return antrean;
};

const progressOf = (antrean) => {
  const layanan = findById('layanan', antrean.layanan_id);
  const durasi = Number(layanan?.estimasi_durasi) || 15;
  const prefix = String(antrean.nomor_antrean).split('-')[0];
  const myNumber = Number(String(antrean.nomor_antrean).split('-')[1]) || 1;
  const status = antrean.status_antrean;

  if (status === 'selesai' || status === 'dibatalkan') {
    return { nomor_berjalan: null, sisa_antrean_di_depan: 0, total_menunggu: 0, estimasi_menit: 0 };
  }
  const ahead0 = antrean.sim_ahead ?? 0;
  const steps = Math.floor((Date.now() - new Date(antrean.created_at).getTime()) / SIM_STEP_MS);
  const ahead = Math.max(0, ahead0 - steps);
  const runningNumber = Math.max(1, myNumber - ahead);
  const behind = 3;
  return {
    nomor_berjalan: `${prefix}-${String(runningNumber).padStart(3, '0')}`,
    sisa_antrean_di_depan: status === 'menunggu' ? ahead : 0,
    total_menunggu: ahead + 1 + behind,
    estimasi_menit: status === 'menunggu' ? ahead * durasi : 0,
  };
};

// ---------- handler per endpoint ----------
const routes = [
  // ===== Auth pasien =====
  [
    'POST',
    /^\/pasien-auth\/register$/,
    ({ body }) => {
      const { nama_pasien, email, password, kategori_pasien } = body;
      if (!nama_pasien || !email || !password || !kategori_pasien) {
        fail(400, 'Nama, email, password, dan kategori pasien wajib diisi');
      }
      if (password.length < 8) fail(400, 'Password minimal 8 karakter');
      const db = getDB();
      if (db.pasien.some((p) => p.email.toLowerCase() === email.trim().toLowerCase())) {
        fail(400, 'Email sudah terdaftar');
      }
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
      const { id, email: e, kategori_pasien: k } = row;
      return ok(201, { message: 'Registrasi pasien berhasil', data: { id, nama_pasien, email: e, kategori_pasien: k } });
    },
  ],
  [
    'POST',
    /^\/pasien-auth\/login$/,
    ({ body }) => {
      const { email, password } = body;
      if (!email || !password) fail(400, 'Email dan password wajib diisi');
      const pasien = getDB().pasien.find((p) => p.email.toLowerCase() === email.trim().toLowerCase());
      if (!pasien || pasien.password !== password) fail(401, 'Email atau password salah');
      const token = encodeToken({ id: pasien.id, email: pasien.email, role: 'pasien' });
      return ok(200, {
        message: 'Login pasien berhasil',
        data: { id: pasien.id, nama_pasien: pasien.nama_pasien, email: pasien.email, role: 'pasien' },
        token,
      });
    },
  ],

  // ===== Reset password (OTP) =====
  [
    'POST',
    /^\/password-reset\/request$/,
    ({ body }) => {
      const { email, role } = body;
      if (!email || !role) fail(400, 'Email dan role wajib diisi');
      if (!['admin', 'pasien'].includes(role)) fail(400, 'Role tidak valid');
      const db = getDB();
      const normalized = email.trim().toLowerCase();
      const account = db.pasien.find((p) => p.email === normalized);
      if (!account) return ok(200, { message: 'Jika akun ditemukan, OTP akan diproses.' });
      db.password_reset_otps.forEach((o) => {
        if (o.email === normalized && !o.used_at) o.used_at = new Date().toISOString();
      });
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      db.password_reset_otps.push({
        id: nextId('password_reset_otps'),
        email: normalized,
        role,
        otp,
        attempts: 0,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        used_at: null,
        created_at: new Date().toISOString(),
      });
      saveDB();
      // Backend asli hanya mencetak OTP di console server (simulasi lokal).
      // Mock mengirimkannya di respons agar alur bisa diuji dari browser.
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
      const pasien = db.pasien.find((p) => p.email === normalized);
      if (pasien) pasien.password = new_password;
      otpData.used_at = new Date().toISOString();
      saveDB();
      return ok(200, { message: 'Password berhasil diperbarui' });
    },
  ]),

  // ===== Master data (butuh token) =====
  ...[
    ['fasilitas', 'fasilitas_kesehatan', 'Fasilitas kesehatan'],
    ['layanan', 'layanan', 'Layanan'],
    ['dokter', 'dokter', 'Dokter'],
    ['jadwal-dokter', 'jadwal_dokter', 'Jadwal dokter'],
  ].flatMap(([path, table, label]) => [
    [
      'GET',
      new RegExp(`^/${path}$`),
      (ctx) => {
        requireAuth(ctx);
        return ok(200, { message: `Data ${label.toLowerCase()} berhasil diambil`, data: getDB()[table] });
      },
    ],
    [
      'GET',
      new RegExp(`^/${path}/(\\d+)$`),
      (ctx) => {
        requireAuth(ctx);
        const row = findById(table, ctx.params[0]);
        if (!row) fail(404, `${label} tidak ditemukan`);
        return ok(200, { message: `Data ${label.toLowerCase()} berhasil ditemukan`, data: row });
      },
    ],
  ]),

  // ===== Pasien =====
  [
    'GET',
    /^\/pasien\/(\d+)$/,
    (ctx) => {
      const user = requireAuth(ctx);
      if (user.role === 'pasien' && String(user.id) !== String(ctx.params[0])) {
        fail(403, 'Akses ditolak. Kamu hanya dapat melihat data milik sendiri.');
      }
      const row = findById('pasien', ctx.params[0]);
      if (!row) fail(404, 'Pasien tidak ditemukan');
      return ok(200, { message: 'Data pasien berhasil ditemukan', data: publicPasien(row) });
    },
  ],
  [
    'PUT',
    /^\/pasien\/(\d+)$/,
    (ctx) => {
      const user = requireAuth(ctx);
      if (user.role === 'pasien' && String(user.id) !== String(ctx.params[0])) {
        fail(403, 'Akses ditolak. Kamu hanya dapat mengubah data milik sendiri.');
      }
      const row = findById('pasien', ctx.params[0]);
      if (!row) fail(404, 'Pasien tidak ditemukan');
      // Validasi mengikuti pasienController (versi terbaru).
      const b = ctx.body;
      const update = {};
      if (b.nama_pasien !== undefined) {
        if (typeof b.nama_pasien !== 'string' || !b.nama_pasien.trim()) fail(400, 'Nama pasien tidak boleh kosong');
        update.nama_pasien = b.nama_pasien.trim();
      }
      if (b.tanggal_lahir !== undefined) {
        if (b.tanggal_lahir === null || b.tanggal_lahir === '') update.tanggal_lahir = null;
        else {
          const t = new Date(b.tanggal_lahir);
          if (
            typeof b.tanggal_lahir !== 'string' ||
            Number.isNaN(t.getTime()) ||
            t.toISOString().slice(0, 10) !== b.tanggal_lahir ||
            b.tanggal_lahir > new Date().toISOString().slice(0, 10)
          ) {
            fail(400, 'Tanggal lahir tidak valid');
          }
          update.tanggal_lahir = b.tanggal_lahir;
        }
      }
      if (b.no_telepon !== undefined) {
        if (b.no_telepon === null || b.no_telepon === '') update.no_telepon = null;
        else {
          if (!/^[0-9+\-\s]{8,20}$/.test(String(b.no_telepon).trim())) fail(400, 'Format nomor telepon tidak valid');
          update.no_telepon = String(b.no_telepon).trim();
        }
      }
      if (b.kategori_pasien !== undefined) {
        if (typeof b.kategori_pasien !== 'string' || !['Umum', 'BPJS', 'Asuransi'].includes(b.kategori_pasien.trim())) {
          fail(400, 'Kategori pasien harus Umum, BPJS, atau Asuransi');
        }
        update.kategori_pasien = b.kategori_pasien.trim();
      }
      if (b.jenis_kelamin !== undefined) {
        if (typeof b.jenis_kelamin !== 'string' || !['Laki-laki', 'Perempuan'].includes(b.jenis_kelamin.trim())) {
          fail(400, 'Jenis kelamin harus Laki-laki atau Perempuan');
        }
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

  // ===== Antrean =====
  [
    'GET',
    /^\/antrean$/,
    (ctx) => {
      const user = requireAuth(ctx);
      if (user.role !== 'admin') fail(403, 'Akses ditolak. Kamu tidak memiliki izin.');
      return ok(200, { message: 'Data antrean berhasil diambil', data: getDB().antrean });
    },
  ],
  [
    'GET',
    /^\/antrean\/(\d+)$/,
    (ctx) => {
      const user = requireAuth(ctx);
      const row = findById('antrean', ctx.params[0]);
      if (!row) fail(404, 'Data antrean tidak ditemukan');
      if (user.role === 'pasien' && String(row.pasien_id) !== String(user.id)) {
        fail(403, 'Akses ditolak. Kamu hanya dapat melihat antrean milik sendiri.');
      }
      simulate(row);
      saveDB();
      const { sim_ahead, ...data } = row;
      return ok(200, { message: 'Data antrean berhasil ditemukan', data });
    },
  ],
  // Endpoint tambahan khusus simulasi (BELUM ada di backend).
  // Lihat README: rekomendasi GET /api/antrean/:id/progres.
  [
    'GET',
    /^\/antrean\/(\d+)\/progres$/,
    (ctx) => {
      const user = requireAuth(ctx);
      const row = findById('antrean', ctx.params[0]);
      if (!row) fail(404, 'Data antrean tidak ditemukan');
      if (user.role === 'pasien' && String(row.pasien_id) !== String(user.id)) {
        fail(403, 'Akses ditolak. Kamu hanya dapat melihat antrean milik sendiri.');
      }
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
      if (!fasilitas_id || !layanan_id || !dokter_id || !jadwal_dokter_id || !tanggal_kunjungan) {
        fail(400, 'Fasilitas, layanan, dokter, jadwal dokter, dan tanggal kunjungan wajib diisi');
      }
      const finalPasienId = user.role === 'pasien' ? user.id : ctx.body.pasien_id;
      if (!finalPasienId) fail(400, 'Pasien ID wajib diisi');

      const layanan = findById('layanan', layanan_id);
      if (!layanan) fail(400, 'Layanan tidak ditemukan');
      if (String(layanan.fasilitas_id) !== String(fasilitas_id)) fail(400, 'Layanan tidak sesuai dengan fasilitas kesehatan');

      const dokter = findById('dokter', dokter_id);
      if (!dokter) fail(400, 'Dokter tidak ditemukan');
      if (String(dokter.fasilitas_id) !== String(fasilitas_id)) fail(400, 'Dokter tidak bertugas di fasilitas yang dipilih');

      const jadwal = findById('jadwal_dokter', jadwal_dokter_id);
      if (!jadwal) fail(400, 'Jadwal dokter tidak ditemukan');
      if (String(jadwal.dokter_id) !== String(dokter_id) || String(jadwal.layanan_id) !== String(layanan_id)) {
        fail(400, 'Jadwal dokter tidak sesuai dengan dokter atau layanan yang dipilih');
      }
      if (!jadwal.aktif) fail(400, 'Jadwal dokter sedang tidak aktif');

      if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal_kunjungan)) fail(400, 'Format tanggal kunjungan tidak valid');
      if (tanggal_kunjungan <= todayJakarta()) fail(400, 'Tanggal kunjungan harus setelah hari ini');
      if (hariDariTanggal(tanggal_kunjungan) !== jadwal.hari) {
        fail(400, `Jadwal dokter hanya tersedia pada hari ${jadwal.hari}`);
      }

      const db = getDB();
      const sameSlot = db.antrean.filter(
        (a) => String(a.jadwal_dokter_id) === String(jadwal_dokter_id) && a.tanggal_kunjungan === tanggal_kunjungan
      );
      if (sameSlot.length >= jadwal.kuota) fail(400, 'Kuota antrean pada jadwal ini sudah penuh');

      // Prefix nomor per layanan (A, B, C, ...) seperti nomor antrean loket.
      const prefix = String.fromCharCode(64 + (((Number(layanan_id) - 1) % 26) + 1));
      const number = sameSlot.length + 1 + 3; // +3 = pasien walk-in (simulasi)
      const row = {
        id: nextId('antrean'),
        pasien_id: finalPasienId,
        fasilitas_id: Number(fasilitas_id),
        layanan_id: Number(layanan_id),
        dokter_id: Number(dokter_id),
        jadwal_dokter_id: Number(jadwal_dokter_id),
        admin_id: user.role === 'admin' ? user.id : null,
        nomor_antrean: `${prefix}-${String(number).padStart(3, '0')}`,
        tanggal_kunjungan,
        kategori_pasien: kategori_pasien ?? null,
        status_antrean: 'menunggu',
        created_at: new Date().toISOString(),
        sim_ahead: number - 1 > 4 ? 4 : number - 1,
      };
      db.antrean.push(row);
      db.riwayat_antrean.push({
        id: nextId('riwayat_antrean'),
        antrean_id: row.id,
        status_sebelumnya: null,
        status_baru: 'menunggu',
        created_at: row.created_at,
      });
      saveDB();
      const { sim_ahead, ...data } = row;
      return ok(201, { message: 'Antrean berhasil ditambahkan', data });
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
      if (user.role === 'pasien') {
        if (String(row.pasien_id) !== String(user.id)) fail(403, 'Kamu tidak memiliki akses ke antrean ini');
        if (status_antrean !== 'dibatalkan') fail(403, 'Pasien hanya dapat membatalkan antrean');
        if (row.status_antrean !== 'menunggu') fail(409, 'Antrean tidak dapat dibatalkan karena sudah diproses');
      }
      const before = row.status_antrean;
      row.status_antrean = status_antrean;
      const db = getDB();
      db.riwayat_antrean.push({
        id: nextId('riwayat_antrean'),
        antrean_id: row.id,
        status_sebelumnya: before,
        status_baru: status_antrean,
        created_at: new Date().toISOString(),
      });
      saveDB();
      const { sim_ahead, ...data } = row;
      return ok(200, {
        message: user.role === 'pasien' ? 'Antrean berhasil dibatalkan' : 'Status antrean berhasil diperbarui',
        data,
      });
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
    }
    break;
  }

  const response = { data: body, status, statusText: String(status), headers: {}, config, request: {} };
  if (status >= 200 && status < 300) return response;
  throw new AxiosError(
    body.message,
    status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
    config,
    {},
    response
  );
}

const idr = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

export const formatRupiah = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return 'Gratis';
  return idr.format(n);
};

export const NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const URUTAN_HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

// "08:00:00" -> "08.00"
export const formatJam = (time) => (time ? String(time).slice(0, 5).replace(':', '.') : '-');

// Tanggal hari ini di zona Asia/Jakarta, format YYYY-MM-DD (sama dengan backend).
export const todayJakarta = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

const parseISODate = (iso) => new Date(`${iso}T00:00:00Z`);

export const hariDariTanggal = (iso) => NAMA_HARI[parseISODate(iso).getUTCDay()];

export const addDays = (iso, days) => {
  const d = parseISODate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

// Tanggal-tanggal berikutnya (setelah hari ini) yang jatuh pada hari praktik.
export const nextDatesForHari = (hari, count = 4) => {
  const result = [];
  let cursor = addDays(todayJakarta(), 1);
  for (let i = 0; i < 60 && result.length < count; i += 1) {
    if (hariDariTanggal(cursor) === hari) result.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return result;
};

export const formatTanggal = (iso, opts = {}) => {
  if (!iso) return '-';
  const d = String(iso).length <= 10 ? parseISODate(iso) : new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    weekday: opts.short ? undefined : 'long',
    day: 'numeric',
    month: opts.short ? 'short' : 'long',
    year: 'numeric',
    timeZone: String(iso).length <= 10 ? 'UTC' : 'Asia/Jakarta',
  }).format(d);
};

export const formatDurasi = (menit) => {
  const m = Math.max(0, Math.round(Number(menit) || 0));
  if (m < 60) return `${m} menit`;
  const j = Math.floor(m / 60);
  const sisa = m % 60;
  return sisa ? `${j} jam ${sisa} menit` : `${j} jam`;
};

export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || 'Q';

export const greeting = () => {
  const h = Number(
    new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Jakarta' }).format(new Date())
  );
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 18) return 'Selamat sore';
  return 'Selamat malam';
};

export const hariIni = () => hariDariTanggal(todayJakarta());

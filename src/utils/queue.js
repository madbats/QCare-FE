// Pemetaan status antrean -> tampilan & arahan untuk pasien
// (mengikuti cabang keputusan di user flow "Queue Monitoring").

const STATUS_META = {
  menunggu: {
    label: 'Sedang Menunggu',
    tone: 'secondary',
    title: 'Tetap Pantau Antreanmu',
    guide: 'Datang sebelum nomor dipanggil agar tidak melewatkan giliran.',
  },
  dipanggil: {
    label: 'Dipanggil',
    tone: 'primary',
    title: 'Giliranmu dipanggil!',
    guide: 'Segera menuju loket/ruang layanan dan tunjukkan tiket antrean ini kepada petugas.',
  },
  dilayani: {
    label: 'Sedang Dilayani',
    tone: 'primary',
    title: 'Kamu sedang dilayani',
    guide: 'Ikuti arahan petugas di ruang layanan.',
  },
  selesai: {
    label: 'Selesai',
    tone: 'secondary',
    title: 'Pelayanan selesai',
    guide: 'Terima kasih telah menggunakan QCare. Semoga lekas sehat!',
  },
  dibatalkan: {
    label: 'Dibatalkan',
    tone: 'neutral',
    title: 'Antrean dibatalkan',
    guide: 'Antrean ini tidak berlaku lagi. Kamu bisa mendaftar antrean baru kapan saja.',
  },
  terlewat: {
    label: 'Terlewat',
    tone: 'danger',
    title: 'Antrean terlewat',
    guide: 'Nomor kamu sudah dipanggil namun tidak hadir. Hubungi petugas atau daftar ulang.',
  },
};

export const normalizeStatus = (status) => String(status || 'menunggu').trim().toLowerCase();

export const statusMeta = (status) => {
  const key = normalizeStatus(status);
  return { key, ...(STATUS_META[key] || { label: status || '-', tone: 'neutral', title: status, guide: '' }) };
};

export const isActiveStatus = (status) => ['menunggu', 'dipanggil', 'dilayani'].includes(normalizeStatus(status));
export const canCancel = (status) => normalizeStatus(status) === 'menunggu';

// RPC Supabase bisa mengembalikan object atau array berisi satu baris.
export const unwrapRow = (data) => (Array.isArray(data) ? data[0] ?? null : data ?? null);

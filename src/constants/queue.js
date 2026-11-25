// Nilai status_antrean yang dikirim ke backend.
// README backend memakai huruf kapital di awal ("Menunggu"). Jika fungsi RPC
// `update_status_antrean_atomik` di database memakai penulisan lain, cukup
// ubah nilai di file ini — seluruh tampilan membandingkan status tanpa
// memperhatikan huruf besar/kecil.
export const STATUS = {
  MENUNGGU: 'Menunggu',
  DIPANGGIL: 'Dipanggil',
  DILAYANI: 'Dilayani',
  SELESAI: 'Selesai',
  DIBATALKAN: 'Dibatalkan',
};

export const ACTIVE_STATUSES = [STATUS.MENUNGGU, STATUS.DIPANGGIL, STATUS.DILAYANI];

export const sameStatus = (a, b) => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();

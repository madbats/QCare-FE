// =====================================================================
// Kategori & kebutuhan pasien
//
// Backend (pasienController) hanya menerima kategori_pasien:
//   "Umum" | "BPJS" | "Asuransi"   (jenis penjamin/pembayaran)
// Sedangkan user flow & Figma memakai kelompok Umum / Anak / Lansia /
// Disabilitas. Agar keduanya terpenuhi tanpa mengubah backend:
//   - kategori_pasien  -> Umum / BPJS / Asuransi
//   - kelompok pasien  -> disimpan di kebutuhan_khusus, mis. "Kelompok: Lansia"
//   - bantuan khusus   -> ikut disimpan di kebutuhan_khusus
// =====================================================================

export const KATEGORI_PASIEN = [
  { value: 'Umum', label: 'Umum', desc: 'Biaya pribadi' },
  { value: 'BPJS', label: 'BPJS', desc: 'Peserta BPJS Kesehatan' },
  { value: 'Asuransi', label: 'Asuransi', desc: 'Asuransi swasta/perusahaan' },
];

export const KELOMPOK_PASIEN = [
  { value: 'Umum', label: 'Umum', desc: 'Pasien dewasa tanpa prioritas khusus' },
  { value: 'Anak', label: 'Anak', desc: 'Di bawah 18 tahun, didampingi orang tua/wali' },
  { value: 'Lansia', label: 'Lansia', desc: 'Usia 60 tahun ke atas, mendapat prioritas' },
<<<<<<< HEAD
  { value: 'Ibu Hamil', label: 'Ibu Hamil', desc: 'Mendapat prioritas & kursi tunggu khusus' },
=======
>>>>>>> 70022d6b3150e76b505d0f2f72b76916f9069b73
  { value: 'Disabilitas', label: 'Disabilitas', desc: 'Mendapat prioritas & pendampingan' },
];

// "Memerlukan bantuan khusus?" -> pendampingan, akses, atau komunikasi.
export const KEBUTUHAN_KHUSUS = [
  { value: 'Pendampingan petugas', group: 'Pendampingan' },
  { value: 'Kursi roda', group: 'Akses' },
  { value: 'Akses tanpa tangga', group: 'Akses' },
  { value: 'Juru bahasa isyarat', group: 'Komunikasi' },
  { value: 'Informasi teks besar', group: 'Komunikasi' },
  { value: 'Panggilan langsung oleh petugas', group: 'Komunikasi' },
];

export const JENIS_KELAMIN = ['Laki-laki', 'Perempuan'];

const KELOMPOK_PREFIX = 'Kelompok:';

// Teks kebutuhan_khusus <-> { kelompok, needs, otherNeed }
export const parseKebutuhan = (text) => {
  const parts = text
    ? String(text)
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const kelompokPart = parts.find((p) => p.startsWith(KELOMPOK_PREFIX));
  const kelompok = kelompokPart ? kelompokPart.slice(KELOMPOK_PREFIX.length).trim() : 'Umum';
  const rest = parts.filter((p) => !p.startsWith(KELOMPOK_PREFIX));
  const known = KEBUTUHAN_KHUSUS.map((k) => k.value);
  return {
    kelompok: KELOMPOK_PASIEN.some((k) => k.value === kelompok) ? kelompok : 'Umum',
    needs: rest.filter((n) => known.includes(n)),
    otherNeed: rest.filter((n) => !known.includes(n)).join(', '),
  };
};

export const buildKebutuhan = ({ kelompok, needHelp, needs, otherNeed }) => {
  const parts = [];
  if (kelompok && kelompok !== 'Umum') parts.push(`${KELOMPOK_PREFIX} ${kelompok}`);
  if (needHelp) {
    parts.push(...needs);
    if (otherNeed?.trim()) parts.push(otherNeed.trim());
  }
  return parts.length ? parts.join('; ') : null;
};

export const needsLabel = ({ needHelp, needs, otherNeed }) => {
  const list = needHelp ? [...needs, ...(otherNeed?.trim() ? [otherNeed.trim()] : [])] : [];
  return list.length ? list.join(', ') : 'Tidak ada';
};

// Validasi yang sama dengan backend (pasienController)
export const PHONE_REGEX = /^[0-9+\-\s]{8,20}$/;

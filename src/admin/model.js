import { createSelector } from '@reduxjs/toolkit';
import { useEffect } from 'react';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { fetchResource } from './store/adminDataSlice';
import { STATUS, sameStatus, ACTIVE_STATUSES } from '../constants/queue';
import { parseKebutuhan } from '../constants/patient';
import { nextDatesForHari, todayJakarta, URUTAN_HARI, hariDariTanggal } from '../utils/format';

// ---------------------------------------------------------------------
// Hook: ambil resource yang dibutuhkan halaman (+ polling bila diminta).
// ---------------------------------------------------------------------
export function useAdminResources(names, { poll } = {}) {
  const dispatch = useDispatch();
  const key = names.join(',');
  const states = useSelector((s) => names.map((n) => s.adminData[n]), shallowEqual);

  useEffect(() => {
    key.split(',').forEach((name) => dispatch(fetchResource({ name })));
  }, [dispatch, key]);

  // Data antrean diperbarui berkala ("real-time" tanpa websocket).
  const pollKey = poll?.join(',') ?? '';
  useEffect(() => {
    if (!pollKey) return undefined;
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') pollKey.split(',').forEach((name) => dispatch(fetchResource({ name, force: true })));
    }, 15000);
    return () => clearInterval(t);
  }, [dispatch, pollKey]);

  const loading = states.some((r) => r.status === 'idle' || (r.status === 'loading' && !r.loadedAt));
  const failed = states.find((r) => r.status === 'failed' && !r.loadedAt);
  return {
    loading,
    error: failed?.error ?? null,
    retry: () => key.split(',').forEach((name) => dispatch(fetchResource({ name, force: true }))),
    refresh: () => key.split(',').forEach((name) => dispatch(fetchResource({ name, force: true }))),
  };
}

// ---------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------
const byId = (list) => Object.fromEntries(list.map((r) => [String(r.id), r]));

export const selectAdminMaps = createSelector(
  [
    (s) => s.adminData.pasien.items,
    (s) => s.adminData.dokter.items,
    (s) => s.adminData.layanan.items,
    (s) => s.adminData.fasilitas.items,
    (s) => s.adminData.jadwal.items,
    (s) => s.adminData.admin.items,
  ],
  (pasien, dokter, layanan, fasilitas, jadwal, admin) => ({
    pasien: byId(pasien),
    dokter: byId(dokter),
    layanan: byId(layanan),
    fasilitas: byId(fasilitas),
    jadwal: byId(jadwal),
    admin: byId(admin),
  })
);

// Kelompok pasien (disimpan di kebutuhan_khusus, lihat constants/patient.js)
export const KELOMPOK_TONE = { Umum: 'slate', Anak: 'sky', Lansia: 'amber', 'Ibu Hamil': 'rose', Disabilitas: 'purple' };
export const KELOMPOK_LABEL = { Disabilitas: 'Difabel' };
export const KELOMPOK_FILTERS = [
  { value: 'Lansia', label: 'Lansia' },
  { value: 'Anak', label: 'Anak' },
  { value: 'Ibu Hamil', label: 'Ibu Hamil' },
  { value: 'Disabilitas', label: 'Difabel / Kebutuhan Khusus' },
  { value: 'Umum', label: 'Umum' },
];

export const pasienInfo = (pasien) => {
  const parsed = parseKebutuhan(pasien?.kebutuhan_khusus);
  const notes = [...parsed.needs, ...(parsed.otherNeed ? [parsed.otherNeed] : [])];
  return {
    kelompok: parsed.kelompok,
    kelompokLabel: KELOMPOK_LABEL[parsed.kelompok] ?? parsed.kelompok,
    tone: KELOMPOK_TONE[parsed.kelompok] ?? 'slate',
    prioritas: parsed.kelompok !== 'Umum',
    kebutuhanText: notes.join(', '),
    needs: parsed.needs,
    otherNeed: parsed.otherNeed,
  };
};

export const umur = (tanggal) => {
  if (!tanggal) return null;
  const b = new Date(`${String(tanggal).slice(0, 10)}T00:00:00Z`);
  const t = new Date(`${todayJakarta()}T00:00:00Z`);
  let age = t.getUTCFullYear() - b.getUTCFullYear();
  if (t.getUTCMonth() < b.getUTCMonth() || (t.getUTCMonth() === b.getUTCMonth() && t.getUTCDate() < b.getUTCDate())) age -= 1;
  return age >= 0 ? age : null;
};

// Antrean diperkaya dengan nama pasien, layanan, dokter, jadwal, dll.
export const selectAntreanEnriched = createSelector([(s) => s.adminData.antrean.items, selectAdminMaps], (antrean, maps) =>
  antrean.map((a) => {
    const pasien = maps.pasien[String(a.pasien_id)];
    return {
      ...a,
      pasien,
      layanan: maps.layanan[String(a.layanan_id)],
      dokter: maps.dokter[String(a.dokter_id)],
      jadwal: maps.jadwal[String(a.jadwal_dokter_id)],
      fasilitas: maps.fasilitas[String(a.fasilitas_id)],
      info: pasienInfo(pasien),
      // Backend mengisi admin_id saat petugas yang mendaftarkan.
      jalur: a.admin_id ? 'Loket Admin' : 'Online Registration',
      active: ACTIVE_STATUSES.some((st) => sameStatus(st, a.status_antrean)),
    };
  })
);

export const isStatus = (a, status) => sameStatus(a?.status_antrean ?? a, status);

// Kuota terpakai untuk jadwal + tanggal tertentu (backend menghitung semua baris).
export const kuotaTerpakai = (antrean, jadwalId, tanggal) =>
  antrean.filter((a) => String(a.jadwal_dokter_id) === String(jadwalId) && a.tanggal_kunjungan === tanggal).length;

// Tanggal praktik berikutnya (hari ini bila jadwalnya hari ini).
export const nextPracticeDate = (hari) => (hariDariTanggal(todayJakarta()) === hari ? todayJakarta() : nextDatesForHari(hari, 1)[0]);

export const sortJadwal = (a, b) =>
  URUTAN_HARI.indexOf(a.hari) - URUTAN_HARI.indexOf(b.hari) || String(a.jam_mulai).localeCompare(String(b.jam_mulai));

export const jamWib = (iso) =>
  iso ? new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).format(new Date(iso)).replace('.', ':') : '-';

export const tanggalPendek = (iso) =>
  iso
    ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: String(iso).length <= 10 ? 'UTC' : 'Asia/Jakarta' }).format(
        new Date(String(iso).length <= 10 ? `${iso}T00:00:00Z` : iso)
      )
    : '-';

export const tanggalJakarta = (iso) =>
  iso ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso)) : null;

// Status antrean -> warna pill (Figma admin)
export const STATUS_TONE = {
  menunggu: 'amber',
  dipanggil: 'teal',
  dilayani: 'sky',
  selesai: 'teal',
  dibatalkan: 'rose',
};

export { STATUS };

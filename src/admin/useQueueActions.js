import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { changeQueueStatus } from './store/adminDataSlice';
import { showToast } from '../features/ui/uiSlice';
import { STATUS } from '../constants/queue';

// Aksi pelayanan antrean yang dipakai di Dashboard, Antrean Aktif, dan
// Pelayanan Pasien. Setiap aksi = PUT /antrean/:id { status_antrean }.
export function useQueueActions() {
  const dispatch = useDispatch();
  const [busyId, setBusyId] = useState(null);

  const run = async (antrean, status, message, keterangan) => {
    setBusyId(antrean.id);
    try {
      await dispatch(changeQueueStatus({ id: antrean.id, status, keterangan })).unwrap();
      dispatch(showToast(message));
      return true;
    } catch (err) {
      dispatch(showToast(err?.message ?? 'Gagal memperbarui status antrean', 'danger'));
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const name = (a) => a.pasien?.nama_pasien ?? `Pasien #${a.pasien_id}`;

  return {
    busyId,
    call: (a) => run(a, STATUS.DIPANGGIL, `${a.nomor_antrean} · ${name(a)} dipanggil.`),
    serve: (a) => run(a, STATUS.DILAYANI, `${a.nomor_antrean} mulai dilayani.`),
    finish: (a, note) => run(a, STATUS.SELESAI, `${a.nomor_antrean} selesai & tersimpan di riwayat.`, note),
    cancel: (a, note) => run(a, STATUS.DIBATALKAN, `${a.nomor_antrean} dibatalkan.`, note),
    // Panggil ulang tidak mengubah status (pengumuman ulang di loket).
    recall: (a) => dispatch(showToast(`Memanggil ulang ${a.nomor_antrean} · ${name(a)}.`, 'info')),
  };
}

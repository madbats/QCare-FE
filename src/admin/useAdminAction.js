import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { showToast } from '../features/ui/uiSlice';

// Jalankan thunk admin (simpan/hapus/ubah status) + toast sukses/gagal.
export function useAdminAction() {
  const dispatch = useDispatch();
  const [busy, setBusy] = useState(null);
  const run = async (key, thunk, success) => {
    setBusy(key);
    try {
      const result = await dispatch(thunk).unwrap();
      if (success) dispatch(showToast(success));
      return result ?? true;
    } catch (err) {
      dispatch(showToast(err?.message ?? 'Terjadi kesalahan, coba lagi.', 'danger'));
      return false;
    } finally {
      setBusy(null);
    }
  };
  return { busy, run };
}

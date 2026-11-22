import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { showToast } from '../features/ui/uiSlice';
import { normalizeStatus } from '../utils/queue';

const supported = () => typeof window !== 'undefined' && 'Notification' in window;

// Notifikasi saat giliran semakin dekat atau status antrean berubah
// (ide "Notifikasi Antrean" dari tahap Ideate).
export function useQueueNotifier(antrean, progress) {
  const dispatch = useDispatch();
  const [permission, setPermission] = useState(() => (supported() ? Notification.permission : 'unsupported'));
  const lastStatus = useRef(null);
  const nearNotified = useRef(false);

  const notify = useCallback(
    (title, body) => {
      dispatch(showToast(`${title} ${body}`, 'success'));
      if (supported() && Notification.permission === 'granted') {
        try {
          new Notification(title, { body, tag: `qcare-${antrean?.id}` });
        } catch {
          /* beberapa browser mobile hanya mengizinkan notifikasi via service worker */
        }
      }
    },
    [dispatch, antrean?.id]
  );

  useEffect(() => {
    if (!antrean) return;
    const status = normalizeStatus(antrean.status_antrean);
    if (lastStatus.current && lastStatus.current !== status) {
      if (status === 'dipanggil') notify('Giliranmu dipanggil!', `Nomor ${antrean.nomor_antrean}, segera menuju ruang layanan.`);
      else if (status === 'selesai') notify('Pelayanan selesai.', `Antrean ${antrean.nomor_antrean} telah selesai.`);
      else if (status === 'dibatalkan') notify('Antrean dibatalkan.', `Antrean ${antrean.nomor_antrean} tidak berlaku lagi.`);
    }
    lastStatus.current = status;
  }, [antrean, notify]);

  useEffect(() => {
    const ahead = progress?.sisa_antrean_di_depan;
    if (typeof ahead === 'number' && ahead > 0 && ahead <= 2 && !nearNotified.current) {
      nearNotified.current = true;
      notify('Giliranmu sudah dekat.', `Tinggal ${ahead} antrean lagi sebelum nomor ${antrean?.nomor_antrean}.`);
    }
  }, [progress, notify, antrean?.nomor_antrean]);

  const requestPermission = async () => {
    if (!supported()) return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') dispatch(showToast('Notifikasi antrean diaktifkan.'));
    else dispatch(showToast('Izin notifikasi ditolak browser.', 'danger'));
  };

  return { permission, requestPermission };
}

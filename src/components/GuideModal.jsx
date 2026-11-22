import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { closeGuide } from '../features/ui/uiSlice';
import { Modal } from './ui';
import Icon from './Icon';

// User Guidance: panduan langkah demi langkah (ikon + penjelasan singkat)
// yang muncul saat pertama kali membuka website.
export const GUIDE_STEPS = [
  {
    icon: 'building',
    title: 'Pilih fasilitas & layanan',
    text: 'Cari rumah sakit, puskesmas, atau klinik, lalu pilih layanan (poli) yang kamu butuhkan.',
  },
  {
    icon: 'calendar',
    title: 'Pilih dokter & tanggal',
    text: 'Pilih jadwal dokter yang tersedia, kemudian pilih tanggal kunjungan sesuai hari praktik.',
  },
  {
    icon: 'users',
    title: 'Isi kategori & kebutuhan',
    text: 'Pilih kategori layanan (Umum, Anak, Lansia, Disabilitas, Ibu hamil), jenis pembayaran (Umum, BPJS, Asuransi), dan bantuan khusus bila perlu.',
  },
  {
    icon: 'ticket',
    title: 'Konfirmasi & dapatkan nomor',
    text: 'Periksa ringkasan pendaftaran, konfirmasi, dan nomor antrean langsung muncul.',
  },
  {
    icon: 'bell',
    title: 'Pantau antreanmu',
    text: 'Lihat status antrean kapan saja dari menu Riwayat. Aktifkan notifikasi agar tidak terlewat.',
  },
];

export default function GuideModal() {
  const open = useSelector((state) => state.ui.guideOpen);
  const dispatch = useDispatch();
  const [index, setIndex] = useState(0);
  const step = GUIDE_STEPS[index];
  const last = index === GUIDE_STEPS.length - 1;

  const close = () => {
    dispatch(closeGuide());
    setIndex(0);
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Cara menggunakan QCare"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={index === 0 ? close : () => setIndex(index - 1)}>
            {index === 0 ? 'Lewati' : 'Sebelumnya'}
          </button>
          <button type="button" className="btn btn-primary" onClick={last ? close : () => setIndex(index + 1)}>
            {last ? 'Mulai' : 'Lanjut'} <Icon name={last ? 'check' : 'arrowRight'} size={18} />
          </button>
        </>
      }
    >
      <div className="guide-step">
        <span className="guide-illustration">
          <Icon name={step.icon} size={44} strokeWidth={1.6} />
          <span className="guide-number">{index + 1}</span>
        </span>
        <h3>{step.title}</h3>
        <p>{step.text}</p>
        <div className="guide-dots" aria-label={`Langkah ${index + 1} dari ${GUIDE_STEPS.length}`}>
          {GUIDE_STEPS.map((s, i) => (
            <button
              key={s.title}
              type="button"
              className={`dot ${i === index ? 'is-active' : ''}`}
              onClick={() => setIndex(i)}
              aria-label={`Langkah ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </Modal>
  );
}

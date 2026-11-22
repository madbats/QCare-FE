import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { cancelQueue, clearCurrent, fetchQueue, fetchQueueProgress } from '../features/queue/queueSlice';
import { selectMaps } from '../features/catalog/catalogSlice';
import { showToast } from '../features/ui/uiSlice';
import { useCatalog } from '../hooks/useCatalog';
import { useQueueNotifier } from '../hooks/useQueueNotifier';
import { InfoCard } from '../components/cards';
import { Alert, LoadingBlock, Modal, PageHeader, Spinner, StatusBadge } from '../components/ui';
import Icon from '../components/Icon';
import { canCancel, isActiveStatus, statusMeta } from '../utils/queue';
import { formatJam, formatTanggal } from '../utils/format';
import { USE_MOCK } from '../config/env';

const POLL_MS = 15000;

// Layar "05 • Tiket Antrean" + user flow "Queue Monitoring"
export default function QueueTicket() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const dispatch = useDispatch();
  useCatalog();
  const maps = useSelector(selectMaps);
  const { current, currentStatus, currentError, progress, cancelStatus, cancelError } = useSelector((state) => state.queue);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const antrean = String(current?.id) === String(id) ? current : null;
  const active = antrean ? isActiveStatus(antrean.status_antrean) : false;

  const refresh = useCallback(async () => {
    const result = await dispatch(fetchQueue(id));
    if (fetchQueue.fulfilled.match(result)) {
      setLastUpdated(new Date());
      if (isActiveStatus(result.payload?.status_antrean)) dispatch(fetchQueueProgress(id));
    }
  }, [dispatch, id]);

  useEffect(() => {
    refresh();
    return () => dispatch(clearCurrent());
  }, [refresh, dispatch]);

  // Polling hanya selama antrean aktif & tab sedang dilihat.
  useEffect(() => {
    if (!active) return undefined;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [active, refresh]);

  const { permission, requestPermission } = useQueueNotifier(antrean, progress);

  const handleCancel = async () => {
    try {
      await dispatch(cancelQueue(antrean.id)).unwrap();
      dispatch(showToast('Antrean berhasil dibatalkan.'));
      setConfirmOpen(false);
    } catch {
      /* pesan tampil di modal */
    }
  };

  // Cabang "Informasi antrean tersedia?" -> tidak: status belum tersedia + coba lagi.
  if (!antrean) {
    if (currentStatus === 'failed') {
      const notFound = currentError?.status === 404 || currentError?.status === 403;
      return (
        <div className="container page page-narrow">
          <PageHeader title="Tiket Antrean Saya" subtitle="Pantau progres antrean secara langsung" back="/riwayat" />
          <div className="state-block state-error" role="alert">
            <span className="state-icon">
              <Icon name="alert" size={26} />
            </span>
            <h3>{notFound ? 'Antrean tidak ditemukan' : 'Status antrean belum tersedia'}</h3>
            <p>{currentError?.message}</p>
            <div className="btn-row center">
              {!notFound && (
                <button type="button" className="btn btn-primary" onClick={refresh}>
                  <Icon name="refresh" size={18} /> Coba lagi
                </button>
              )}
              <Link to="/riwayat" className="btn btn-outline">
                Ke riwayat
              </Link>
            </div>
          </div>
        </div>
      );
    }
    return <LoadingBlock label="Memuat tiket antrean..." />;
  }

  const meta = statusMeta(antrean.status_antrean);
  const layanan = maps.layanan[String(antrean.layanan_id)];
  const fasilitas = maps.fasilitas[String(antrean.fasilitas_id)];
  const dokter = maps.dokter[String(antrean.dokter_id)];
  const jadwal = maps.jadwal[String(antrean.jadwal_dokter_id)];
  const durasi = Number(layanan?.estimasi_durasi) || 15;

  // Estimasi: dari progres (sisa antrean × durasi layanan) bila tersedia.
  let estimasi = '—';
  if (meta.key === 'dipanggil') estimasi = 'Sekarang';
  else if (!active) estimasi = '—';
  else if (progress) estimasi = progress.estimasi_menit > 0 ? `${progress.estimasi_menit}–${progress.estimasi_menit + durasi} menit` : 'Segera';
  else estimasi = 'Pantau status di halaman ini';

  return (
    <div className="container page page-narrow">
      <PageHeader title="Tiket Antrean Saya" subtitle="Pantau progres antrean secara langsung" back="/riwayat" />

      {params.get('baru') && meta.key === 'menunggu' && (
        <Alert tone="success" title="Pendaftaran berhasil!">
          Nomor antrean sudah diterbitkan. Tunjukkan tiket ini kepada petugas saat datang.
        </Alert>
      )}

      <div className="ticket-layout">
        <article className="ticket" aria-label={`Tiket antrean ${antrean.nomor_antrean}`}>
          <div className="ticket-head">
            <p className="ticket-brand">QCare · Antrean Digital</p>
            <p className="ticket-place">
              {fasilitas?.nama_fasilitas ?? '-'} • {layanan?.nama_layanan ?? '-'}
            </p>
          </div>
          <div className="ticket-body">
            <p className={`ticket-number ${active ? '' : 'is-inactive'}`} aria-live="polite">
              {antrean.nomor_antrean}
            </p>
            <p className="ticket-label">NOMOR ANTREAN KAMU</p>
            <div className="ticket-status">
              <StatusBadge status={antrean.status_antrean} />
            </div>
            <dl className="ticket-rows">
              {active && (
                <>
                  {progress?.nomor_berjalan && (
                    <div>
                      <dt>Sedang dilayani</dt>
                      <dd className="ticket-strong">{progress.nomor_berjalan}</dd>
                    </div>
                  )}
                  {progress && meta.key === 'menunggu' && (
                    <div>
                      <dt>Di depan kamu</dt>
                      <dd>{progress.sisa_antrean_di_depan} orang</dd>
                    </div>
                  )}
                  <div>
                    <dt>Estimasi menunggu</dt>
                    <dd className="ticket-accent">{estimasi}</dd>
                  </div>
                </>
              )}
              <div>
                <dt>Tanggal kunjungan</dt>
                <dd>{formatTanggal(antrean.tanggal_kunjungan, { short: true })}</dd>
              </div>
              <div>
                <dt>Jam praktik</dt>
                <dd>{jadwal ? `${formatJam(jadwal.jam_mulai)}–${formatJam(jadwal.jam_selesai)}` : '-'}</dd>
              </div>
              <div>
                <dt>Dokter</dt>
                <dd>{dokter?.nama_dokter ?? '-'}</dd>
              </div>
              {antrean.kategori_pasien && (
                <div>
                  <dt>Kategori</dt>
                  <dd>{antrean.kategori_pasien}</dd>
                </div>
              )}
            </dl>
          </div>
        </article>

        <div className="stack">
          <InfoCard tone={meta.key === 'dibatalkan' || meta.key === 'terlewat' ? 'neutral' : meta.tone === 'primary' ? 'primary' : 'secondary'} title={meta.title}>
            <p>{meta.guide}</p>
          </InfoCard>

          {active && (
            <div className="monitor-foot">
              <span className="muted small">
                {currentStatus === 'loading'
                  ? 'Memperbarui...'
                  : lastUpdated
                    ? `Diperbarui ${lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} · otomatis tiap 15 detik`
                    : ''}
              </span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={refresh} disabled={currentStatus === 'loading'}>
                <Icon name="refresh" size={16} /> Perbarui
              </button>
            </div>
          )}
          {currentStatus === 'failed' && (
            <Alert tone="warning" title="Status belum bisa diperbarui">
              {currentError?.message}{' '}
              <button type="button" className="link" onClick={refresh}>
                Coba lagi
              </button>
            </Alert>
          )}
          {USE_MOCK && active && <p className="small muted">Simulasi: antrean maju 1 nomor tiap 15 detik agar semua status bisa dicoba.</p>}

          {active && permission !== 'granted' && permission !== 'unsupported' && (
            <button type="button" className="btn btn-outline btn-block" onClick={requestPermission}>
              <Icon name="bell" size={18} /> Aktifkan notifikasi giliran
            </button>
          )}
          {active && permission === 'granted' && (
            <p className="small muted center">
              <Icon name="bell" size={15} /> Notifikasi aktif — kami kabari saat giliranmu dekat.
            </p>
          )}

          <Link to="/" className="btn-primary-action">
            Kembali ke Beranda
          </Link>
          {!active && (
            <Link to="/antrean/daftar" className="btn btn-outline btn-block">
              Ambil antrean baru
            </Link>
          )}
          {canCancel(antrean.status_antrean) && (
            <button type="button" className="btn btn-danger-ghost btn-block" onClick={() => setConfirmOpen(true)}>
              Batalkan antrean
            </button>
          )}
        </div>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Batalkan antrean?"
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setConfirmOpen(false)}>
              Tidak
            </button>
            <button type="button" className="btn btn-danger" onClick={handleCancel} disabled={cancelStatus === 'loading'}>
              {cancelStatus === 'loading' && <Spinner />} Ya, batalkan
            </button>
          </>
        }
      >
        <p>
          Nomor <strong>{antrean.nomor_antrean}</strong> untuk {layanan?.nama_layanan} pada {formatTanggal(antrean.tanggal_kunjungan)} akan
          dibatalkan dan tidak bisa dipulihkan.
        </p>
        {cancelError?.message && <Alert tone="danger">{cancelError.message}</Alert>}
      </Modal>
    </div>
  );
}

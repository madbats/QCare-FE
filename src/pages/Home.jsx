import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { selectFasilitasEnriched, selectMaps } from '../features/catalog/catalogSlice';
import { fetchHistory, selectActiveQueues } from '../features/queue/queueSlice';
import { useCatalog } from '../hooks/useCatalog';
import { FacilityCard } from '../components/cards';
import { ErrorState, SkeletonList, StatusBadge } from '../components/ui';
import { Logo } from '../components/Navbar';
import { formatTanggal } from '../utils/format';

// Layar "01 • Beranda"
export default function Home() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const { loading, error, retry } = useCatalog();
  const fasilitas = useSelector(selectFasilitasEnriched);
  const maps = useSelector(selectMaps);
  const activeQueues = useSelector(selectActiveQueues);
  const historyStatus = useSelector((state) => state.queue.historyStatus);

  useEffect(() => {
    if (historyStatus === 'idle') dispatch(fetchHistory());
  }, [dispatch, historyStatus]);

  // Rekomendasi: fasilitas yang buka hari ini & punya layanan online lebih dulu.
  const rekomendasi = useMemo(
    () => [...fasilitas].sort((a, b) => Number(b.openToday) - Number(a.openToday) || b.availableCount - a.availableCount),
    [fasilitas]
  );

  const nextQueue = activeQueues[0];
  const antreanSaya = nextQueue ? String(nextQueue.nomor_antrean).split('-').pop() : '—';

  return (
    <div className="container page">
      <div className="home-head">
        <span className="hide-desktop">
          <Logo size="sm" />
        </span>
        <p className="home-greet">
          Selamat datang{user?.nama_pasien ? `, ${user.nama_pasien.split(' ')[0]}` : ''} 👋
        </p>
      </div>
      <h1 className="home-title">Temukan Layanan Kesehatan</h1>

      <div className="home-grid">
        <div className="home-main">
          <section className="hero-banner" aria-label="Ambil antrean">
            <div className="hero-banner-text">
              <p className="hero-banner-title">
                Antrean Jadi Lebih
                <span>Praktis!</span>
              </p>
              <p className="hero-banner-sub">Pesan antrean dari mana saja dan hemat waktu menunggu.</p>
            </div>
            <Link to="/antrean/daftar" className="hero-banner-btn">
              Ambil antrean ›
            </Link>
          </section>

          <h2 className="section-title">Layanan Populer</h2>
          <div className="quick-grid">
            <Link to="/layanan" className="quick-card">
              <span className="quick-icon quick-secondary" aria-hidden="true">
                ⌕
              </span>
              <span className="quick-label">Cari Fasilitas</span>
            </Link>
            <Link to={nextQueue ? `/antrean/${nextQueue.id}` : '/antrean/daftar'} className="quick-card">
              <span className="quick-icon quick-primary quick-number" aria-hidden="true">
                {antreanSaya}
              </span>
              <span className="quick-label">Antrean Saya</span>
            </Link>
            <Link to="/riwayat" className="quick-card">
              <span className="quick-icon quick-secondary" aria-hidden="true">
                ↺
              </span>
              <span className="quick-label">Riwayat</span>
            </Link>
          </div>

          {nextQueue && (
            <Link to={`/antrean/${nextQueue.id}`} className="active-queue">
              <span className="active-queue-number">{nextQueue.nomor_antrean}</span>
              <span className="active-queue-body">
                <span className="active-queue-title">
                  {maps.layanan[String(nextQueue.layanan_id)]?.nama_layanan ?? 'Antrean aktif'}
                </span>
                <span className="active-queue-meta">
                  {maps.fasilitas[String(nextQueue.fasilitas_id)]?.nama_fasilitas} • {formatTanggal(nextQueue.tanggal_kunjungan, { short: true })}
                </span>
              </span>
              <StatusBadge status={nextQueue.status_antrean} />
            </Link>
          )}
        </div>

        <div className="home-side">
          <h2 className="section-title">Rekomendasi untuk Kamu</h2>
          {error ? (
            <ErrorState message={error.message} onRetry={retry} />
          ) : loading ? (
            <SkeletonList rows={2} />
          ) : (
            <div className="stack">
              {rekomendasi.slice(0, 3).map((f) => (
                <FacilityCard key={f.id} fasilitas={f} layanan={f.layanan} openToday={f.openToday} />
              ))}
            </div>
          )}
          <div className="home-note">
            <span className="chip chip-secondary">Pantau real-time</span>
            <p>Pantau antrean secara real-time dari menu Riwayat.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

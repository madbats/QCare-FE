import { useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchHistory } from '../features/queue/queueSlice';
import { selectMaps } from '../features/catalog/catalogSlice';
import { useCatalog } from '../hooks/useCatalog';
import { InfoCard, QueueCard } from '../components/cards';
import { EmptyState, ErrorState, PageHeader, SkeletonList } from '../components/ui';
import Icon from '../components/Icon';
import { isActiveStatus, normalizeStatus } from '../utils/queue';

// Layar "06 • Riwayat". Chip "Aktif" ditambahkan agar antrean yang masih
// berjalan mudah dipantau (user flow Queue Monitoring).
const FILTERS = [
  { key: 'semua', label: 'Semua', test: () => true },
  { key: 'aktif', label: 'Aktif', test: (q) => isActiveStatus(q.status_antrean) },
  { key: 'selesai', label: 'Selesai', test: (q) => normalizeStatus(q.status_antrean) === 'selesai' },
  { key: 'dibatalkan', label: 'Dibatalkan', test: (q) => ['dibatalkan', 'terlewat'].includes(normalizeStatus(q.status_antrean)) },
];

export default function History() {
  const dispatch = useDispatch();
  const catalog = useCatalog();
  const maps = useSelector(selectMaps);
  const { history, historyStatus, historyError } = useSelector((state) => state.queue);
  const [params, setParams] = useSearchParams();
  const filterKey = params.get('filter') ?? 'semua';
  const filter = FILTERS.find((f) => f.key === filterKey) ?? FILTERS[0];

  // Ambil data terbaru setiap halaman dibuka (status bisa berubah oleh petugas).
  useEffect(() => {
    dispatch(fetchHistory());
  }, [dispatch]);

  const list = useMemo(() => history.filter(filter.test), [history, filter]);
  // Tunggu master data agar nama fasilitas & poli langsung tampil.
  const loading = (historyStatus === 'loading' && history.length === 0) || (history.length > 0 && catalog.loading);

  return (
    <div className="container page">
      <PageHeader
        title="Riwayat Antrean"
        subtitle="Semua kunjungan kesehatanmu di sini"
        action={
          <button
            type="button"
            className="icon-btn"
            onClick={() => dispatch(fetchHistory())}
            aria-label="Muat ulang riwayat"
            disabled={historyStatus === 'loading'}
          >
            <Icon name="refresh" />
          </button>
        }
      />

      <div className="chip-row" role="tablist" aria-label="Filter riwayat">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={filter.key === f.key}
            className={`chip-btn ${filter.key === f.key ? 'is-active' : ''}`}
            onClick={() => setParams(f.key === 'semua' ? {} : { filter: f.key }, { replace: true })}
          >
            {f.label}
          </button>
        ))}
      </div>

      {historyStatus === 'failed' && history.length === 0 ? (
        <ErrorState message={historyError?.message} onRetry={() => dispatch(fetchHistory())} />
      ) : loading ? (
        <SkeletonList rows={3} />
      ) : list.length === 0 ? (
        <EmptyState
          icon="ticket"
          title={filter.key === 'aktif' ? 'Tidak ada antrean aktif' : 'Belum ada riwayat'}
          message="Antrean yang kamu daftarkan akan tampil di sini."
          action={
            <Link to="/antrean/daftar" className="btn btn-primary">
              Ambil antrean
            </Link>
          }
        />
      ) : (
        <div className="card-grid">
          {list.map((q) => (
            <QueueCard key={q.id} antrean={q} maps={maps} />
          ))}
        </div>
      )}

      <InfoCard tone="primary" title="Riwayat Kunjungan Tersimpan">
        <p>Akses informasi kunjungan sebelumnya dengan lebih mudah.</p>
      </InfoCard>
    </div>
  );
}

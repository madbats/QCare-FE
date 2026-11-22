import { useDeferredValue, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectFasilitasEnriched } from '../features/catalog/catalogSlice';
import { useCatalog } from '../hooks/useCatalog';
import { FacilityCard } from '../components/cards';
import { EmptyState, ErrorState, PageHeader, SkeletonList } from '../components/ui';

// Layar "02 • Katalog Layanan".
// Filter disimpan di URL (?q=&jenis=) agar bisa di-bookmark & tombol Back berfungsi.
export default function Services() {
  const { loading, error, retry } = useCatalog();
  const fasilitas = useSelector(selectFasilitasEnriched);
  const [params, setParams] = useSearchParams();

  const q = params.get('q') ?? '';
  const jenis = params.get('jenis') ?? '';
  const deferredQ = useDeferredValue(q);

  // Chip filter dari data (Puskesmas, Klinik, Rumah Sakit, ...) + "Buka hari ini".
  // Catatan: chip "Terdekat" di desain membutuhkan data lokasi yang belum ada di
  // backend, sehingga diganti "Buka hari ini".
  const chips = useMemo(() => {
    const types = [...new Set(fasilitas.map((f) => f.jenis_fasilitas).filter(Boolean))];
    return [{ value: '', label: 'Semua' }, ...types.map((t) => ({ value: t, label: t })), { value: 'buka', label: 'Buka hari ini' }];
  }, [fasilitas]);

  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const filtered = useMemo(() => {
    const term = deferredQ.trim().toLowerCase();
    return fasilitas
      .filter((f) => (jenis === 'buka' ? f.openToday : !jenis || f.jenis_fasilitas === jenis))
      .filter(
        (f) =>
          !term ||
          f.nama_fasilitas.toLowerCase().includes(term) ||
          (f.jenis_fasilitas ?? '').toLowerCase().includes(term) ||
          (f.alamat ?? '').toLowerCase().includes(term) ||
          f.layanan.some((l) => l.nama_layanan.toLowerCase().includes(term))
      )
      .sort((a, b) => b.availableCount - a.availableCount);
  }, [fasilitas, deferredQ, jenis]);

  return (
    <div className="container page">
      <PageHeader title="Cari Layanan" subtitle="Pilih fasilitas kesehatan sesuai kebutuhanmu" />

      <label className="search-card">
        <span aria-hidden="true">⌕</span>
        <input
          type="search"
          placeholder="Cari puskesmas, klinik, layanan..."
          aria-label="Cari puskesmas, klinik, atau layanan"
          value={q}
          onChange={(e) => update('q', e.target.value)}
        />
      </label>

      <div className="chip-row" role="group" aria-label="Filter fasilitas">
        {chips.map((c) => (
          <button
            key={c.value || 'semua'}
            type="button"
            className={`chip-btn ${jenis === c.value ? 'is-active' : ''}`}
            aria-pressed={jenis === c.value}
            onClick={() => update('jenis', c.value)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <h2 className="section-title">Fasilitas Tersedia</h2>
      {error ? (
        <ErrorState message={error.message} onRetry={retry} />
      ) : loading ? (
        <SkeletonList rows={4} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="search"
          title="Fasilitas tidak ditemukan"
          message="Coba kata kunci lain atau pilih filter yang berbeda."
          action={
            <button type="button" className="btn btn-outline" onClick={() => setParams({}, { replace: true })}>
              Reset filter
            </button>
          }
        />
      ) : (
        <div className="card-grid">
          {filtered.map((f) => (
            <FacilityCard key={f.id} fasilitas={f} layanan={f.layanan} openToday={f.openToday} />
          ))}
        </div>
      )}
    </div>
  );
}

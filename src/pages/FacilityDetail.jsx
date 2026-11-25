import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectFasilitasEnriched, selectMaps } from '../features/catalog/catalogSlice';
import { useCatalog } from '../hooks/useCatalog';
import { ServiceRow } from '../components/cards';
import { EmptyState, ErrorState, PageHeader, SkeletonList } from '../components/ui';
import Icon from '../components/Icon';
import { URUTAN_HARI, formatJam } from '../utils/format';

// Layar "03 • Detail Fasilitas"
export default function FacilityDetail() {
  const { id } = useParams();
  const { loading, error, retry } = useCatalog();
  const all = useSelector(selectFasilitasEnriched);
  const maps = useSelector(selectMaps);
  const [showSchedule, setShowSchedule] = useState(false);

  const fasilitas = all.find((f) => String(f.id) === String(id));

  const jadwalByHari = useMemo(() => {
    if (!fasilitas) return [];
    const rows = fasilitas.layanan.flatMap((l) => l.slots);
    return URUTAN_HARI.map((hari) => ({
      hari,
      rows: rows.filter((r) => r.hari === hari).sort((a, b) => String(a.jam_mulai).localeCompare(String(b.jam_mulai))),
    })).filter((g) => g.rows.length);
  }, [fasilitas]);

  if (error) return <div className="container page"><ErrorState message={error.message} onRetry={retry} /></div>;
  if (loading) return <div className="container page"><SkeletonList rows={4} /></div>;
  if (!fasilitas) {
    return (
      <div className="container page">
        <EmptyState
          icon="building"
          title="Fasilitas tidak ditemukan"
          message="Fasilitas ini mungkin sudah tidak tersedia."
          action={<Link to="/layanan" className="btn btn-primary">Cari fasilitas lain</Link>}
        />
      </div>
    );
  }

  return (
    <div className="container page">
      <PageHeader title="Detail Fasilitas" subtitle="Informasi layanan sebelum kamu mendaftar" back="/layanan" />

      <div className="detail-grid">
        <div>
          <div className="facility-hero" aria-hidden="true">
            <span className="facility-hero-circle">+</span>
            <span className="facility-hero-name">{fasilitas.nama_fasilitas}</span>
          </div>
          <h2 className="facility-title">{fasilitas.nama_fasilitas}</h2>
          <div className="facility-chips">
            <span className={`chip ${fasilitas.openToday ? 'chip-secondary' : 'chip-neutral'}`}>
              {fasilitas.openToday ? 'Buka hari ini' : 'Tutup hari ini'}
            </span>
            {fasilitas.jenis_fasilitas && <span className="chip chip-primary">{fasilitas.jenis_fasilitas}</span>}
          </div>
          <p className="facility-address">⌖ {fasilitas.alamat || 'Alamat belum tersedia'}</p>
          {(fasilitas.no_telepon || fasilitas.email) && (
            <p className="facility-contact">
              {fasilitas.no_telepon && (
                <a href={`tel:${fasilitas.no_telepon}`}>
                  <Icon name="phone" size={15} /> {fasilitas.no_telepon}
                </a>
              )}
              {fasilitas.email && (
                <a href={`mailto:${fasilitas.email}`}>
                  <Icon name="mail" size={15} /> {fasilitas.email}
                </a>
              )}
            </p>
          )}
        </div>

        <div>
          <h2 className="section-title">Layanan Tersedia</h2>
          {fasilitas.layanan.length === 0 ? (
            <EmptyState icon="stethoscope" title="Belum ada layanan" message="Fasilitas ini belum menambahkan layanan." />
          ) : (
            <div className="stack-sm">
              {fasilitas.layanan.map((l) => (
                <ServiceRow key={l.id} layanan={l} to={`/antrean/daftar?fasilitas=${fasilitas.id}&layanan=${l.id}`} />
              ))}
            </div>
          )}

          {jadwalByHari.length > 0 && (
            <div className="schedule">
              <button type="button" className="schedule-toggle" onClick={() => setShowSchedule((v) => !v)} aria-expanded={showSchedule}>
                {showSchedule ? 'Sembunyikan' : 'Lihat'} jadwal dokter
                <Icon name="chevronDown" size={18} className={showSchedule ? 'rotate-180' : ''} />
              </button>
              {showSchedule && (
                <div className="schedule-list">
                  {jadwalByHari.map((g) => (
                    <div key={g.hari} className="schedule-day">
                      <span className="schedule-hari">{g.hari}</span>
                      <span className="schedule-items">
                        {g.rows.map((r) => (
                          <span key={r.id}>
                            <strong>{maps.layanan[String(r.layanan_id)]?.nama_layanan}</strong> · {formatJam(r.jam_mulai)}–{formatJam(r.jam_selesai)}
                            <span className="muted block small">{maps.dokter[String(r.dokter_id)]?.nama_dokter}</span>
                          </span>
                        ))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {fasilitas.availableCount > 0 ? (
            <Link to={`/antrean/daftar?fasilitas=${fasilitas.id}`} className="btn-primary-action">
              Ambil Nomor Antrean
            </Link>
          ) : (
            <p className="muted center">Belum ada layanan yang bisa didaftarkan secara online.</p>
          )}
        </div>
      </div>
    </div>
  );
}

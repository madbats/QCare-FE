import { Link } from 'react-router-dom';
import Icon from './Icon';
import { StatusBadge } from './ui';
import { formatJam, formatTanggal } from '../utils/format';

// "Card Fasilitas" (Beranda & Katalog Layanan)
export function FacilityCard({ fasilitas, layanan = [], openToday }) {
  const tersedia = layanan.filter((l) => l.available);
  const ringkas = tersedia
    .slice(0, 2)
    .map((l) => l.nama_layanan.replace(/^Poli\s+/i, ''))
    .join(', ');
  return (
    <Link to={`/fasilitas/${fasilitas.id}`} className="facility-card">
      <span className="facility-tile" aria-hidden="true">
        +
      </span>
      <span className="facility-body">
        <span className="facility-name">{fasilitas.nama_fasilitas}</span>
        <span className="facility-meta">
          {ringkas ? `${ringkas}${tersedia.length > 2 ? ', dll' : ''}` : 'Belum ada layanan'} • {fasilitas.jenis_fasilitas || 'Faskes'}
        </span>
        <span className="facility-chips">
          {tersedia.length > 0 ? <span className="chip chip-secondary">Antrean online</span> : <span className="chip chip-neutral">Belum tersedia</span>}
          {openToday && <span className="chip chip-primary">Buka hari ini</span>}
        </span>
      </span>
    </Link>
  );
}

// Baris layanan di "Detail Fasilitas": ✓ nama · jam
export function ServiceRow({ layanan, to }) {
  const jam = layanan.slots.length
    ? `${formatJam(layanan.slots.reduce((m, s) => (s.jam_mulai < m ? s.jam_mulai : m), layanan.slots[0].jam_mulai))}–${formatJam(
        layanan.slots.reduce((m, s) => (s.jam_selesai > m ? s.jam_selesai : m), layanan.slots[0].jam_selesai)
      )}`
    : '—';
  const content = (
    <>
      <span className={`service-check ${layanan.available ? '' : 'is-off'}`} aria-hidden="true">
        {layanan.available ? '✓' : '✕'}
      </span>
      <span className="service-name">
        {layanan.nama_layanan}
        <span className="service-days">{layanan.available ? layanan.hariPraktik.join(', ') : layanan.unavailableReason}</span>
      </span>
      <span className="service-hours">{jam}</span>
    </>
  );
  return layanan.available ? (
    <Link to={to} className="service-row" aria-label={`Ambil antrean ${layanan.nama_layanan}`}>
      {content}
    </Link>
  ) : (
    <div className="service-row is-disabled">{content}</div>
  );
}

// Kartu riwayat (layar "Riwayat Antrean")
export function QueueCard({ antrean, maps }) {
  const layanan = maps.layanan[String(antrean.layanan_id)];
  const fasilitas = maps.fasilitas[String(antrean.fasilitas_id)];
  return (
    <Link to={`/antrean/${antrean.id}`} className="history-card">
      <span className="history-title">{fasilitas?.nama_fasilitas ?? 'Fasilitas kesehatan'}</span>
      <span className="history-meta">
        {layanan?.nama_layanan ?? `Layanan #${antrean.layanan_id}`} • {formatTanggal(antrean.tanggal_kunjungan, { short: true })}
      </span>
      <span className="history-divider" aria-hidden="true" />
      <span className="history-foot">
        <span className="history-number">Nomor {antrean.nomor_antrean}</span>
        <StatusBadge status={antrean.status_antrean} />
      </span>
    </Link>
  );
}

export function InfoCard({ tone = 'secondary', title, children }) {
  return (
    <div className={`info-card info-card-${tone}`}>
      <p className="info-card-title">{title}</p>
      <div className="info-card-body">{children}</div>
    </div>
  );
}

export function MenuCard({ icon, label, onClick, to, tone }) {
  const inner = (
    <>
      <span className="menu-icon">
        <Icon name={icon} size={22} />
      </span>
      <span className="menu-label">{label}</span>
      <span className="menu-chevron" aria-hidden="true">
        ›
      </span>
    </>
  );
  if (to) {
    return (
      <Link to={to} className={`menu-card ${tone ? `menu-${tone}` : ''}`}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" className={`menu-card ${tone ? `menu-${tone}` : ''}`} onClick={onClick}>
      {inner}
    </button>
  );
}

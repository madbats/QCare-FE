import { useEffect } from 'react';
import { Link, Navigate, NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { bootstrapAdmin } from './store/adminAuthSlice';
import Icon from '../components/Icon';
import { LoadingBlock, Toaster } from '../components/ui';
import { initials } from '../utils/format';
import { USE_MOCK } from '../config/env';
import './admin.css';

// Navigasi bawah Figma admin: Home · Antrean · Jadwal · Pasien · Lainnya
const NAV = [
  { to: '/admin', label: 'Home', icon: 'home', end: true },
  { to: '/admin/antrean', label: 'Antrean', icon: 'queue' },
  { to: '/admin/jadwal', label: 'Jadwal', icon: 'calendar' },
  { to: '/admin/pasien', label: 'Pasien', icon: 'users' },
  { to: '/admin/lainnya', label: 'Lainnya', icon: 'dots', also: ['/admin/dokter', '/admin/layanan', '/admin/fasilitas', '/admin/riwayat', '/admin/akun'] },
];

// Modul tambahan (ditampilkan langsung di sidebar desktop)
const MODULES = [
  { to: '/admin/dokter', label: 'Data Dokter', icon: 'stethoscope' },
  { to: '/admin/layanan', label: 'Layanan Medis', icon: 'heart' },
  { to: '/admin/fasilitas', label: 'Fasilitas Klinik', icon: 'building' },
  { to: '/admin/riwayat', label: 'Riwayat Antrean', icon: 'history' },
  { to: '/admin/akun', label: 'Kelola Admin & Akun', icon: 'shield' },
];

export function BrandMark() {
  return (
    <span className="a-brand-mark" aria-hidden="true">
      <Icon name="heart" size={22} strokeWidth={2} />
    </span>
  );
}

function Brand() {
  return (
    <Link to="/admin" className="a-brand" aria-label="QCARE Admin — Home">
      <BrandMark />
      <span className="a-brand-text">
        <strong>QCARE</strong>
        <small>Admin klinik</small>
      </span>
    </Link>
  );
}

export default function AdminLayout() {
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const { admin, initialized } = useSelector((s) => s.adminAuth);

  useEffect(() => {
    if (!initialized) dispatch(bootstrapAdmin());
  }, [dispatch, initialized]);

  if (!initialized) return <LoadingBlock label="Memeriksa sesi admin..." />;
  if (!admin) return <Navigate to="/admin/masuk" state={{ from: { pathname } }} replace />;

  const isActive = (item, active) => active || item.also?.some((p) => pathname.startsWith(p));
  const firstName = admin.nama_admin?.split(' ')[0] ?? 'Admin';

  return (
    <div className="admin-app a-shell">
      <a href="#a-konten" className="skip-link">
        Lewati ke konten utama
      </a>

      <aside className="a-sidebar" aria-label="Navigasi admin">
        <Brand />
        <nav className="a-side-nav">
          {NAV.slice(0, 4).map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive: a }) => `a-side-link ${a ? 'is-active' : ''}`}>
              <Icon name={item.icon} size={20} /> {item.label === 'Home' ? 'Dashboard' : item.label === 'Antrean' ? 'Antrean Aktif' : item.label === 'Jadwal' ? 'Jadwal Dokter' : 'Data Pasien'}
            </NavLink>
          ))}
          <p className="a-side-group">Modul Manajemen</p>
          {MODULES.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive: a }) => `a-side-link ${a ? 'is-active' : ''}`}>
              <Icon name={item.icon} size={20} /> {item.label}
            </NavLink>
          ))}
        </nav>
        <Link to="/admin/lainnya" className="a-side-profile">
          <span className="a-profile-initials">{initials(admin.nama_admin)}</span>
          <span>
            <strong>{admin.nama_admin}</strong>
            <small>{admin.email}</small>
          </span>
        </Link>
      </aside>

      <div className="a-main">
        <header className="a-header">
          <span className="a-header-brand">
            <Brand />
          </span>
          {USE_MOCK && <span className="a-mock">Mode simulasi</span>}
          <Link to="/admin/lainnya" className="a-profile-chip" aria-label="Profil admin">
            <strong>{initials(admin.nama_admin)}</strong>
            <span>{firstName}</span>
          </Link>
        </header>

        <main id="a-konten" className="a-content">
          <Outlet />
        </main>
      </div>

      <nav className="a-bottomnav" aria-label="Navigasi bawah admin">
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive: a }) => `a-bottom-link ${isActive(item, a) ? 'is-active' : ''}`}>
            <Icon name={item.icon} size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <Toaster />
      <ScrollRestoration />
    </div>
  );
}

// Halaman tanpa navigasi (login & lupa password)
export function AdminBlank() {
  return (
    <div className="admin-app">
      <Outlet />
      <Toaster />
    </div>
  );
}

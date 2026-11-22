import { Link, NavLink } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { openGuide } from '../features/ui/uiSlice';
import { initials } from '../utils/format';
import Icon from './Icon';
import logoQCare from '../assets/logo-qcare.png';

// Navigasi bawah sesuai komponen Figma "Buttom Navigation":
// Beranda · Layanan · Riwayat · Profil (item aktif = pill primary/100).
export const NAV_ITEMS = [
  { to: '/', label: 'Beranda', icon: 'navHome', end: true },
  { to: '/layanan', label: 'Layanan', icon: 'navSearch', match: ['/layanan', '/fasilitas', '/antrean/daftar'] },
  { to: '/riwayat', label: 'Riwayat', icon: 'navHistory', match: ['/riwayat', '/antrean/'] },
  { to: '/profil', label: 'Profil', icon: 'navPerson' },
];

export function Logo({ size = 'md' }) {
  return (
    <Link to="/" className={`logo logo-${size}`} aria-label="QCare — beranda">
      <img src={logoQCare} alt="QCare" />
    </Link>
  );
}

const isItemActive = (item, pathname, isActive) => {
  if (!item.match) return isActive;
  if (pathname === '/antrean/daftar') return item.to === '/layanan';
  return item.match.some((m) => pathname.startsWith(m));
};

function NavItems({ className, pathname }) {
  return NAV_ITEMS.map((item) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      className={({ isActive }) => `${className} ${isItemActive(item, pathname, isActive) ? 'is-active' : ''}`}
    >
      <span className="nav-pill">
        <Icon name={item.icon} size={24} />
      </span>
      <span className="nav-label">{item.label}</span>
    </NavLink>
  ));
}

// Tampilan desktop/tablet lebar: navigasi yang sama dipindah ke atas.
export default function Topbar({ pathname }) {
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  return (
    <header className="topbar">
      <div className="container topbar-inner">
        <Logo />
        <nav className="topnav" aria-label="Navigasi utama">
          <NavItems className="topnav-link" pathname={pathname} />
        </nav>
        <div className="topbar-actions">
          <button type="button" className="icon-btn" onClick={() => dispatch(openGuide())} aria-label="Panduan penggunaan">
            <Icon name="help" />
          </button>
          <Link to="/antrean/daftar" className="btn btn-primary btn-sm">
            Ambil antrean
          </Link>
          <Link to="/profil" className="avatar avatar-sm" aria-label="Profil saya">
            {initials(user?.nama_pasien)}
          </Link>
        </div>
      </div>
    </header>
  );
}

export function BottomNav({ pathname }) {
  return (
    <nav className="bottomnav" aria-label="Navigasi bawah">
      <NavItems className="bottomnav-link" pathname={pathname} />
    </nav>
  );
}

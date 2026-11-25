import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { LoadingBlock } from './ui';

// Proteksi tampilan saja; backend tetap memeriksa token (verifyToken) & role.
export default function ProtectedRoute() {
  const { user, initialized } = useSelector((state) => state.auth);
  const location = useLocation();

  if (!initialized) return <LoadingBlock label="Memeriksa sesi..." />;
  if (!user) return <Navigate to="/masuk" state={{ from: location }} replace />;
  if (user.role && user.role !== 'pasien') {
    return (
      <div className="container page page-narrow">
        <div className="state-block">
          <h3>Halaman khusus pasien</h3>
          <p>Akun admin menggunakan panel admin (segera hadir).</p>
        </div>
      </div>
    );
  }
  return <Outlet />;
}

// Halaman masuk/daftar tidak perlu dibuka lagi bila sudah login.
export function GuestRoute() {
  const { user, initialized } = useSelector((state) => state.auth);
  const location = useLocation();
  if (!initialized) return <LoadingBlock label="Memeriksa sesi..." />;
  if (user) return <Navigate to={location.state?.from?.pathname || '/'} replace />;
  return <Outlet />;
}

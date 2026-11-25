import { useEffect } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { bootstrapSession } from '../features/auth/authSlice';
import { openGuide } from '../features/ui/uiSlice';
import Topbar, { BottomNav } from '../components/Navbar';
import GuideModal from '../components/GuideModal';
import { Toaster } from '../components/ui';
import { USE_MOCK } from '../config/env';

export default function RootLayout() {
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const initialized = useSelector((state) => state.auth.initialized);
  const user = useSelector((state) => state.auth.user);
  const { fontScale, highContrast, guideSeen } = useSelector((state) => state.ui);

  // Bootstrap sesi hanya sekali di root (dijaga juga oleh `condition` thunk).
  useEffect(() => {
    if (!initialized) dispatch(bootstrapSession());
  }, [dispatch, initialized]);

  // Preferensi aksesibilitas diterapkan ke <html>.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.fontScale = fontScale;
    root.dataset.contrast = highContrast ? 'high' : 'normal';
  }, [fontScale, highContrast]);

  // Panduan (User Guidance) muncul otomatis saat pertama kali masuk.
  useEffect(() => {
    if (initialized && user && !guideSeen) dispatch(openGuide());
  }, [dispatch, initialized, user, guideSeen]);

  const inApp = Boolean(user);

  return (
    <div className={`app ${inApp ? 'app-shell' : 'app-auth'}`}>
      <a href="#konten" className="skip-link">
        Lewati ke konten utama
      </a>
      {inApp && <Topbar pathname={pathname} />}
      {USE_MOCK && (
        <div className="mock-banner" role="note">
          Mode simulasi · backend belum disambungkan
        </div>
      )}
      <main id="konten" className="main">
        <Outlet />
      </main>
      {inApp && <BottomNav pathname={pathname} />}
      <GuideModal />
      <Toaster />
      <ScrollRestoration />
    </div>
  );
}

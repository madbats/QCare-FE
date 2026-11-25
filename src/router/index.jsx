import { createBrowserRouter } from 'react-router-dom';
import RootLayout from '../layouts/RootLayout';
import ProtectedRoute, { GuestRoute } from '../components/ProtectedRoute';
import ErrorBoundary from '../ErrorBoundary';

import Home from '../pages/Home';
import Services from '../pages/Services';
import FacilityDetail from '../pages/FacilityDetail';
import QueueRegister from '../pages/QueueRegister';
import QueueTicket from '../pages/QueueTicket';
import History from '../pages/History';
import Profile from '../pages/Profile';
import Login from '../pages/Login';
import Register from '../pages/Register';
import ForgotPassword from '../pages/ForgotPassword';
import NotFound from '../pages/NotFound';

<<<<<<< HEAD
// ---- Portal admin ----
import AdminLayout, { AdminBlank } from '../admin/AdminLayout';
import AdminLogin from '../admin/pages/AdminLogin';
import AdminForgotPassword from '../admin/pages/AdminForgotPassword';
import Dashboard from '../admin/pages/Dashboard';
import ActiveQueue from '../admin/pages/ActiveQueue';
import AdminQueueRegister from '../admin/pages/QueueRegister';
import QueueIssued from '../admin/pages/QueueIssued';
import QueueService from '../admin/pages/QueueService';
import QueueAdjust from '../admin/pages/QueueAdjust';
import Schedules from '../admin/pages/Schedules';
import Patients from '../admin/pages/Patients';
import PatientDetail from '../admin/pages/PatientDetail';
import Doctors from '../admin/pages/Doctors';
import AdminServices from '../admin/pages/Services';
import Facilities from '../admin/pages/Facilities';
import QueueHistory from '../admin/pages/QueueHistory';
import Admins, { AdminResetPassword } from '../admin/pages/Admins';
import More from '../admin/pages/More';
import { Btn, Empty } from '../admin/ui';
import { DokterForm, FasilitasForm, JadwalForm, LayananForm, PasienForm } from '../admin/pages/Forms';

// Data API dikelola Redux (createAsyncThunk), bukan Router loader,
// agar tidak ada dua sumber pengelolaan data.
function AdminNotFound() {
  return <Empty title="Halaman admin tidak ditemukan" message="Alamat yang dibuka tidak tersedia di portal admin." action={<Btn to="/admin" className="a-btn-auto">Ke Dashboard</Btn>} />;
}

// Portal admin berada di /admin/* dengan layout, sesi, dan token terpisah.
export const router = createBrowserRouter([
  {
    path: '/admin',
    errorElement: <ErrorBoundary />,
    HydrateFallback: () => null,
    children: [
      {
        element: <AdminBlank />,
        children: [
          { path: 'masuk', element: <AdminLogin /> },
          { path: 'lupa-password', element: <AdminForgotPassword /> },
        ],
      },
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: 'antrean', element: <ActiveQueue /> },
          { path: 'antrean/baru', element: <AdminQueueRegister /> },
          { path: 'antrean/:id', element: <QueueService /> },
          { path: 'antrean/:id/terbit', element: <QueueIssued /> },
          { path: 'antrean/:id/ubah', element: <QueueAdjust /> },
          { path: 'jadwal', element: <Schedules /> },
          { path: 'jadwal/baru', element: <JadwalForm /> },
          { path: 'jadwal/:id/ubah', element: <JadwalForm /> },
          { path: 'pasien', element: <Patients /> },
          { path: 'pasien/baru', element: <PasienForm /> },
          { path: 'pasien/:id', element: <PatientDetail /> },
          { path: 'pasien/:id/ubah', element: <PasienForm /> },
          { path: 'dokter', element: <Doctors /> },
          { path: 'dokter/baru', element: <DokterForm /> },
          { path: 'dokter/:id/ubah', element: <DokterForm /> },
          { path: 'layanan', element: <AdminServices /> },
          { path: 'layanan/baru', element: <LayananForm /> },
          { path: 'layanan/:id/ubah', element: <LayananForm /> },
          { path: 'fasilitas', element: <Facilities /> },
          { path: 'fasilitas/baru', element: <FasilitasForm /> },
          { path: 'fasilitas/:id/ubah', element: <FasilitasForm /> },
          { path: 'riwayat', element: <QueueHistory /> },
          { path: 'akun', element: <Admins /> },
          { path: 'akun/:id/password', element: <AdminResetPassword /> },
          { path: 'lainnya', element: <More /> },
          { path: '*', element: <AdminNotFound /> },
        ],
      },
    ],
  },
  {
=======
// Data API dikelola Redux (createAsyncThunk), bukan Router loader,
// agar tidak ada dua sumber pengelolaan data.
// Catatan: rute admin akan ditambahkan terpisah (mis. /admin/*).
export const router = createBrowserRouter([
  {
>>>>>>> 70022d6b3150e76b505d0f2f72b76916f9069b73
    path: '/',
    element: <RootLayout />,
    errorElement: <ErrorBoundary />,
    HydrateFallback: () => null,
    children: [
      {
        element: <GuestRoute />,
        children: [
          { path: 'masuk', element: <Login /> },
          { path: 'daftar', element: <Register /> },
          { path: 'lupa-password', element: <ForgotPassword /> },
        ],
      },
      {
        element: <ProtectedRoute />,
        errorElement: <ErrorBoundary />,
        children: [
          // Semua data backend butuh token, jadi tamu diarahkan ke /masuk.
          { index: true, element: <Home /> },
          { path: 'layanan', element: <Services /> },
          { path: 'fasilitas/:id', element: <FacilityDetail /> },
          { path: 'antrean/daftar', element: <QueueRegister /> },
          { path: 'antrean/:id', element: <QueueTicket /> },
          { path: 'riwayat', element: <History /> },
          { path: 'profil', element: <Profile /> },
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

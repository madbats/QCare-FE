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

// Data API dikelola Redux (createAsyncThunk), bukan Router loader,
// agar tidak ada dua sumber pengelolaan data.
// Catatan: rute admin akan ditambahkan terpisah (mis. /admin/*).
export const router = createBrowserRouter([
  {
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

import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router-dom';

import { store } from './app/store';
import { router } from './router';
import { setUnauthorizedHandler } from './services/api';
import { sessionExpired } from './features/auth/authSlice';
<<<<<<< HEAD
import { setAdminUnauthorizedHandler } from './admin/api';
import { adminSessionExpired } from './admin/store/adminAuthSlice';
=======
>>>>>>> 70022d6b3150e76b505d0f2f72b76916f9069b73
import './index.css';

// Token kedaluwarsa / tidak valid -> keluar otomatis & arahkan ke /masuk.
setUnauthorizedHandler(() => {
  if (store.getState().auth.user) {
    store.dispatch(sessionExpired());
    router.navigate('/masuk', { replace: true });
  }
});

<<<<<<< HEAD
// Token admin kedaluwarsa -> keluar dari portal admin saja.
setAdminUnauthorizedHandler(() => {
  if (store.getState().adminAuth.admin) {
    store.dispatch(adminSessionExpired());
    router.navigate('/admin/masuk', { replace: true });
  }
});

=======
>>>>>>> 70022d6b3150e76b505d0f2f72b76916f9069b73
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  </React.StrictMode>
);

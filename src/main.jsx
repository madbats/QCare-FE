import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router-dom';

import { store } from './app/store';
import { router } from './router';
import { setUnauthorizedHandler } from './services/api';
import { sessionExpired } from './features/auth/authSlice';
import { setAdminUnauthorizedHandler } from './admin/api';
import { adminSessionExpired } from './admin/store/adminAuthSlice';
import './index.css';

// Token kedaluwarsa / tidak valid -> keluar otomatis & arahkan ke /masuk.
setUnauthorizedHandler(() => {
  if (store.getState().auth.user) {
    store.dispatch(sessionExpired());
    router.navigate('/masuk', { replace: true });
  }
});

// Token admin kedaluwarsa -> keluar dari portal admin saja.
setAdminUnauthorizedHandler(() => {
  if (store.getState().adminAuth.admin) {
    store.dispatch(adminSessionExpired());
    router.navigate('/admin/masuk', { replace: true });
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  </React.StrictMode>
);

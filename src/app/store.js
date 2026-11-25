import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import catalogReducer from '../features/catalog/catalogSlice';
import queueReducer from '../features/queue/queueSlice';
import uiReducer from '../features/ui/uiSlice';
<<<<<<< HEAD
import adminAuthReducer from '../admin/store/adminAuthSlice';
import adminDataReducer from '../admin/store/adminDataSlice';
=======
>>>>>>> 70022d6b3150e76b505d0f2f72b76916f9069b73
import { prefs } from '../utils/storage';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    catalog: catalogReducer,
    queue: queueReducer,
    ui: uiReducer,
<<<<<<< HEAD
    adminAuth: adminAuthReducer,
    adminData: adminDataReducer,
=======
>>>>>>> 70022d6b3150e76b505d0f2f72b76916f9069b73
  },
});

// Simpan preferensi aksesibilitas hanya ketika nilainya berubah.
let lastPrefs = null;
store.subscribe(() => {
  const { fontScale, highContrast, guideSeen } = store.getState().ui;
  const key = `${fontScale}|${highContrast}|${guideSeen}`;
  if (key !== lastPrefs) {
    lastPrefs = key;
    prefs.set({ fontScale, highContrast, guideSeen });
  }
});

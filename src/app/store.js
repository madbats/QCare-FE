import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import catalogReducer from '../features/catalog/catalogSlice';
import queueReducer from '../features/queue/queueSlice';
import uiReducer from '../features/ui/uiSlice';
import { prefs } from '../utils/storage';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    catalog: catalogReducer,
    queue: queueReducer,
    ui: uiReducer,
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

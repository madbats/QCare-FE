import { createSlice, nanoid } from '@reduxjs/toolkit';
import { prefs } from '../../utils/storage';

// Preferensi aksesibilitas (ukuran teks & kontras tinggi) dan panduan awal
// berasal dari hasil ideate: "ukuran teks & navigasi yang mudah dipahami",
// "mode kontras tinggi", dan "pop up panduan saat pertama membuka website".
const savedPrefs = prefs.get() ?? {};

const initialState = {
  fontScale: savedPrefs.fontScale ?? 'normal', // normal | besar | sangat-besar
  highContrast: savedPrefs.highContrast ?? false,
  guideSeen: savedPrefs.guideSeen ?? false,
  guideOpen: false,
  toasts: [],
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setFontScale: (state, action) => {
      state.fontScale = action.payload;
    },
    toggleHighContrast: (state) => {
      state.highContrast = !state.highContrast;
    },
    openGuide: (state) => {
      state.guideOpen = true;
    },
    closeGuide: (state) => {
      state.guideOpen = false;
      state.guideSeen = true;
    },
    showToast: {
      reducer: (state, action) => {
        state.toasts.push(action.payload);
        if (state.toasts.length > 3) state.toasts.shift();
      },
      prepare: (message, tone = 'success') => ({ payload: { id: nanoid(), message, tone } }),
    },
    dismissToast: (state, action) => {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
  },
});

export const { setFontScale, toggleHighContrast, openGuide, closeGuide, showToast, dismissToast } = uiSlice.actions;
export default uiSlice.reducer;

import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { api, getError } from '../../services/api';
import { USE_MOCK } from '../../config/env';
import { queueHistory } from '../../utils/storage';
import { unwrapRow, isActiveStatus } from '../../utils/queue';
import { STATUS } from '../../constants/queue';

// POST /antrean -> buat antrean (pasien_id diambil backend dari token)
export const createQueue = createAsyncThunk('queue/create', async (payload, thunkAPI) => {
  try {
    const response = await api.post('/antrean', payload);
    const row = unwrapRow(response.data.data);
    const pasienId = thunkAPI.getState().auth.user?.id;
    if (row?.id && pasienId) queueHistory.add(pasienId, row.id);
    return row;
  } catch (error) {
    return thunkAPI.rejectWithValue(getError(error));
  }
});

// GET /antrean/:id -> tiket & status antrean
export const fetchQueue = createAsyncThunk('queue/fetchOne', async (id, thunkAPI) => {
  try {
    const response = await api.get(`/antrean/${id}`);
    return unwrapRow(response.data.data);
  } catch (error) {
    return thunkAPI.rejectWithValue(getError(error));
  }
});

// Nomor yang sedang dilayani & sisa antrean.
// Backend BELUM menyediakan endpoint ini untuk pasien (GET /antrean khusus admin),
// sehingga hanya tersedia di mode simulasi. Di mode backend asli nilainya null
// dan UI menampilkan status antrean saja.
export const fetchQueueProgress = createAsyncThunk('queue/progress', async (id, thunkAPI) => {
  if (!USE_MOCK) return null;
  try {
    const response = await api.get(`/antrean/${id}/progres`);
    return response.data.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(getError(error));
  }
});

// PUT /antrean/:id { status_antrean: 'Dibatalkan' } -> pasien membatalkan antrean
export const cancelQueue = createAsyncThunk('queue/cancel', async (id, thunkAPI) => {
  try {
    const response = await api.put(`/antrean/${id}`, { status_antrean: STATUS.DIBATALKAN });
    return unwrapRow(response.data.data) ?? { id, status_antrean: STATUS.DIBATALKAN };
  } catch (error) {
    return thunkAPI.rejectWithValue(getError(error));
  }
});

// Riwayat: ID antrean dicatat di perangkat, lalu diambil satu per satu.
export const fetchHistory = createAsyncThunk('queue/history', async (_, thunkAPI) => {
  const pasienId = thunkAPI.getState().auth.user?.id;
  const ids = queueHistory.list(pasienId);
  const results = await Promise.allSettled(ids.map((id) => api.get(`/antrean/${id}`)));
  const items = [];
  let networkError = null;
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      const row = unwrapRow(result.value.data.data);
      if (row) items.push(row);
      return;
    }
    const err = getError(result.reason);
    // Data sudah tidak ada / bukan milik akun ini -> keluarkan dari riwayat.
    if (err.status === 404 || err.status === 403) queueHistory.remove(pasienId, ids[index]);
    else networkError = err;
  });
  if (networkError && items.length === 0) return thunkAPI.rejectWithValue(networkError);
  return items.sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')) || b.id - a.id);
});

const initialState = {
  current: null,
  currentStatus: 'idle',
  currentError: null,
  progress: null,
  progressStatus: 'idle',
  createStatus: 'idle',
  createError: null,
  cancelStatus: 'idle',
  cancelError: null,
  history: [],
  historyStatus: 'idle',
  historyError: null,
};

const upsertHistory = (state, row) => {
  if (!row?.id) return;
  const idx = state.history.findIndex((h) => String(h.id) === String(row.id));
  if (idx >= 0) state.history[idx] = { ...state.history[idx], ...row };
  else state.history.unshift(row);
};

const queueSlice = createSlice({
  name: 'queue',
  initialState,
  reducers: {
    resetCreate: (state) => {
      state.createStatus = 'idle';
      state.createError = null;
    },
    clearCurrent: (state) => {
      state.current = null;
      state.currentStatus = 'idle';
      state.currentError = null;
      state.progress = null;
      state.progressStatus = 'idle';
      state.cancelStatus = 'idle';
      state.cancelError = null;
    },
    resetQueueState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(createQueue.pending, (state) => {
        state.createStatus = 'loading';
        state.createError = null;
      })
      .addCase(createQueue.fulfilled, (state, action) => {
        state.createStatus = 'succeeded';
        upsertHistory(state, action.payload);
      })
      .addCase(createQueue.rejected, (state, action) => {
        state.createStatus = 'failed';
        state.createError = action.payload;
      })
      .addCase(fetchQueue.pending, (state, action) => {
        // Polling: jangan kosongkan tiket yang sudah tampil.
        if (String(state.current?.id) !== String(action.meta.arg)) {
          state.current = null;
          state.currentStatus = 'loading';
        }
        state.currentError = null;
      })
      .addCase(fetchQueue.fulfilled, (state, action) => {
        state.currentStatus = 'succeeded';
        state.current = action.payload;
        upsertHistory(state, action.payload);
      })
      .addCase(fetchQueue.rejected, (state, action) => {
        state.currentStatus = 'failed';
        state.currentError = action.payload;
      })
      .addCase(fetchQueueProgress.pending, (state) => {
        if (!state.progress) state.progressStatus = 'loading';
      })
      .addCase(fetchQueueProgress.fulfilled, (state, action) => {
        state.progressStatus = 'succeeded';
        state.progress = action.payload;
      })
      .addCase(fetchQueueProgress.rejected, (state) => {
        state.progressStatus = 'failed';
      })
      .addCase(cancelQueue.pending, (state) => {
        state.cancelStatus = 'loading';
        state.cancelError = null;
      })
      .addCase(cancelQueue.fulfilled, (state, action) => {
        state.cancelStatus = 'succeeded';
        if (state.current) state.current = { ...state.current, ...action.payload };
        upsertHistory(state, action.payload);
      })
      .addCase(cancelQueue.rejected, (state, action) => {
        state.cancelStatus = 'failed';
        state.cancelError = action.payload;
      })
      .addCase(fetchHistory.pending, (state) => {
        state.historyStatus = 'loading';
        state.historyError = null;
      })
      .addCase(fetchHistory.fulfilled, (state, action) => {
        state.historyStatus = 'succeeded';
        state.history = action.payload;
      })
      .addCase(fetchHistory.rejected, (state, action) => {
        state.historyStatus = 'failed';
        state.historyError = action.payload;
      })
      // Bersihkan data saat keluar / sesi habis.
      .addMatcher(
        (action) => action.type === 'auth/logout' || action.type === 'auth/sessionExpired',
        () => initialState
      );
  },
});

export const { resetCreate, clearCurrent, resetQueueState } = queueSlice.actions;
export default queueSlice.reducer;

export const selectActiveQueues = createSelector([(state) => state.queue.history], (history) =>
  history.filter((q) => isActiveStatus(q.status_antrean))
);

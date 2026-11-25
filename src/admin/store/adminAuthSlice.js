import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { adminApi, adminSession, getError } from '../api';

// POST /auth/login -> { data: { id, nama_admin, email, role }, token }
export const loginAdmin = createAsyncThunk('adminAuth/login', async ({ email, password, remember }, thunkAPI) => {
  try {
    const res = await adminApi.post('/auth/login', { email, password });
    const { data, token } = res.data;
    // authorizeRole("admin") di backend: hanya role "admin" yang bisa memakai endpoint admin.
    if (data?.role !== 'admin') {
      return thunkAPI.rejectWithValue({ message: 'Akun ini tidak memiliki akses admin.' });
    }
    adminSession.set(token, data, remember);
    return { admin: data, token, loginAt: new Date().toISOString() };
  } catch (error) {
    return thunkAPI.rejectWithValue(getError(error));
  }
});

// Sesi dipulihkan dari token tersimpan & divalidasi lewat GET /admin/:id.
export const bootstrapAdmin = createAsyncThunk(
  'adminAuth/bootstrap',
  async (_, thunkAPI) => {
    const saved = adminSession.get();
    if (!saved?.token || !saved?.admin?.id) return null;
    try {
      const res = await adminApi.get(`/admin/${saved.admin.id}`);
      adminSession.update(res.data.data);
      return { ...saved, admin: { ...saved.admin, ...res.data.data } };
    } catch (error) {
      const err = getError(error);
      if ([401, 403, 404].includes(err.status)) {
        adminSession.clear();
        return null;
      }
      return saved; // gagal jaringan: tetap pakai sesi lokal
    }
  },
  { condition: (_, { getState }) => !getState().adminAuth.initialized && !getState().adminAuth.bootstrapping }
);

const saved = adminSession.get();

const adminAuthSlice = createSlice({
  name: 'adminAuth',
  initialState: {
    admin: saved?.admin ?? null,
    token: saved?.token ?? null,
    loginAt: saved?.loginAt ?? null,
    initialized: false,
    bootstrapping: false,
    status: 'idle',
    error: null,
    expired: false,
  },
  reducers: {
    logoutAdmin: (state) => {
      adminSession.clear();
      state.admin = null;
      state.token = null;
      state.expired = false;
      state.error = null;
    },
    adminSessionExpired: (state) => {
      adminSession.clear();
      state.admin = null;
      state.token = null;
      state.expired = true;
    },
    adminProfileUpdated: (state, action) => {
      if (state.admin) state.admin = { ...state.admin, ...action.payload };
      adminSession.update(action.payload);
    },
    clearAdminError: (state) => {
      state.error = null;
      state.expired = false;
    },
  },
  extraReducers: (b) => {
    b.addCase(loginAdmin.pending, (s) => {
      s.status = 'loading';
      s.error = null;
      s.expired = false;
    })
      .addCase(loginAdmin.fulfilled, (s, a) => {
        s.status = 'succeeded';
        s.admin = a.payload.admin;
        s.token = a.payload.token;
        s.loginAt = a.payload.loginAt;
        s.initialized = true;
        s.expired = false;
      })
      .addCase(loginAdmin.rejected, (s, a) => {
        s.status = 'failed';
        s.error = a.payload;
      })
      .addCase(bootstrapAdmin.pending, (s) => {
        s.bootstrapping = true;
      })
      .addCase(bootstrapAdmin.fulfilled, (s, a) => {
        s.bootstrapping = false;
        s.initialized = true;
        s.admin = a.payload?.admin ?? null;
        s.token = a.payload?.token ?? null;
        s.loginAt = a.payload?.loginAt ?? null;
      })
      .addCase(bootstrapAdmin.rejected, (s) => {
        s.bootstrapping = false;
        s.initialized = true;
      });
  },
});

export const { logoutAdmin, adminSessionExpired, adminProfileUpdated, clearAdminError } = adminAuthSlice.actions;
export default adminAuthSlice.reducer;

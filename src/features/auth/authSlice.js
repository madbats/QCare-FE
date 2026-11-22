import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api, getError } from '../../services/api';
import { session } from '../../utils/storage';

// Endpoint backend:
//   POST /pasien-auth/register   -> registrasi pasien
//   POST /pasien-auth/login      -> { data: user, token }
//   GET  /pasien/:id             -> profil pasien (sekaligus validasi token)
//   PUT  /pasien/:id             -> ubah profil
// Backend tidak punya /auth/me dan /auth/refresh, jadi sesi dipulihkan
// dari token tersimpan lalu divalidasi lewat GET /pasien/:id.

export const registerPasien = createAsyncThunk('auth/register', async (form, thunkAPI) => {
  try {
    const response = await api.post('/pasien-auth/register', form);
    return response.data.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(getError(error));
  }
});

export const loginPasien = createAsyncThunk('auth/login', async ({ email, password }, thunkAPI) => {
  try {
    const response = await api.post('/pasien-auth/login', { email, password });
    const { data, token } = response.data;
    session.set(token, data);
    return { user: data, token };
  } catch (error) {
    return thunkAPI.rejectWithValue(getError(error));
  }
});

// Dipanggil SEKALI dari RootLayout saat aplikasi dibuka.
export const bootstrapSession = createAsyncThunk(
  'auth/bootstrap',
  async (_, thunkAPI) => {
    const saved = session.get();
    if (!saved?.token || !saved?.user?.id) return null;
    try {
      const response = await api.get(`/pasien/${saved.user.id}`);
      return { user: saved.user, token: saved.token, profile: response.data.data };
    } catch (error) {
      const err = getError(error);
      // Token tidak valid -> hapus sesi. Gagal jaringan -> tetap pakai sesi lokal.
      if (err.status === 401 || err.status === 403 || err.status === 404) {
        session.clear();
        return null;
      }
      return { user: saved.user, token: saved.token, profile: null, offline: true };
    }
  },
  {
    condition: (_, { getState }) => {
      const { initialized, bootstrapping } = getState().auth;
      return !initialized && !bootstrapping;
    },
  }
);

export const fetchProfile = createAsyncThunk('auth/fetchProfile', async (_, thunkAPI) => {
  const id = thunkAPI.getState().auth.user?.id;
  try {
    const response = await api.get(`/pasien/${id}`);
    return response.data.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(getError(error));
  }
});

export const updateProfile = createAsyncThunk('auth/updateProfile', async (data, thunkAPI) => {
  const id = thunkAPI.getState().auth.user?.id;
  try {
    const response = await api.put(`/pasien/${id}`, data);
    session.updateUser({ nama_pasien: response.data.data.nama_pasien });
    return response.data.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(getError(error));
  }
});

const saved = session.get();

const initialState = {
  user: saved?.user ?? null,
  token: saved?.token ?? null,
  profile: null,
  initialized: false,
  bootstrapping: false,
  status: 'idle', // login & register
  error: null,
  profileStatus: 'idle',
  profileError: null,
  updateStatus: 'idle',
  updateError: null,
  sessionExpired: false,
};

const clearSession = (state) => {
  state.user = null;
  state.token = null;
  state.profile = null;
  state.status = 'idle';
  state.profileStatus = 'idle';
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      session.clear();
      clearSession(state);
      state.sessionExpired = false;
    },
    sessionExpired: (state) => {
      session.clear();
      clearSession(state);
      state.sessionExpired = true;
    },
    clearAuthError: (state) => {
      state.error = null;
      state.updateError = null;
      state.sessionExpired = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // REGISTER
      .addCase(registerPasien.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(registerPasien.fulfilled, (state) => {
        state.status = 'succeeded';
      })
      .addCase(registerPasien.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // LOGIN
      .addCase(loginPasien.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loginPasien.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.profile = null;
        state.profileStatus = 'idle';
        state.initialized = true;
        state.sessionExpired = false;
      })
      .addCase(loginPasien.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // BOOTSTRAP
      .addCase(bootstrapSession.pending, (state) => {
        state.bootstrapping = true;
      })
      .addCase(bootstrapSession.fulfilled, (state, action) => {
        state.bootstrapping = false;
        state.initialized = true;
        if (!action.payload) {
          clearSession(state);
          return;
        }
        state.user = action.payload.user;
        state.token = action.payload.token;
        if (action.payload.profile) {
          state.profile = action.payload.profile;
          state.profileStatus = 'succeeded';
        }
      })
      .addCase(bootstrapSession.rejected, (state) => {
        state.bootstrapping = false;
        state.initialized = true;
      })
      // PROFILE
      .addCase(fetchProfile.pending, (state) => {
        state.profileStatus = 'loading';
        state.profileError = null;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.profileStatus = 'succeeded';
        state.profile = action.payload;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.profileStatus = 'failed';
        state.profileError = action.payload;
      })
      .addCase(updateProfile.pending, (state) => {
        state.updateStatus = 'loading';
        state.updateError = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.updateStatus = 'succeeded';
        state.profile = action.payload;
        if (state.user) state.user.nama_pasien = action.payload.nama_pasien;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.updateStatus = 'failed';
        state.updateError = action.payload;
      });
  },
});

export const { logout, sessionExpired, clearAuthError } = authSlice.actions;
export default authSlice.reducer;

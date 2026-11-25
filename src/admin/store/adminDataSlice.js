import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { adminApi, getError, RESOURCES } from '../api';
import { unwrapRow } from '../../utils/queue';
import { sameStatus } from '../../constants/queue';

// =====================================================================
// Satu slice untuk seluruh data admin. Setiap resource punya status
// sendiri sehingga loading satu tabel tidak mengganggu tabel lain.
// =====================================================================

const emptyResource = () => ({ items: [], status: 'idle', error: null, loadedAt: null });

// GET list
export const fetchResource = createAsyncThunk(
  'adminData/fetch',
  async ({ name }, thunkAPI) => {
    try {
      const res = await adminApi.get(RESOURCES[name]);
      return res.data.data ?? [];
    } catch (error) {
      return thunkAPI.rejectWithValue(getError(error));
    }
  },
  {
    condition: ({ name, force }, { getState }) => {
      const r = getState().adminData[name];
      if (r.status === 'loading') return false;
      return force || r.status === 'idle' || r.status === 'failed';
    },
  }
);

// POST
export const createResource = createAsyncThunk('adminData/create', async ({ name, data }, thunkAPI) => {
  try {
    const res = await adminApi.post(RESOURCES[name], data);
    return unwrapRow(res.data.data);
  } catch (error) {
    return thunkAPI.rejectWithValue(getError(error));
  }
});

// PUT
export const updateResource = createAsyncThunk('adminData/update', async ({ name, id, data }, thunkAPI) => {
  try {
    const res = await adminApi.put(`${RESOURCES[name]}/${id}`, data);
    return unwrapRow(res.data.data) ?? { id, ...data };
  } catch (error) {
    return thunkAPI.rejectWithValue(getError(error));
  }
});

// DELETE
export const deleteResource = createAsyncThunk('adminData/delete', async ({ name, id }, thunkAPI) => {
  try {
    await adminApi.delete(`${RESOURCES[name]}/${id}`);
    return id;
  } catch (error) {
    return thunkAPI.rejectWithValue(getError(error));
  }
});

// Ubah status antrean (RPC update_status_antrean_atomik). Backend otomatis
// mencatat riwayat; jika ada catatan, baris riwayat terbaru diberi keterangan.
export const changeQueueStatus = createAsyncThunk(
  'adminData/changeQueueStatus',
  async ({ id, status, keterangan }, thunkAPI) => {
    try {
      const res = await adminApi.put(`/antrean/${id}`, { status_antrean: status });
      const row = unwrapRow(res.data.data) ?? { id, status_antrean: status };
      if (keterangan?.trim()) await annotateRiwayat(id, status, keterangan.trim(), thunkAPI.getState().adminAuth.admin?.id);
      thunkAPI.dispatch(fetchResource({ name: 'riwayat', force: true }));
      return { ...row, id: row.id ?? Number(id) };
    } catch (error) {
      return thunkAPI.rejectWithValue(getError(error));
    }
  }
);

// Tambahkan catatan ke baris riwayat terbaru (status yang sama) milik antrean.
export async function annotateRiwayat(antreanId, status, keterangan, adminId) {
  const list = (await adminApi.get('/riwayat-antrean')).data.data ?? [];
  const latest = list
    .filter((r) => String(r.antrean_id) === String(antreanId) && sameStatus(r.status_antrean, status))
    .sort((a, b) => b.id - a.id)[0];
  if (latest) {
    await adminApi.put(`/riwayat-antrean/${latest.id}`, {
      antrean_id: latest.antrean_id,
      admin_id: latest.admin_id ?? adminId ?? null,
      status_antrean: latest.status_antrean,
      keterangan,
    });
  } else {
    await adminApi.post('/riwayat-antrean', { antrean_id: Number(antreanId), admin_id: adminId ?? null, status_antrean: status, keterangan });
  }
}

const NAMES = Object.keys(RESOURCES);

const adminDataSlice = createSlice({
  name: 'adminData',
  initialState: Object.fromEntries(NAMES.map((n) => [n, emptyResource()])),
  reducers: {
    resetAdminData: () => Object.fromEntries(NAMES.map((n) => [n, emptyResource()])),
  },
  extraReducers: (b) => {
    b.addCase(fetchResource.pending, (s, a) => {
      const r = s[a.meta.arg.name];
      r.status = 'loading';
      r.error = null;
    })
      .addCase(fetchResource.fulfilled, (s, a) => {
        const r = s[a.meta.arg.name];
        r.items = a.payload;
        r.status = 'succeeded';
        r.loadedAt = Date.now();
      })
      .addCase(fetchResource.rejected, (s, a) => {
        const r = s[a.meta.arg.name];
        r.status = 'failed';
        r.error = a.payload;
      })
      .addCase(createResource.fulfilled, (s, a) => {
        if (a.payload?.id) s[a.meta.arg.name].items.push(a.payload);
      })
      .addCase(updateResource.fulfilled, (s, a) => {
        const r = s[a.meta.arg.name];
        r.items = r.items.map((it) => (String(it.id) === String(a.meta.arg.id) ? { ...it, ...a.payload } : it));
      })
      .addCase(deleteResource.fulfilled, (s, a) => {
        const r = s[a.meta.arg.name];
        r.items = r.items.filter((it) => String(it.id) !== String(a.payload));
      })
      .addCase(changeQueueStatus.fulfilled, (s, a) => {
        s.antrean.items = s.antrean.items.map((it) => (String(it.id) === String(a.payload.id) ? { ...it, ...a.payload } : it));
      })
      .addMatcher(
        (action) => action.type === 'adminAuth/logoutAdmin' || action.type === 'adminAuth/adminSessionExpired',
        () => Object.fromEntries(NAMES.map((n) => [n, emptyResource()]))
      );
  },
});

export const { resetAdminData } = adminDataSlice.actions;
export default adminDataSlice.reducer;

import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { api, getError } from '../../services/api';
import { URUTAN_HARI, hariIni } from '../../utils/format';

// Master data yang dipakai hampir di semua halaman pasien.
// GET /fasilitas, /layanan, /dokter, /jadwal-dokter (semua butuh token).
export const fetchCatalog = createAsyncThunk(
  'catalog/fetchAll',
  async (_, thunkAPI) => {
    try {
      const [fasilitas, layanan, dokter, jadwal] = await Promise.all([
        api.get('/fasilitas'),
        api.get('/layanan'),
        api.get('/dokter'),
        api.get('/jadwal-dokter'),
      ]);
      return {
        fasilitas: fasilitas.data.data ?? [],
        layanan: layanan.data.data ?? [],
        dokter: dokter.data.data ?? [],
        jadwal: jadwal.data.data ?? [],
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(getError(error));
    }
  },
  {
    // Cegah request ganda (StrictMode / beberapa halaman memanggil bersamaan).
    condition: (force, { getState }) => {
      const { status } = getState().catalog;
      if (status === 'loading') return false;
      return force === true || status === 'idle' || status === 'failed';
    },
  }
);

const initialState = {
  fasilitas: [],
  layanan: [],
  dokter: [],
  jadwal: [],
  status: 'idle',
  error: null,
  lastFetched: null,
};

const catalogSlice = createSlice({
  name: 'catalog',
  initialState,
  reducers: {
    resetCatalog: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCatalog.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchCatalog.fulfilled, (state, action) => {
        Object.assign(state, action.payload);
        state.status = 'succeeded';
        state.lastFetched = Date.now();
      })
      .addCase(fetchCatalog.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Bersihkan data saat keluar / sesi habis.
      .addMatcher(
        (action) => action.type === 'auth/logout' || action.type === 'auth/sessionExpired',
        () => initialState
      );
  },
});

export const { resetCatalog } = catalogSlice.actions;
export default catalogSlice.reducer;

// ---------- selectors ----------
const byId = (list) => Object.fromEntries(list.map((row) => [String(row.id), row]));

export const selectCatalog = (state) => state.catalog;

export const selectMaps = createSelector(
  [(s) => s.catalog.fasilitas, (s) => s.catalog.layanan, (s) => s.catalog.dokter, (s) => s.catalog.jadwal],
  (fasilitas, layanan, dokter, jadwal) => ({
    fasilitas: byId(fasilitas),
    layanan: byId(layanan),
    dokter: byId(dokter),
    jadwal: byId(jadwal),
  })
);

const sortJadwal = (a, b) =>
  URUTAN_HARI.indexOf(a.hari) - URUTAN_HARI.indexOf(b.hari) || String(a.jam_mulai).localeCompare(String(b.jam_mulai));

// Jadwal yang benar-benar bisa dipesan: jadwal aktif + dokter aktif.
export const selectBookableJadwal = createSelector(
  [(s) => s.catalog.jadwal, selectMaps],
  (jadwal, maps) => jadwal.filter((j) => j.aktif !== false && maps.dokter[String(j.dokter_id)]?.aktif !== false).sort(sortJadwal)
);

// Layanan diperkaya: fasilitas, jadwal yang bisa dipesan, dan status ketersediaan.
export const selectLayananEnriched = createSelector(
  [(s) => s.catalog.layanan, selectBookableJadwal, selectMaps],
  (layanan, jadwal, maps) =>
    layanan.map((l) => {
      const slots = jadwal.filter((j) => String(j.layanan_id) === String(l.id));
      const available = l.aktif !== false && slots.length > 0;
      return {
        ...l,
        fasilitas: maps.fasilitas[String(l.fasilitas_id)] ?? null,
        slots,
        hariPraktik: [...new Set(slots.map((j) => j.hari))],
        available,
        unavailableReason: l.aktif === false ? 'Layanan sedang tidak aktif' : slots.length === 0 ? 'Belum ada jadwal dokter' : null,
      };
    })
);

// Fasilitas diperkaya: layanan, status "buka hari ini".
export const selectFasilitasEnriched = createSelector(
  [(s) => s.catalog.fasilitas, selectLayananEnriched],
  (fasilitas, layanan) => {
    const today = hariIni();
    return fasilitas.map((f) => {
      const list = layanan.filter((l) => String(l.fasilitas_id) === String(f.id));
      return {
        ...f,
        layanan: list,
        availableCount: list.filter((l) => l.available).length,
        openToday: list.some((l) => l.available && l.slots.some((j) => j.hari === today)),
      };
    });
  }
);

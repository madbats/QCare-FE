import axios from 'axios';
import { API_URL, USE_MOCK } from '../config/env';
import { mockAdapter } from '../services/mock/adapter';
import { getError } from '../services/api';

// =====================================================================
// Axios khusus admin. Token admin disimpan terpisah dari token pasien,
// sehingga portal pasien & portal admin bisa dibuka di browser yang sama.
// "Ingat perangkat ini" -> localStorage, selain itu -> sessionStorage.
// =====================================================================

const KEY = 'qcare_admin_session';

const read = (storage) => {
  try {
    const raw = storage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const adminSession = {
  get: () => read(localStorage) ?? read(sessionStorage),
  set: (token, admin, remember) => {
    try {
      const target = remember ? localStorage : sessionStorage;
      (remember ? sessionStorage : localStorage).removeItem(KEY);
      target.setItem(KEY, JSON.stringify({ token, admin, loginAt: new Date().toISOString() }));
    } catch {
      /* abaikan */
    }
  },
  update: (admin) => {
    try {
      [localStorage, sessionStorage].forEach((s) => {
        const cur = read(s);
        if (cur) s.setItem(KEY, JSON.stringify({ ...cur, admin: { ...cur.admin, ...admin } }));
      });
    } catch {
      /* abaikan */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(KEY);
      sessionStorage.removeItem(KEY);
    } catch {
      /* abaikan */
    }
  },
};

export const adminApi = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

if (USE_MOCK) adminApi.defaults.adapter = mockAdapter;

adminApi.interceptors.request.use((config) => {
  const token = adminSession.get()?.token;
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let onUnauthorized = null;
export const setAdminUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

adminApi.interceptors.response.use(
  (res) => res,
  (error) => {
    const url = error.config?.url || '';
    if (error.response?.status === 401 && !url.startsWith('/auth/login') && !url.startsWith('/password-reset') && adminSession.get()?.token) {
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

export { getError };

// Endpoint per resource (sesuai routes/*.js backend)
export const RESOURCES = {
  antrean: '/antrean',
  pasien: '/pasien',
  dokter: '/dokter',
  layanan: '/layanan',
  fasilitas: '/fasilitas',
  jadwal: '/jadwal-dokter',
  riwayat: '/riwayat-antrean',
  admin: '/admin',
};

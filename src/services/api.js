import axios from 'axios';
import { API_URL, USE_MOCK } from '../config/env';
import { session } from '../utils/storage';
import { mockAdapter } from './mock/adapter';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Backend belum disambungkan: semua request dijawab mock adapter
// dengan endpoint, validasi, dan format respons yang sama dengan backend.
// Ubah VITE_USE_MOCK=false di .env untuk memakai backend asli.
if (USE_MOCK) {
  api.defaults.adapter = mockAdapter;
}

// Kirim JWT ke setiap request (backend: Authorization: Bearer <token>).
api.interceptors.request.use((config) => {
  const token = session.getToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handler 401 didaftarkan dari main.jsx agar file ini tidak meng-import store
// (mencegah circular import).
let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

const AUTH_ENDPOINTS = ['/pasien-auth/login', '/pasien-auth/register', '/password-reset'];

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const isAuthEndpoint = AUTH_ENDPOINTS.some((path) => url.startsWith(path));

    // Backend tidak punya endpoint refresh token. Token kedaluwarsa (401)
    // berarti sesi habis -> keluar dan arahkan ke halaman masuk.
    if (status === 401 && !isAuthEndpoint && session.getToken()) {
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

// Format error backend: { message: "..." }
export const getError = (error) => {
  if (error?.response?.data?.message) return { message: error.response.data.message, status: error.response.status };
  if (error?.code === 'ECONNABORTED') return { message: 'Server terlalu lama merespons. Coba lagi.', status: 0 };
  return { message: 'Tidak dapat terhubung ke server. Periksa koneksi internet kamu.', status: 0 };
};

// Semua konfigurasi berbasis environment dikumpulkan di sini.
// Jangan menaruh secret backend (JWT_SECRET, Supabase key) di frontend.

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Selama backend belum disambungkan, request dilayani oleh mock adapter
// yang meniru endpoint & format respons backend QCare.
export const USE_MOCK = String(import.meta.env.VITE_USE_MOCK ?? 'true') !== 'false';

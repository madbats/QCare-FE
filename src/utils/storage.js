// Pembungkus localStorage yang aman (tidak crash bila storage diblokir).

const safeGet = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const safeSet = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage penuh / diblokir: abaikan */
  }
};

const safeRemove = (key) => {
  try {
    localStorage.removeItem(key);
  } catch {
    /* abaikan */
  }
};

const SESSION_KEY = 'qcare_session';

// Backend QCare memakai JWT Bearer token (bukan cookie), jadi token disimpan
// di sisi client lalu dikirim lewat header Authorization oleh Axios.
export const session = {
  get: () => safeGet(SESSION_KEY, null),
  getToken: () => safeGet(SESSION_KEY, null)?.token ?? null,
  set: (token, user) => safeSet(SESSION_KEY, { token, user }),
  updateUser: (user) => {
    const current = safeGet(SESSION_KEY, null);
    if (current) safeSet(SESSION_KEY, { ...current, user: { ...current.user, ...user } });
  },
  clear: () => safeRemove(SESSION_KEY),
};

// Backend belum punya endpoint "antrean milik saya", sehingga ID antrean
// yang dibuat pasien dicatat di perangkat lalu diambil lewat GET /antrean/:id.
const historyKey = (pasienId) => `qcare_history_${pasienId}`;

export const queueHistory = {
  list: (pasienId) => safeGet(historyKey(pasienId), []),
  add: (pasienId, antreanId) => {
    const list = safeGet(historyKey(pasienId), []).filter((id) => String(id) !== String(antreanId));
    safeSet(historyKey(pasienId), [antreanId, ...list]);
  },
  remove: (pasienId, antreanId) => {
    const list = safeGet(historyKey(pasienId), []).filter((id) => String(id) !== String(antreanId));
    safeSet(historyKey(pasienId), list);
  },
};

export const prefs = {
  get: () => safeGet('qcare_prefs', null),
  set: (value) => safeSet('qcare_prefs', value),
};

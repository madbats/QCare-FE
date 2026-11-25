import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loginAdmin } from '../store/adminAuthSlice';
import { showToast } from '../../features/ui/uiSlice';
import { Btn, Field, Pill } from '../ui';
import PasswordInput from '../../components/PasswordInput';
import { USE_MOCK } from '../../config/env';

// Layar "01 · Masuk". Backend login admin memakai email (bukan username),
// sehingga kolom "Username Admin" diganti "Email Admin".
const DEMO = [
  { email: 'nadia.admin@qcare.id', name: 'Nadia Kusuma', role: 'Admin klinik' },
  { email: 'fajar.loket@qcare.id', name: 'Fajar Ramadhan', role: 'Admin loket' },
];

export default function AdminLogin() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { admin, status, error, expired } = useSelector((s) => s.adminAuth);
  const [form, setForm] = useState({ email: '', password: '', remember: true });
  const [touched, setTouched] = useState(false);

  if (admin) return <Navigate to={location.state?.from?.pathname ?? '/admin'} replace />;

  const errors = {
    email: !form.email ? 'Email wajib diisi' : !/^\S+@\S+\.\S+$/.test(form.email) ? 'Format email tidak valid' : null,
    password: !form.password ? 'Password wajib diisi' : null,
  };

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (errors.email || errors.password) return;
    try {
      const res = await dispatch(loginAdmin({ email: form.email.trim(), password: form.password, remember: form.remember })).unwrap();
      dispatch(showToast(`Selamat datang, ${res.admin.nama_admin}!`));
      navigate(location.state?.from?.pathname ?? '/admin', { replace: true });
    } catch {
      /* tampil dari state */
    }
  };

  return (
    <div className="a-login">
      <section className="a-login-hero">
        <p className="a-login-logo">QCARE</p>
        <span className="a-login-badge">PORTAL ADMIN KLINIK</span>
        <h1>
          Layanan lebih tertata.
          <br />
          Pasien lebih terjaga.
        </h1>
        <p className="a-login-lead">Portal operasional klinik untuk kelola antrean real-time, dokter, jadwal praktik, dan data pasien.</p>
        <ol className="a-login-steps">
          <li>
            <span>01</span> Registrasi &amp; kategori pasien
          </li>
          <li>
            <span>02</span> Jadwal &amp; penerbitan nomor
          </li>
          <li>
            <span>03</span> Pelayanan &amp; riwayat kunjungan
          </li>
        </ol>
      </section>

      <section className="a-login-form">
        <Pill>AKSES ADMIN</Pill>
        <h2>Selamat datang kembali</h2>
        <p className="a-muted">Masuk untuk mulai mengelola layanan klinik.</p>

        {expired && <div className="a-note a-note-amber">Sesi berakhir. Silakan masuk kembali.</div>}
        {location.state?.passwordReset && <div className="a-note">Password berhasil diperbarui. Silakan masuk.</div>}
        {error?.message && (
          <div className="a-note a-note-rose" role="alert">
            {error.message}
          </div>
        )}

        <form onSubmit={submit} noValidate className="a-form">
          <Field label="Email Admin" htmlFor="a-email" error={touched && errors.email}>
            <input id="a-email" type="email" autoComplete="username" className="a-input" placeholder="nama@qcare.id" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Password" htmlFor="a-pass" error={touched && errors.password}>
            <PasswordInput id="a-pass" className="a-input" autoComplete="current-password" placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          <div className="a-login-options">
            <label className="a-check">
              <input type="checkbox" checked={form.remember} onChange={(e) => setForm({ ...form, remember: e.target.checked })} />
              Ingat perangkat ini
            </label>
            <Link to="/admin/lupa-password" className="a-link">
              Lupa password?
            </Link>
          </div>
          <Btn type="submit" loading={status === 'loading'} className="a-btn-block">
            Masuk ke Aplikasi Admin
          </Btn>
        </form>

        {USE_MOCK && (
          <>
            <p className="a-overline">MASUK CEPAT AKUN DEMO</p>
            <div className="a-demo-grid">
              {DEMO.map((d) => (
                <button key={d.email} type="button" className="a-demo" onClick={() => setForm({ ...form, email: d.email, password: 'admin123' })}>
                  <strong>{d.name}</strong>
                  <span>{d.role}</span>
                </button>
              ))}
            </div>
          </>
        )}
        <p className="a-footnote">Akses hanya untuk petugas klinik yang berwenang.</p>
        <p className="a-footnote">
          Bukan petugas?{' '}
          <Link to="/masuk" className="a-link">
            Masuk sebagai pasien
          </Link>
        </p>
      </section>
    </div>
  );
}

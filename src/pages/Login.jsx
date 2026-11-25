import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loginPasien, clearAuthError } from '../features/auth/authSlice';
import { showToast } from '../features/ui/uiSlice';
import AuthLayout, { AuthSwitch, GoogleAlternative } from '../layouts/AuthLayout';
import PasswordInput from '../components/PasswordInput';
import { Alert, Spinner } from '../components/ui';
import Icon from '../components/Icon';
import { USE_MOCK } from '../config/env';

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { status, error, sessionExpired } = useSelector((state) => state.auth);
  const [form, setForm] = useState({ email: location.state?.email ?? '', password: '' });
  const [touched, setTouched] = useState(false);

  const from = location.state?.from?.pathname || '/';

  useEffect(() => () => dispatch(clearAuthError()), [dispatch]);

  const errors = {
    email: !form.email ? 'Email wajib diisi' : !/^\S+@\S+\.\S+$/.test(form.email) ? 'Format email tidak valid' : null,
    password: !form.password ? 'Kata sandi wajib diisi' : null,
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (errors.email || errors.password) return;
    try {
      const { user } = await dispatch(loginPasien({ email: form.email.trim(), password: form.password })).unwrap();
      dispatch(showToast(`Selamat datang, ${user.nama_pasien}!`));
      navigate(from, { replace: true });
    } catch {
      /* error tampil dari state.auth.error */
    }
  };

  return (
    <AuthLayout
      tagline="Selamat Datang"
      footer={<AuthSwitch text="Belum punya akun?" linkText="Daftar" to="/daftar" state={location.state} />}
    >
      <div className="auth-welcome">
        <h1>Masuk ke Layanan</h1>
        <p>Masuk untuk mulai mengatur layanan kesehatan</p>
      </div>

      {sessionExpired && <Alert tone="warning">Sesi berakhir. Silakan masuk kembali.</Alert>}
      {location.state?.registered && <Alert tone="success">Registrasi berhasil. Silakan masuk dengan akun barumu.</Alert>}
      {location.state?.passwordReset && <Alert tone="success">Kata sandi diperbarui. Silakan masuk kembali.</Alert>}
      {error?.message && <Alert tone="danger">{error.message}</Alert>}

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <div className="auth-field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            className="auth-input"
            placeholder="nama@gmail.com"
            value={form.email}
            onChange={handleChange}
            aria-invalid={Boolean(touched && errors.email) || undefined}
          />
          {touched && errors.email && <p className="field-error"><Icon name="alert" size={13} /> {errors.email}</p>}
        </div>
        <div className="auth-field">
          <label htmlFor="password">Kata sandi</label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            className="auth-input"
            placeholder="••••••••"
            value={form.password}
            onChange={handleChange}
            aria-invalid={Boolean(touched && errors.password) || undefined}
          />
          {touched && errors.password && <p className="field-error"><Icon name="alert" size={13} /> {errors.password}</p>}
        </div>
        <div className="auth-forgot">
          <Link to="/lupa-password">Lupa kata sandi?</Link>
        </div>
        <button type="submit" className="btn-auth" disabled={status === 'loading'}>
          {status === 'loading' && <Spinner label="Memproses" />}
          {status === 'loading' ? 'Memproses...' : 'Masuk'}
        </button>
      </form>

      <GoogleAlternative />

      <div className="privacy-note">
        <p className="privacy-title">Data kesehatanmu tetap pribadi</p>
        <p>QCare hanya menggunakan data untuk kebutuhan pendaftaran layanan.</p>
      </div>

      {USE_MOCK && (
        <div className="demo-box">
          <p>
            <strong>Akun demo (mode simulasi)</strong>
            <br />
            demo@qcare.id · password123
          </p>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setForm({ email: 'demo@qcare.id', password: 'password123' })}>
            Isi otomatis
          </button>
        </div>
      )}
    </AuthLayout>
  );
}

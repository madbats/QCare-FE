import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { registerPasien, clearAuthError } from '../features/auth/authSlice';
import AuthLayout, { AuthSwitch, GoogleAlternative } from '../layouts/AuthLayout';
import PasswordInput from '../components/PasswordInput';
import { Alert, Select, Spinner } from '../components/ui';
import Icon from '../components/Icon';
import { KATEGORI_PASIEN } from '../constants/patient';

const initialForm = { nama_pasien: '', email: '', password: '', konfirmasi: '', kategori_pasien: '', setuju: false };

const validate = (f) => ({
  nama_pasien: !f.nama_pasien.trim() ? 'Nama lengkap wajib diisi' : f.nama_pasien.length > 100 ? 'Maksimal 100 karakter' : null,
  email: !f.email ? 'Email wajib diisi' : !/^\S+@\S+\.\S+$/.test(f.email) ? 'Format email tidak valid' : null,
  password: !f.password ? 'Kata sandi wajib diisi' : f.password.length < 8 ? 'Kata sandi minimal 8 karakter' : null,
  konfirmasi: !f.konfirmasi ? 'Ulangi kata sandi' : f.konfirmasi !== f.password ? 'Konfirmasi kata sandi tidak sama' : null,
  // Backend mewajibkan kategori_pasien saat registrasi (tidak ada di desain -> ditambahkan).
  kategori_pasien: !f.kategori_pasien ? 'Pilih kategori pasien' : null,
  setuju: !f.setuju ? 'Kamu perlu menyetujui Syarat Layanan & Kebijakan Privasi' : null,
});

export default function Register() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { status, error } = useSelector((state) => state.auth);
  const [form, setForm] = useState(initialForm);
  const [touched, setTouched] = useState(false);

  useEffect(() => () => dispatch(clearAuthError()), [dispatch]);

  const errors = validate(form);
  const show = (key) => touched && errors[key];
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;
    const payload = {
      nama_pasien: form.nama_pasien.trim(),
      email: form.email.trim(),
      password: form.password,
      kategori_pasien: form.kategori_pasien,
    };
    try {
      await dispatch(registerPasien(payload)).unwrap();
      navigate('/masuk', { replace: true, state: { registered: true, email: payload.email, from: location.state?.from } });
    } catch {
      /* error tampil dari state.auth.error */
    }
  };

  const FieldError = ({ name }) =>
    show(name) ? (
      <p className="field-error" role="alert">
        <Icon name="alert" size={13} /> {errors[name]}
      </p>
    ) : null;

  return (
    <AuthLayout tagline="Buat akun baru" footer={<AuthSwitch text="Sudah punya akun?" linkText="Masuk" to="/masuk" />}>
      {error?.message && <Alert tone="danger">{error.message}</Alert>}

      <form onSubmit={handleSubmit} className="auth-form auth-form-tight" noValidate>
        <div className="auth-field">
          <label htmlFor="nama_pasien">Nama lengkap</label>
          <input id="nama_pasien" name="nama_pasien" className="auth-input" autoComplete="name" placeholder="Nama Kamu" value={form.nama_pasien} onChange={handleChange} aria-invalid={Boolean(show('nama_pasien')) || undefined} />
          <FieldError name="nama_pasien" />
        </div>
        <div className="auth-field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" className="auth-input" autoComplete="email" placeholder="nama@gmail.com" value={form.email} onChange={handleChange} aria-invalid={Boolean(show('email')) || undefined} />
          <FieldError name="email" />
        </div>
        <div className="auth-field">
          <label htmlFor="password">Kata sandi</label>
          <PasswordInput id="password" name="password" className="auth-input" autoComplete="new-password" placeholder="••••••••" value={form.password} onChange={handleChange} />
          <FieldError name="password" />
        </div>
        <div className="auth-field">
          <label htmlFor="konfirmasi">Konfirmasi kata sandi</label>
          <PasswordInput id="konfirmasi" name="konfirmasi" className="auth-input" autoComplete="new-password" placeholder="Ulangi kata sandi" value={form.konfirmasi} onChange={handleChange} />
          <FieldError name="konfirmasi" />
        </div>
        <div className="auth-field">
          <label htmlFor="kategori_pasien">Kategori pasien</label>
          <Select
            id="kategori_pasien"
            value={form.kategori_pasien}
            onChange={(v) => setForm({ ...form, kategori_pasien: v })}
            placeholder="Pilih kategori pasien"
            invalid={Boolean(show('kategori_pasien'))}
            options={KATEGORI_PASIEN.map((k) => ({ value: k.value, label: `${k.label} — ${k.desc}` }))}
          />
          <FieldError name="kategori_pasien" />
        </div>

        <label className="agree-row">
          <input type="checkbox" className="agree-check" checked={form.setuju} onChange={(e) => setForm({ ...form, setuju: e.target.checked })} />
          <span>Saya setuju dengan Syarat Layanan dan Kebijakan Privasi QCare.</span>
        </label>
        <FieldError name="setuju" />

        <button type="submit" className="btn-auth" disabled={status === 'loading'}>
          {status === 'loading' && <Spinner label="Memproses" />}
          {status === 'loading' ? 'Mendaftarkan...' : 'Daftar sekarang'}
        </button>
      </form>

      <GoogleAlternative />
    </AuthLayout>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout, { AuthSwitch } from '../layouts/AuthLayout';
import PasswordInput from '../components/PasswordInput';
import { Alert, Spinner } from '../components/ui';
import { api, getError } from '../services/api';
import { USE_MOCK } from '../config/env';
import iconKey from '../assets/icon-key.png';

// Kartu "Reset Password" dari Figma, dilanjutkan dengan langkah OTP & kata
// sandi baru sesuai endpoint backend:
// POST /password-reset/request -> /verify -> /reset  (role: "pasien")
const STEPS = [
  { title: 'Reset Password', sub: 'Masukkan email kamu untuk reset kata sandi' },
  { title: 'Verifikasi OTP', sub: 'Masukkan 6 digit kode OTP yang dikirimkan' },
  { title: 'Kata Sandi Baru', sub: 'Buat kata sandi baru minimal 8 karakter' },
];

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [simOtp, setSimOtp] = useState(null);

  const run = async (fn) => {
    setLoading(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(getError(err).message);
    } finally {
      setLoading(false);
    }
  };

  const requestOtp = (e) => {
    e?.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Masukkan email yang valid');
    return run(async () => {
      const res = await api.post('/password-reset/request', { email: email.trim(), role: 'pasien' });
      setInfo(`${res.data.message} Kode berlaku 5 menit.`);
      setSimOtp(res.data.simulasi_otp ?? null);
      setOtp('');
      setStep(1);
    });
  };

  const verifyOtp = (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) return setError('Kode OTP terdiri dari 6 angka');
    return run(async () => {
      await api.post('/password-reset/verify', { email: email.trim(), role: 'pasien', otp });
      setInfo(null);
      setStep(2);
    });
  };

  const resetPassword = (e) => {
    e.preventDefault();
    if (password.length < 8) return setError('Kata sandi minimal 8 karakter');
    if (password !== confirm) return setError('Konfirmasi kata sandi tidak sama');
    return run(async () => {
      await api.post('/password-reset/reset', { email: email.trim(), role: 'pasien', otp, new_password: password });
      navigate('/masuk', { replace: true, state: { passwordReset: true, email: email.trim() } });
    });
  };

  const current = STEPS[step];

  return (
    <AuthLayout tagline="Lupa kata sandi" footer={<AuthSwitch text="Ingat kata sandi?" linkText="Masuk" to="/masuk" />}>
      <section className="reset-card" aria-labelledby="reset-title">
        <span className="reset-icon">
          <img src={iconKey} alt="" width="41" height="41" />
        </span>
        <div className="reset-head">
          <h1 id="reset-title">{current.title}</h1>
          <p>{current.sub}</p>
        </div>
        <hr className="reset-line" />

        {error && <Alert tone="danger">{error}</Alert>}

        {step === 0 && (
          <form className="auth-form" onSubmit={requestOtp} noValidate>
            <div className="auth-field">
              <label htmlFor="reset-email">Email</label>
              <input id="reset-email" type="email" className="auth-input" autoComplete="email" placeholder="nama@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <button type="submit" className="btn-auth" disabled={loading}>
              {loading && <Spinner />} Reset Password
            </button>
          </form>
        )}

        {step === 1 && (
          <form className="auth-form" onSubmit={verifyOtp} noValidate>
            {info && <Alert tone="info">{info}</Alert>}
            {USE_MOCK && simOtp && (
              <div className="demo-box">
                <p>
                  <strong>Simulasi OTP:</strong> <code>{simOtp}</code>
                  <br />
                  <span className="small">Backend asli mencetak OTP di console server.</span>
                </p>
              </div>
            )}
            <div className="auth-field">
              <label htmlFor="otp">Kode OTP</label>
              <input
                id="otp"
                className="auth-input input-otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="••••••"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <button type="submit" className="btn-auth" disabled={loading}>
              {loading && <Spinner />} Verifikasi
            </button>
            <button type="button" className="btn-link" onClick={requestOtp} disabled={loading}>
              Kirim ulang kode
            </button>
          </form>
        )}

        {step === 2 && (
          <form className="auth-form" onSubmit={resetPassword} noValidate>
            <div className="auth-field">
              <label htmlFor="new-pass">Kata sandi baru</label>
              <PasswordInput id="new-pass" className="auth-input" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="auth-field">
              <label htmlFor="new-pass2">Ulangi kata sandi baru</label>
              <PasswordInput id="new-pass2" className="auth-input" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <button type="submit" className="btn-auth" disabled={loading}>
              {loading && <Spinner />} Simpan kata sandi
            </button>
          </form>
        )}
      </section>
    </AuthLayout>
  );
}

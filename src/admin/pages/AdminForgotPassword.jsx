import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminApi, getError } from '../api';
import { Btn, Card, Field, PageTitle } from '../ui';
import PasswordInput from '../../components/PasswordInput';
import { BrandMark } from '../AdminLayout';
import { USE_MOCK } from '../../config/env';

// Lupa password admin: POST /password-reset/request -> /verify -> /reset (role "admin")
export default function AdminForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [simOtp, setSimOtp] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async (fn) => {
    setLoading(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(getError(e).message);
    } finally {
      setLoading(false);
    }
  };

  const request = (e) => {
    e?.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Masukkan email admin yang valid');
    return run(async () => {
      const res = await adminApi.post('/password-reset/request', { email: email.trim(), role: 'admin' });
      setInfo(res.data.message);
      setSimOtp(res.data.simulasi_otp ?? null);
      setStep(1);
    });
  };
  const verify = (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) return setError('Kode OTP terdiri dari 6 angka');
    return run(async () => {
      await adminApi.post('/password-reset/verify', { email: email.trim(), role: 'admin', otp });
      setStep(2);
    });
  };
  const reset = (e) => {
    e.preventDefault();
    if (pass.length < 8) return setError('Password minimal 8 karakter');
    if (pass !== pass2) return setError('Konfirmasi password tidak sama');
    return run(async () => {
      await adminApi.post('/password-reset/reset', { email: email.trim(), role: 'admin', otp, new_password: pass });
      navigate('/admin/masuk', { replace: true, state: { passwordReset: true } });
    });
  };

  return (
    <div className="a-auth-page">
      <div className="a-auth-brand">
        <BrandMark />
        <strong>QCARE</strong>
      </div>
      <PageTitle title="Reset Password" subtitle="Perbarui password untuk menjaga keamanan akun admin." />
      <Card>
        <h2 className="a-card-title">{['Email akun', 'Verifikasi OTP', 'Password baru'][step]}</h2>
        {error && (
          <div className="a-note a-note-rose" role="alert">
            {error}
          </div>
        )}
        {step === 0 && (
          <form onSubmit={request} className="a-form" noValidate>
            <Field label="Email Admin" required htmlFor="f-email">
              <input id="f-email" type="email" className="a-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@qcare.id" />
            </Field>
            <Btn type="submit" loading={loading} className="a-btn-block">
              Kirim Kode OTP
            </Btn>
          </form>
        )}
        {step === 1 && (
          <form onSubmit={verify} className="a-form" noValidate>
            {info && <div className="a-note">{info} Kode berlaku 5 menit.</div>}
            {USE_MOCK && simOtp && (
              <div className="a-note a-note-amber">
                Simulasi OTP: <strong>{simOtp}</strong> (backend asli mencetak OTP di console server)
              </div>
            )}
            <Field label="Kode OTP" required htmlFor="f-otp">
              <input id="f-otp" inputMode="numeric" maxLength={6} className="a-input a-input-otp" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} />
            </Field>
            <Btn type="submit" loading={loading} className="a-btn-block">
              Verifikasi
            </Btn>
          </form>
        )}
        {step === 2 && (
          <form onSubmit={reset} className="a-form" noValidate>
            <Field label="Password Baru" required htmlFor="f-pass" hint="Minimal 8 karakter">
              <PasswordInput id="f-pass" className="a-input" value={pass} onChange={(e) => setPass(e.target.value)} />
            </Field>
            <Field label="Ulangi Password" required htmlFor="f-pass2">
              <PasswordInput id="f-pass2" className="a-input" value={pass2} onChange={(e) => setPass2(e.target.value)} />
            </Field>
            <Btn type="submit" loading={loading} className="a-btn-block">
              Simpan Password
            </Btn>
          </form>
        )}
      </Card>
      <p className="a-footnote center">
        <Link to="/admin/masuk" className="a-link">
          ← Kembali ke halaman masuk
        </Link>
      </p>
    </div>
  );
}

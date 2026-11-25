import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { showToast } from '../features/ui/uiSlice';
import logoQCare from '../assets/logo-qcare.png';

// Kerangka layar Login & Registrasi sesuai Figma:
// logo + tagline, form, tombol utama, "atau masuk dengan", tautan bawah.
export default function AuthLayout({ tagline, children, footer }) {
  return (
    <div className="auth-page">
      <div className="auth-column">
        <div className="auth-tagline">
          <img src={logoQCare} alt="QCare" className="auth-logo" width="148" height="57" />
          <p className="auth-tagline-title">{tagline}</p>
          <p className="auth-tagline-sub">Temukan Layanan Kesehatan</p>
        </div>
        {children}
        {footer && <div className="auth-footer">{footer}</div>}
      </div>
    </div>
  );
}

export function AuthSwitch({ text, linkText, to, state }) {
  return (
    <p className="auth-switch">
      {text}{' '}
      <Link to={to} state={state}>
        {linkText}
      </Link>
    </p>
  );
}

// Backend QCare belum menyediakan OAuth Google, jadi tombol tetap
// ditampilkan sesuai desain namun memberi informasi saat ditekan.
export function GoogleAlternative() {
  const dispatch = useDispatch();
  return (
    <div className="auth-alt">
      <p className="auth-alt-label">atau masuk dengan</p>
      <button
        type="button"
        className="btn-google"
        onClick={() => dispatch(showToast('Masuk dengan Google belum tersedia. Gunakan email & kata sandi.', 'info'))}
      >
        <span className="btn-google-mark">G</span> Lanjutkan dengan Google
      </button>
    </div>
  );
}

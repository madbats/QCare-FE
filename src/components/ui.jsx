import { useEffect, useId, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Icon from './Icon';
import { dismissToast } from '../features/ui/uiSlice';
import { statusMeta } from '../utils/queue';

export function Spinner({ label = 'Memuat...' }) {
  return (
    <span className="spinner" role="status">
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function LoadingBlock({ label = 'Memuat data...' }) {
  return (
    <div className="state-block" aria-live="polite">
      <Spinner label={label} />
      <p>{label}</p>
    </div>
  );
}

export function SkeletonList({ rows = 3 }) {
  return (
    <div className="stack" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton" />
      ))}
    </div>
  );
}

export function ErrorState({ title = 'Gagal memuat data', message, onRetry }) {
  return (
    <div className="state-block state-error" role="alert">
      <span className="state-icon">
        <Icon name="alert" size={26} />
      </span>
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {onRetry && (
        <button type="button" className="btn btn-outline" onClick={onRetry}>
          <Icon name="refresh" size={18} /> Coba lagi
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon = 'info', title, message, action }) {
  return (
    <div className="state-block">
      <span className="state-icon">
        <Icon name={icon} size={26} />
      </span>
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {action}
    </div>
  );
}

export function StatusBadge({ status }) {
  const meta = statusMeta(status);
  return <span className={`badge badge-${meta.tone}`}>{meta.label}</span>;
}

export function PageHeader({ title, subtitle, back, action }) {
  const navigate = useNavigate();
  return (
    <header className="page-header">
      {back && (
        <button
          type="button"
          className="icon-btn"
          onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}
          aria-label="Kembali"
        >
          <Icon name="arrowLeft" />
        </button>
      )}
      <div className="page-header-text">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Field({ label, hint, error, children, required, htmlFor }) {
  return (
    <div className={`field ${error ? 'field-invalid' : ''}`}>
      {label && (
        <label htmlFor={htmlFor}>
          {label}
          {required && <span className="req" aria-hidden="true"> *</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="field-hint">{hint}</p>}
      {error && (
        <p className="field-error" role="alert">
          <Icon name="alert" size={14} /> {error}
        </p>
      )}
    </div>
  );
}

export function Alert({ tone = 'info', title, children }) {
  return (
    <div className={`alert alert-${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <Icon name={tone === 'success' ? 'checkCircle' : tone === 'danger' || tone === 'warning' ? 'alert' : 'info'} size={20} />
      <div>
        {title && <strong>{title}</strong>}
        {children && <div>{children}</div>}
      </div>
    </div>
  );
}

// Modal: fokus otomatis, tutup dengan Esc / klik di luar panel.
export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  const panelRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div
        className={`modal modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={panelRef}
        tabIndex={-1}
      >
        <div className="modal-head">
          <h2 id={titleId}>{title}</h2>
          {onClose && (
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Tutup">
              <Icon name="x" />
            </button>
          )}
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Toaster() {
  const toasts = useSelector((state) => state.ui.toasts);
  const dispatch = useDispatch();

  useEffect(() => {
    if (toasts.length === 0) return undefined;
    const timers = toasts.map((t) => setTimeout(() => dispatch(dismissToast(t.id)), 4000));
    return () => timers.forEach(clearTimeout);
  }, [toasts, dispatch]);

  return (
    <div className="toaster" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.tone}`}>
          <Icon name={t.tone === 'danger' ? 'alert' : 'checkCircle'} size={18} />
          <span>{t.message}</span>
          <button type="button" className="toast-close" onClick={() => dispatch(dismissToast(t.id))} aria-label="Tutup notifikasi">
            <Icon name="x" size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function Stepper({ steps, current }) {
  return (
    <ol className="stepper" aria-label="Langkah pendaftaran">
      {steps.map((label, i) => {
        const state = i < current ? 'done' : i === current ? 'active' : 'todo';
        return (
          <li key={label} className={`step step-${state}`} aria-current={state === 'active' ? 'step' : undefined}>
            <span className="step-dot">{state === 'done' ? <Icon name="check" size={14} strokeWidth={2.6} /> : i + 1}</span>
            <span className="step-label">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function InfoRow({ icon, label, value }) {
  return (
    <div className="info-row">
      {icon && <Icon name={icon} size={18} />}
      <span className="info-label">{label}</span>
      <span className="info-value">{value ?? '-'}</span>
    </div>
  );
}

// Dropdown sesuai komponen Figma (Kategori pasien / Jenis Kelamin).
// variant "card"  -> kartu putih radius 16 (layar Ambil Antrean)
// variant "field" -> trigger putih berborder #d9d9d9 (Edit Profil, Registrasi)
export function Select({ id, value, onChange, options, placeholder = 'Pilih salah satu', variant = 'field', disabled, invalid, ...rest }) {
  return (
    <div className={`select select-${variant} ${invalid ? 'is-invalid' : ''} ${disabled ? 'is-disabled' : ''}`}>
      <select
        id={id}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className={value ? '' : 'is-placeholder'}
        {...rest}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      <Icon name="chevronDown" size={20} className="select-chevron" />
    </div>
  );
}

export function Chip({ tone = 'secondary', children }) {
  return <span className={`chip chip-${tone}`}>{children}</span>;
}

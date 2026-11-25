import { Link, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import { Modal, Spinner } from '../components/ui';
import { STATUS_TONE } from './model';
import { normalizeStatus } from '../utils/queue';

// Komponen dasar portal admin (Figma "Admin": Inter + Plus Jakarta Sans,
// palet teal/slate, kartu radius 16, tombol 44px radius 10).

export function Pill({ tone = 'teal', children, dot }) {
  return (
    <span className={`a-pill a-pill-${tone}`}>
      {dot && <span className="a-pill-dot" aria-hidden="true" />}
      {children}
    </span>
  );
}

const STATUS_LABEL = { menunggu: 'Menunggu', dipanggil: 'Dipanggil', dilayani: 'Dilayani', selesai: 'Selesai', dibatalkan: 'Dibatalkan' };
export function StatusPill({ status }) {
  const key = normalizeStatus(status);
  return <Pill tone={STATUS_TONE[key] ?? 'slate'}>{STATUS_LABEL[key] ?? status}</Pill>;
}

export function Btn({ variant = 'primary', to, children, className = '', loading, disabled, ...rest }) {
  const cls = `a-btn a-btn-${variant} ${className}`;
  const content = (
    <>
      {loading && <Spinner label="Memproses" />}
      {children}
    </>
  );
  if (to) {
    return (
      <Link to={to} className={cls} {...rest}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} disabled={loading || disabled} {...rest}>
      {content}
    </button>
  );
}

export function PageTitle({ title, subtitle, children }) {
  return (
    <div className="a-page-title">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="a-page-actions">{children}</div>}
    </div>
  );
}

// Baris "pill ringkasan + tombol tambah" di bawah judul halaman
export function Toolbar({ summary, children }) {
  return (
    <div className="a-toolbar">
      {summary && <Pill>{summary}</Pill>}
      <div className="a-toolbar-actions">{children}</div>
    </div>
  );
}

export function Card({ children, className = '', as: Tag = 'section', ...rest }) {
  return (
    <Tag className={`a-card ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

export function BackButton({ to, children = 'Kembali' }) {
  const navigate = useNavigate();
  return (
    <button type="button" className="a-btn a-btn-secondary a-btn-auto" onClick={() => (to ? navigate(to) : navigate(-1))}>
      ← {children}
    </button>
  );
}

export function Field({ label, required, hint, error, htmlFor, children }) {
  return (
    <div className={`a-field ${error ? 'is-invalid' : ''}`}>
      {label && (
        <label htmlFor={htmlFor}>
          {label}
          {required && ' *'}
        </label>
      )}
      {children}
      {hint && !error && <p className="a-hint">{hint}</p>}
      {error && (
        <p className="a-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function SelectInput({ id, value, onChange, options, placeholder = 'Pilih', disabled, invalid }) {
  return (
    <div className={`a-select ${disabled ? 'is-disabled' : ''}`}>
      <select
        id={id}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className={value === '' || value == null ? 'is-placeholder' : ''}
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
      <Icon name="chevronDown" size={18} className="a-select-chevron" />
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder }) {
  return (
    <label className="a-search">
      <Icon name="search" size={16} />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </label>
  );
}

export function FilterChips({ options, value, onChange, label = 'Filter', className = '' }) {
  return (
    <div className={`a-chips ${className}`} role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          className={`a-chip a-chip-${o.tone ?? 'teal'} ${value === o.value ? 'is-active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function KV({ label, children, strong }) {
  return (
    <div className="a-kv">
      <span>{label}</span>
      <span className={strong ? 'is-strong' : ''}>{children ?? '-'}</span>
    </div>
  );
}

export function Progress({ value, max, tone }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const t = tone ?? (pct >= 100 ? 'amber' : 'teal');
  return (
    <div className="a-progress" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
      <span className={`a-progress-bar a-progress-${t}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Empty({ title, message, action }) {
  return (
    <div className="a-empty">
      <p className="a-empty-title">{title}</p>
      {message && <p>{message}</p>}
      {action}
    </div>
  );
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div className="a-empty is-error" role="alert">
      <p className="a-empty-title">Gagal memuat data</p>
      <p>{message}</p>
      {onRetry && (
        <Btn variant="secondary" className="a-btn-auto" onClick={onRetry}>
          Coba lagi
        </Btn>
      )}
    </div>
  );
}

export function Skeleton({ rows = 3 }) {
  return (
    <div className="a-stack" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="a-skeleton" />
      ))}
    </div>
  );
}

// Dialog konfirmasi (hapus / ubah status) — memakai Modal bersama.
export function ConfirmDialog({ open, title, message, confirmLabel = 'Ya, lanjutkan', tone = 'danger', loading, onConfirm, onClose, children }) {
  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      title={title}
      size="sm"
      footer={
        <div className="a-modal-actions">
          <Btn variant="secondary" onClick={onClose} disabled={loading}>
            Batal
          </Btn>
          <Btn variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Btn>
        </div>
      }
    >
      {message && <p>{message}</p>}
      {children}
    </Modal>
  );
}

export function Avatar({ text }) {
  return <span className="a-avatar">{text}</span>;
}

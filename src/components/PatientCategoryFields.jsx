import { useId } from 'react';
import { KATEGORI_PASIEN, KELOMPOK_PASIEN, KEBUTUHAN_KHUSUS } from '../constants/patient';
import { Select } from './ui';
import Icon from './Icon';

// User flow "Patient Categorization":
// pilih kategori -> "Memerlukan bantuan khusus?" -> (ya) pilih kebutuhan
// pendampingan / akses / komunikasi -> ringkasan kategori & kebutuhan.
//
// value = { kategori, kelompok, needHelp, needs, otherNeed }
export default function PatientCategoryFields({ value, onChange, variant = 'field', errors = {}, showKelompok = true }) {
  const id = useId();
  const set = (patch) => onChange({ ...value, ...patch });
  const toggleNeed = (need) =>
    set({ needs: value.needs.includes(need) ? value.needs.filter((n) => n !== need) : [...value.needs, need] });
  const groups = [...new Set(KEBUTUHAN_KHUSUS.map((k) => k.group))];
  const kelompokMeta = KELOMPOK_PASIEN.find((k) => k.value === value.kelompok);

  return (
    <div className="stack">
      <div className="field">
        <label htmlFor={`${id}-kat`} className="field-label">
          Kategori Pasien
        </label>
        <Select
          id={`${id}-kat`}
          variant={variant}
          value={value.kategori}
          onChange={(v) => set({ kategori: v })}
          placeholder="Pilih kategori pasien"
          invalid={Boolean(errors.kategori)}
          options={KATEGORI_PASIEN.map((k) => ({ value: k.value, label: `${k.label} — ${k.desc}` }))}
        />
        {errors.kategori && <FieldError>{errors.kategori}</FieldError>}
      </div>

      {showKelompok && (
        <div className="field">
          <label htmlFor={`${id}-kel`} className="field-label">
            Kelompok Pasien
          </label>
          <Select
            id={`${id}-kel`}
            variant={variant}
            value={value.kelompok}
            onChange={(v) => set({ kelompok: v })}
            options={KELOMPOK_PASIEN.map((k) => ({ value: k.value, label: k.label }))}
          />
          {kelompokMeta && <p className="field-hint">{kelompokMeta.desc}</p>}
        </div>
      )}

      <fieldset className="fieldset">
        <legend className="field-label">Memerlukan bantuan khusus?</legend>
        <div className="segmented" role="radiogroup">
          {[
            { v: false, label: 'Tidak perlu' },
            { v: true, label: 'Ya, perlu bantuan' },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              role="radio"
              aria-checked={value.needHelp === o.v}
              className={`segment ${value.needHelp === o.v ? 'is-active' : ''}`}
              onClick={() => set({ needHelp: o.v })}
            >
              {o.label}
            </button>
          ))}
        </div>

        {value.needHelp && (
          <div className="needs-box">
            {groups.map((g) => (
              <div key={g} className="needs-group">
                <p className="needs-group-title">{g}</p>
                {KEBUTUHAN_KHUSUS.filter((k) => k.group === g).map((k) => (
                  <label key={k.value} className="check-row">
                    <input type="checkbox" checked={value.needs.includes(k.value)} onChange={() => toggleNeed(k.value)} />
                    <span>{k.value}</span>
                  </label>
                ))}
              </div>
            ))}
            <div className="field">
              <label htmlFor={`${id}-other`} className="field-label small">
                Kebutuhan lain (opsional)
              </label>
              <input
                id={`${id}-other`}
                className="input"
                value={value.otherNeed}
                maxLength={120}
                onChange={(e) => set({ otherNeed: e.target.value })}
                placeholder="Contoh: butuh tempat duduk dekat loket"
              />
            </div>
            {errors.needs && <FieldError>{errors.needs}</FieldError>}
          </div>
        )}
      </fieldset>
    </div>
  );
}

function FieldError({ children }) {
  return (
    <p className="field-error" role="alert">
      <Icon name="alert" size={14} /> {children}
    </p>
  );
}

export const validateCategory = (value) => ({
  kategori: !value.kategori ? 'Pilih kategori pasien' : null,
  needs:
    value.needHelp && value.needs.length === 0 && !value.otherNeed.trim() ? 'Pilih minimal satu kebutuhan bantuan' : null,
});

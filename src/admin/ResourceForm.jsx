import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { createResource, updateResource, fetchResource } from './store/adminDataSlice';
import { showToast } from '../features/ui/uiSlice';
import { useAdminResources } from './model';
import { BackButton, Btn, Card, Empty, ErrorBox, Field, PageTitle, SelectInput, Skeleton } from './ui';

// =====================================================================
// Form tambah/ubah generik untuk layar 16–20 (Pasien, Dokter, Jadwal,
// Layanan, Fasilitas). Setiap layar cukup mendefinisikan konfigurasi field.
// =====================================================================
export default function ResourceForm({ config }) {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isEdit = Boolean(id);
  const { loading, error, retry } = useAdminResources([config.name, ...(config.needs ?? [])]);
  const state = useSelector((s) => s.adminData);
  const row = isEdit ? state[config.name].items.find((r) => String(r.id) === String(id)) : null;

  if (error) return <ErrorBox message={error.message} onRetry={retry} />;
  if (loading) return <Skeleton rows={4} />;
  if (isEdit && !row) return <Empty title="Data tidak ditemukan" action={<Btn to={config.backTo}>Kembali</Btn>} />;

  return (
    <FormBody
      key={row?.id ?? 'new'}
      config={config}
      row={row}
      state={state}
      isEdit={isEdit}
      params={params}
      onDone={(saved) => navigate(config.afterSave?.(saved, params, isEdit) ?? config.backTo, { replace: true })}
      dispatch={dispatch}
    />
  );
}

function FormBody({ config, row, state, isEdit, params, onDone, dispatch }) {
  const initial = useMemo(() => {
    const base = Object.fromEntries(config.fields.map((f) => [f.key, f.default ?? (f.type === 'toggle' ? true : '')]));
    const fromRow = row ? (config.toForm ? config.toForm(row) : row) : config.initial?.(params) ?? {};
    const merged = { ...base };
    config.fields.forEach((f) => {
      if (fromRow[f.key] !== undefined && fromRow[f.key] !== null) merged[f.key] = fromRow[f.key];
    });
    return merged;
  }, [config, row, params]);

  const [form, setForm] = useState(initial);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState(null);

  const errors = Object.fromEntries(
    config.fields.map((f) => {
      const v = form[f.key];
      const empty = v === '' || v === null || v === undefined;
      if (f.required && empty) return [f.key, `${f.label} wajib diisi`];
      return [f.key, !empty && f.validate ? f.validate(v, form) : null];
    })
  );
  const show = (k) => (touched ? errors[k] : null);
  const set = (k, v) => setForm((cur) => ({ ...cur, [k]: v, ...(config.onChange?.(k, v, cur) ?? {}) }));

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    setServerError(null);
    if (Object.values(errors).some(Boolean)) return;
    setSaving(true);
    try {
      const data = config.toPayload(form, row);
      const saved = isEdit
        ? await dispatch(updateResource({ name: config.name, id: row.id, data })).unwrap()
        : await dispatch(createResource({ name: config.name, data })).unwrap();
      dispatch(fetchResource({ name: config.name, force: true }));
      dispatch(showToast(isEdit ? `${config.entity} berhasil diperbarui.` : `${config.entity} berhasil ditambahkan.`));
      onDone(saved);
    } catch (err) {
      setServerError(err?.message ?? 'Gagal menyimpan data');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="a-page">
      <PageTitle title={isEdit ? config.editTitle : config.title} subtitle={config.subtitle} />
      {config.steps && (
        <ol className="a-steps">
          {config.steps.map((s, i) => (
            <li key={s} className={i === 0 ? 'is-done' : ''}>
              {i + 1} {s}
            </li>
          ))}
        </ol>
      )}
      <div>
        <BackButton to={config.backTo} />
      </div>
      <div className="a-grid-form">
        <Card as="form" onSubmit={submit} noValidate className="a-form">
          <h2 className="a-card-title">{config.cardTitle}</h2>
          <p className="a-muted small">Kolom bertanda * wajib diisi.</p>
          {serverError && (
            <div className="a-note a-note-rose" role="alert">
              {serverError}
            </div>
          )}
          <div className="a-form-grid">
            {config.fields
              .filter((f) => !f.hidden?.(form, isEdit))
              .map((f) => {
                const fid = `rf-${f.key}`;
                const options = typeof f.options === 'function' ? f.options(state, form) : f.options;
                return (
                  <div key={f.key} className={f.wide ? 'a-span-2' : ''}>
                    <Field label={f.label} required={f.required} htmlFor={fid} hint={typeof f.hint === 'function' ? f.hint(form) : f.hint} error={show(f.key)}>
                      {f.type === 'select' ? (
                        <SelectInput id={fid} value={String(form[f.key] ?? '')} onChange={(v) => set(f.key, v)} options={options} placeholder={f.placeholder ?? 'Pilih'} invalid={Boolean(show(f.key))} />
                      ) : f.type === 'toggle' ? (
                        <SelectInput
                          id={fid}
                          value={form[f.key] ? 'true' : 'false'}
                          onChange={(v) => set(f.key, v === 'true')}
                          options={[
                            { value: 'true', label: f.onLabel ?? 'Aktif' },
                            { value: 'false', label: f.offLabel ?? 'Nonaktif' },
                          ]}
                        />
                      ) : f.type === 'textarea' ? (
                        <textarea id={fid} rows={3} className="a-input" value={form[f.key] ?? ''} placeholder={f.placeholder} onChange={(e) => set(f.key, e.target.value)} aria-invalid={Boolean(show(f.key)) || undefined} />
                      ) : (
                        <input
                          id={fid}
                          type={f.type ?? 'text'}
                          inputMode={f.inputMode}
                          min={f.min}
                          max={typeof f.max === 'function' ? f.max() : f.max}
                          className="a-input"
                          value={form[f.key] ?? ''}
                          placeholder={f.placeholder}
                          onChange={(e) => set(f.key, e.target.value)}
                          aria-invalid={Boolean(show(f.key)) || undefined}
                        />
                      )}
                    </Field>
                  </div>
                );
              })}
          </div>
          {config.footnote && <div className="a-note">{config.footnote}</div>}
          <div className="a-form-actions">
            <Btn variant="secondary" to={config.backTo}>
              Batal
            </Btn>
            <Btn type="submit" loading={saving}>
              {isEdit ? 'Simpan Perubahan' : config.submitLabel}
            </Btn>
          </div>
        </Card>
        {config.infoTitle && (
          <section className="a-success">
            <p className="a-success-title">{config.infoTitle}</p>
            <p>{config.infoText}</p>
            <p className="a-muted small">Periksa kembali sebelum menyimpan perubahan.</p>
          </section>
        )}
      </div>
    </div>
  );
}

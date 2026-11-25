import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { createResource, fetchResource } from '../store/adminDataSlice';
import { showToast } from '../../features/ui/uiSlice';
import { kuotaTerpakai, pasienInfo, sortJadwal, useAdminResources } from '../model';
import { Btn, Card, ErrorBox, Field, KV, PageTitle, Pill, SelectInput, Skeleton } from '../ui';
import { formatDurasi, formatJam, formatRupiah, formatTanggal, nextDatesForHari } from '../../utils/format';

const NEEDED = ['antrean', 'pasien', 'dokter', 'layanan', 'fasilitas', 'jadwal'];

// Layar "04 · Registrasi Antrean" (loket admin).
// Backend: POST /antrean { pasien_id, fasilitas_id, layanan_id, dokter_id,
// jadwal_dokter_id, tanggal_kunjungan, kategori_pasien } — admin_id diisi dari token.
export default function AdminQueueRegister() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { loading, error, retry } = useAdminResources(NEEDED);
  const { pasien, layanan, dokter, jadwal, fasilitas, antrean } = useSelector(
    (s) => ({
      pasien: s.adminData.pasien.items,
      layanan: s.adminData.layanan.items,
      dokter: s.adminData.dokter.items,
      jadwal: s.adminData.jadwal.items,
      fasilitas: s.adminData.fasilitas.items,
      antrean: s.adminData.antrean.items,
    }),
    (a, b) => Object.keys(a).every((k) => a[k] === b[k])
  );

  const [form, setForm] = useState({ pasien_id: params.get('pasien') ?? '', layanan_id: params.get('layanan') ?? '', jadwal_id: '', tanggal: '' });
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState(null);

  const p = pasien.find((x) => String(x.id) === String(form.pasien_id));
  const info = pasienInfo(p);
  const l = layanan.find((x) => String(x.id) === String(form.layanan_id));
  const f = l ? fasilitas.find((x) => String(x.id) === String(l.fasilitas_id)) : null;
  const slots = useMemo(
    () =>
      jadwal
        .filter((j) => String(j.layanan_id) === String(form.layanan_id) && j.aktif !== false)
        .filter((j) => dokter.find((d) => String(d.id) === String(j.dokter_id))?.aktif !== false)
        .sort(sortJadwal),
    [jadwal, dokter, form.layanan_id]
  );
  const j = slots.find((x) => String(x.id) === String(form.jadwal_id));
  const d = j ? dokter.find((x) => String(x.id) === String(j.dokter_id)) : null;
  const dates = useMemo(() => (j ? nextDatesForHari(j.hari, 4) : []), [j]);
  const terpakai = j && form.tanggal ? kuotaTerpakai(antrean, j.id, form.tanggal) : 0;
  const penuh = j && form.tanggal ? terpakai >= (j.kuota ?? 0) : false;

  const errors = {
    pasien_id: !form.pasien_id ? 'Pilih pasien' : null,
    layanan_id: !form.layanan_id ? 'Pilih poli/layanan' : l && l.aktif === false ? 'Layanan sedang nonaktif' : null,
    jadwal_id: form.layanan_id && !form.jadwal_id ? (slots.length ? 'Pilih jadwal' : 'Layanan ini belum memiliki jadwal aktif') : null,
    tanggal: j && !form.tanggal ? 'Pilih tanggal kunjungan' : penuh ? 'Kuota jadwal pada tanggal ini sudah penuh' : null,
  };
  const show = (k) => (touched ? errors[k] : null);

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    setServerError(null);
    if (Object.values(errors).some(Boolean) || !j) return;
    setSaving(true);
    try {
      const row = await dispatch(
        createResource({
          name: 'antrean',
          data: {
            pasien_id: Number(p.id),
            fasilitas_id: Number(l.fasilitas_id),
            layanan_id: Number(l.id),
            dokter_id: Number(j.dokter_id),
            jadwal_dokter_id: Number(j.id),
            tanggal_kunjungan: form.tanggal,
            kategori_pasien: p.kategori_pasien ?? null,
          },
        })
      ).unwrap();
      dispatch(fetchResource({ name: 'antrean', force: true }));
      dispatch(fetchResource({ name: 'riwayat', force: true }));
      dispatch(showToast(`Nomor ${row?.nomor_antrean ?? ''} berhasil diterbitkan.`));
      navigate(row?.id ? `/admin/antrean/${row.id}/terbit` : '/admin/antrean', { replace: true });
    } catch (err) {
      setServerError(err?.message ?? 'Gagal menerbitkan nomor antrean');
      dispatch(fetchResource({ name: 'antrean', force: true }));
    } finally {
      setSaving(false);
    }
  };

  if (error) return <ErrorBox message={error.message} onRetry={retry} />;

  return (
    <div className="a-page">
      <PageTitle title="Registrasi Antrean" subtitle="Pilih pasien, periksa kuota, lalu terbitkan nomor." />
      <ol className="a-steps" aria-label="Langkah registrasi">
        <li className={form.pasien_id ? 'is-done' : 'is-current'}>1 Pasien</li>
        <li aria-hidden="true">→</li>
        <li className={j && form.tanggal ? 'is-done' : form.pasien_id ? 'is-current' : ''}>2 Jadwal &amp; kuota</li>
        <li aria-hidden="true">→</li>
        <li>3 Nomor</li>
      </ol>

      {loading ? (
        <Skeleton rows={4} />
      ) : (
        <div className="a-grid-form">
          <Card as="form" onSubmit={submit} noValidate className="a-form">
            <h2 className="a-card-title">Data pendaftaran</h2>
            {serverError && (
              <div className="a-note a-note-rose" role="alert">
                {serverError}
              </div>
            )}

            <Field label="Pilih Pasien & Kategori" required htmlFor="r-pasien" error={show('pasien_id')}>
              <SelectInput
                id="r-pasien"
                value={form.pasien_id}
                onChange={(v) => setForm({ ...form, pasien_id: v })}
                placeholder="Pilih pasien"
                invalid={Boolean(show('pasien_id'))}
                options={pasien.map((x) => ({ value: String(x.id), label: `${x.nama_pasien} [${pasienInfo(x).kelompokLabel}]` }))}
              />
            </Field>
            {p && (
              <div className={`a-note a-note-${info.prioritas ? 'rose' : 'teal'}`}>
                <strong>
                  {info.kelompokLabel} · {info.prioritas ? 'Prioritas pendampingan' : 'Tanpa prioritas khusus'} · {p.kategori_pasien}
                </strong>
                <span>{info.kebutuhanText || 'Tidak ada kebutuhan khusus'}</span>
              </div>
            )}
            <Btn variant="soft" to="/admin/pasien/baru?lanjut=antrean" className="a-btn-auto">
              + Pasien baru
            </Btn>

            <Field label="Poli / Layanan" required htmlFor="r-layanan" error={show('layanan_id')}>
              <SelectInput
                id="r-layanan"
                value={form.layanan_id}
                onChange={(v) => setForm({ ...form, layanan_id: v, jadwal_id: '', tanggal: '' })}
                placeholder="Pilih poli/layanan"
                invalid={Boolean(show('layanan_id'))}
                options={layanan.map((x) => ({
                  value: String(x.id),
                  label: `${x.nama_layanan} · ${fasilitas.find((fa) => String(fa.id) === String(x.fasilitas_id))?.nama_fasilitas ?? '-'}${x.aktif === false ? ' (nonaktif)' : ''}`,
                  disabled: x.aktif === false,
                }))}
              />
            </Field>

            <Field
              label="Cek Jadwal & Kuota Tersedia"
              required
              htmlFor="r-jadwal"
              error={show('jadwal_id')}
              hint={j ? `${d?.nama_dokter ?? '-'}${form.tanggal ? ` · Sisa ${Math.max(0, (j.kuota ?? 0) - terpakai)} dari ${j.kuota} kuota` : ''}` : undefined}
            >
              <SelectInput
                id="r-jadwal"
                value={form.jadwal_id}
                onChange={(v) => setForm({ ...form, jadwal_id: v, tanggal: '' })}
                disabled={!form.layanan_id}
                placeholder={form.layanan_id ? 'Pilih jadwal praktik' : 'Pilih layanan terlebih dahulu'}
                invalid={Boolean(show('jadwal_id'))}
                options={slots.map((x) => ({ value: String(x.id), label: `${x.hari} · ${formatJam(x.jam_mulai)}–${formatJam(x.jam_selesai)}` }))}
              />
            </Field>

            <Field label="Tanggal Kunjungan" required htmlFor="r-tanggal" error={show('tanggal')} hint="Backend hanya menerima tanggal setelah hari ini, sesuai hari praktik.">
              <SelectInput
                id="r-tanggal"
                value={form.tanggal}
                onChange={(v) => setForm({ ...form, tanggal: v })}
                disabled={!j}
                placeholder={j ? 'Pilih tanggal' : 'Pilih jadwal terlebih dahulu'}
                invalid={Boolean(show('tanggal'))}
                options={dates.map((x) => {
                  const used = kuotaTerpakai(antrean, j.id, x);
                  return { value: x, label: `${formatTanggal(x)} · Sisa ${Math.max(0, (j.kuota ?? 0) - used)}/${j.kuota}`, disabled: used >= (j.kuota ?? 0) };
                })}
              />
            </Field>

            <Field label="Dokter" required htmlFor="r-dokter" hint="Mengikuti jadwal praktik yang dipilih.">
              <SelectInput id="r-dokter" value={d ? String(d.id) : ''} onChange={() => {}} disabled placeholder="Otomatis dari jadwal" options={d ? [{ value: String(d.id), label: d.nama_dokter }] : []} />
            </Field>

            <Field label="Jalur Pendaftaran" htmlFor="r-jalur" hint="Antrean yang dibuat petugas tercatat sebagai Loket Admin.">
              <SelectInput id="r-jalur" value="loket" onChange={() => {}} disabled options={[{ value: 'loket', label: 'Loket Admin' }]} />
            </Field>

            <div className="a-form-actions">
              <Btn variant="secondary" to="/admin/antrean">
                Batal
              </Btn>
              <Btn type="submit" loading={saving}>
                Terbitkan Nomor
              </Btn>
            </div>
          </Card>

          <Card className="a-summary">
            <h2 className="a-card-title">Ringkasan pendaftaran</h2>
            <KV label="Pasien" strong>
              {p?.nama_pasien ?? '-'}
            </KV>
            <KV label="Layanan" strong>
              {l?.nama_layanan ?? '-'}
            </KV>
            <KV label="Fasilitas">{f?.nama_fasilitas ?? '-'}</KV>
            <KV label="Jadwal" strong>
              {j ? `${j.hari}, ${formatJam(j.jam_mulai)}–${formatJam(j.jam_selesai)}` : '-'}
            </KV>
            <KV label="Tanggal">{form.tanggal ? formatTanggal(form.tanggal) : '-'}</KV>
            <KV label="Kuota terpakai" strong>
              {j && form.tanggal ? `${terpakai} / ${j.kuota}` : '-'}
            </KV>
            {j && form.tanggal && (
              <Pill tone={penuh ? 'rose' : 'teal'} dot>
                {penuh ? 'Kuota penuh' : 'Jadwal tersedia'}
              </Pill>
            )}
            <p className="a-muted small">Estimasi pelayanan</p>
            <p className="a-big">{l ? `${formatDurasi(l.estimasi_durasi || 15)} / pasien` : '-'}</p>
            <KV label="Tarif layanan" strong>
              {l ? formatRupiah(l.biaya) : '-'}
            </KV>
            <p className="a-muted small">Nomor antrean diterbitkan setelah data dan ketersediaan jadwal dikonfirmasi.</p>
          </Card>
        </div>
      )}
    </div>
  );
}

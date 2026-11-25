import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { annotateRiwayat, changeQueueStatus, createResource, fetchResource } from '../store/adminDataSlice';
import { showToast } from '../../features/ui/uiSlice';
import { isStatus, kuotaTerpakai, selectAntreanEnriched, sortJadwal, useAdminResources } from '../model';
import { BackButton, Btn, Card, Empty, ErrorBox, Field, PageTitle, SelectInput, Skeleton } from '../ui';
import { STATUS } from '../../constants/queue';
import { formatJam, formatTanggal, nextDatesForHari } from '../../utils/format';

const NEEDED = ['antrean', 'pasien', 'dokter', 'layanan', 'fasilitas', 'jadwal'];

// Layar "21 · Ubah / Batalkan Antrean".
// Backend hanya bisa mengubah STATUS antrean (PUT /antrean/:id). Ubah jadwal
// dilakukan dengan: daftarkan antrean baru pada jadwal baru -> batalkan
// antrean lama -> catat alasan di riwayat. Nomor baru diterbitkan backend.
export default function QueueAdjust() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const admin = useSelector((s) => s.adminAuth.admin);
  const { loading, error, retry } = useAdminResources(NEEDED);
  const list = useSelector(selectAntreanEnriched);
  const raw = useSelector((s) => s.adminData.antrean.items);
  const jadwal = useSelector((s) => s.adminData.jadwal.items);
  const dokter = useSelector((s) => s.adminData.dokter.items);
  const a = list.find((x) => String(x.id) === String(id));

  const [form, setForm] = useState({ jadwal_id: '', tanggal: '', alasan: 'Penyesuaian jadwal praktik atas konfirmasi pasien' });
  const [alasanBatal, setAlasanBatal] = useState('Jadwal/nomor tidak sesuai & dibatalkan');
  const [busy, setBusy] = useState(null);
  const [errMsg, setErrMsg] = useState(null);

  const slots = useMemo(
    () =>
      a
        ? jadwal
            .filter((j) => String(j.layanan_id) === String(a.layanan_id) && j.aktif !== false)
            .filter((j) => dokter.find((d) => String(d.id) === String(j.dokter_id))?.aktif !== false)
            .sort(sortJadwal)
        : [],
    [a, jadwal, dokter]
  );
  const j = slots.find((x) => String(x.id) === String(form.jadwal_id));
  const dates = j ? nextDatesForHari(j.hari, 4) : [];
  const nameOf = (x) => dokter.find((d) => String(d.id) === String(x.dokter_id))?.nama_dokter ?? 'Dokter';

  if (error) return <ErrorBox message={error.message} onRetry={retry} />;
  if (loading) return <Skeleton rows={3} />;
  if (!a) return <Empty title="Antrean tidak ditemukan" action={<Btn to="/admin/antrean">Ke Antrean Aktif</Btn>} />;

  const locked = isStatus(a, STATUS.SELESAI) || isStatus(a, STATUS.DIBATALKAN);

  const reschedule = async (e) => {
    e.preventDefault();
    setErrMsg(null);
    if (!j || !form.tanggal) return setErrMsg('Pilih jadwal praktik dan tanggal baru.');
    if (j.id === a.jadwal_dokter_id && form.tanggal === a.tanggal_kunjungan) return setErrMsg('Jadwal baru sama dengan jadwal saat ini.');
    setBusy('ubah');
    try {
      const baru = await dispatch(
        createResource({
          name: 'antrean',
          data: {
            pasien_id: a.pasien_id,
            fasilitas_id: a.fasilitas_id,
            layanan_id: a.layanan_id,
            dokter_id: j.dokter_id,
            jadwal_dokter_id: j.id,
            tanggal_kunjungan: form.tanggal,
            kategori_pasien: a.kategori_pasien ?? a.pasien?.kategori_pasien ?? null,
          },
        })
      ).unwrap();
      const alasan = `Dipindah ke ${baru?.nomor_antrean ?? 'antrean baru'} (${j.hari} ${formatTanggal(form.tanggal, { short: true })}). ${form.alasan}`.trim();
      await dispatch(changeQueueStatus({ id: a.id, status: STATUS.DIBATALKAN, keterangan: alasan })).unwrap();
      if (baru?.id) await annotateRiwayat(baru.id, STATUS.MENUNGGU, `Penjadwalan ulang dari ${a.nomor_antrean}. ${form.alasan}`, admin?.id).catch(() => {});
      dispatch(fetchResource({ name: 'antrean', force: true }));
      dispatch(fetchResource({ name: 'riwayat', force: true }));
      dispatch(showToast(`Jadwal diubah. Nomor baru ${baru?.nomor_antrean ?? ''} berstatus Menunggu.`));
      navigate(baru?.id ? `/admin/antrean/${baru.id}/terbit` : '/admin/antrean', { replace: true });
    } catch (err) {
      setErrMsg(err?.message ?? 'Gagal mengubah jadwal');
    } finally {
      setBusy(null);
    }
  };

  const cancel = async () => {
    setErrMsg(null);
    if (!alasanBatal.trim()) return setErrMsg('Isi alasan pembatalan.');
    setBusy('batal');
    try {
      await dispatch(changeQueueStatus({ id: a.id, status: STATUS.DIBATALKAN, keterangan: alasanBatal })).unwrap();
      dispatch(showToast(`${a.nomor_antrean} dibatalkan & tercatat di riwayat.`));
      navigate('/admin/antrean', { replace: true });
    } catch (err) {
      setErrMsg(err?.message ?? 'Gagal membatalkan antrean');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="a-page">
      <PageTitle title="Ubah / Batalkan Antrean" subtitle="Konfirmasi penyesuaian bersama pasien terlebih dahulu." />
      <div>
        <BackButton />
      </div>
      <div className="a-grid-form">
        <Card as="form" onSubmit={reschedule} noValidate className="a-form">
          <h2 className="a-card-title">Data Ubah / Batalkan Antrean</h2>
          <p className="a-muted small">Kolom bertanda * wajib diisi.</p>
          {locked && <div className="a-note a-note-amber">Antrean ini sudah {a.status_antrean.toLowerCase()} sehingga tidak dapat diubah.</div>}
          {errMsg && (
            <div className="a-note a-note-rose" role="alert">
              {errMsg}
            </div>
          )}
          <Field label="Jadwal Praktik Baru" required htmlFor="u-jadwal">
            <SelectInput
              id="u-jadwal"
              value={form.jadwal_id}
              onChange={(v) => setForm({ ...form, jadwal_id: v, tanggal: '' })}
              disabled={locked}
              placeholder="Pilih jadwal praktik"
              options={slots.map((x) => ({ value: String(x.id), label: `${x.hari} · ${formatJam(x.jam_mulai)}–${formatJam(x.jam_selesai)} · ${nameOf(x)}` }))}
            />
          </Field>
          <Field label="Tanggal Kunjungan Baru" required htmlFor="u-tanggal">
            <SelectInput
              id="u-tanggal"
              value={form.tanggal}
              onChange={(v) => setForm({ ...form, tanggal: v })}
              disabled={!j || locked}
              placeholder={j ? 'Pilih tanggal' : 'Pilih jadwal terlebih dahulu'}
              options={dates.map((x) => {
                const used = kuotaTerpakai(raw, j.id, x);
                return { value: x, label: `${formatTanggal(x)} · Sisa ${Math.max(0, j.kuota - used)}/${j.kuota}`, disabled: used >= j.kuota };
              })}
            />
          </Field>
          <Field label="Alasan Penyesuaian" htmlFor="u-alasan">
            <input id="u-alasan" className="a-input" value={form.alasan} disabled={locked} onChange={(e) => setForm({ ...form, alasan: e.target.value })} />
          </Field>
          <div className="a-note">Setelah disimpan, pasien mendapat nomor baru berstatus Menunggu dan antrean lama tercatat dibatalkan di riwayat.</div>
          <Btn type="submit" className="a-btn-block" loading={busy === 'ubah'} disabled={locked || busy === 'batal'}>
            Simpan Perubahan Jadwal
          </Btn>

          <p className="a-rose-title">Atau batalkan &amp; pindahkan ke riwayat</p>
          <Field label="Alasan Pembatalan" htmlFor="u-batal">
            <input id="u-batal" className="a-input" value={alasanBatal} disabled={locked} onChange={(e) => setAlasanBatal(e.target.value)} />
          </Field>
          <Btn variant="danger-soft" className="a-btn-block" loading={busy === 'batal'} disabled={locked || busy === 'ubah'} onClick={cancel}>
            Batalkan Antrean &amp; Catat di Riwayat
          </Btn>
        </Card>

        <section className="a-success">
          <p className="a-success-title">
            {a.nomor_antrean} · {a.pasien?.nama_pasien ?? `Pasien #${a.pasien_id}`}
          </p>
          <p>
            {a.layanan?.nama_layanan} · {a.dokter?.nama_dokter}. Jadwal saat ini {a.jadwal ? `${a.jadwal.hari} ${formatJam(a.jadwal.jam_mulai)}` : '-'}, {formatTanggal(a.tanggal_kunjungan)}.
          </p>
          <p className="a-muted small">Periksa kembali sebelum menyimpan perubahan.</p>
        </section>
      </div>
    </div>
  );
}

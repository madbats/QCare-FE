import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCatalog, selectLayananEnriched, selectMaps } from '../features/catalog/catalogSlice';
import { createQueue, resetCreate } from '../features/queue/queueSlice';
import { fetchProfile, updateProfile } from '../features/auth/authSlice';
import { showToast } from '../features/ui/uiSlice';
import { useCatalog } from '../hooks/useCatalog';
import PatientCategoryFields, { validateCategory } from '../components/PatientCategoryFields';
import { InfoCard } from '../components/cards';
import { Alert, ErrorState, InfoRow, Modal, PageHeader, Select, SkeletonList, Spinner } from '../components/ui';
import Icon from '../components/Icon';
import { buildKebutuhan, needsLabel, parseKebutuhan } from '../constants/patient';
import { formatDurasi, formatJam, formatRupiah, formatTanggal, nextDatesForHari } from '../utils/format';

// Layar "04 • Ambil Antrean" + user flow "Online Registration":
// pilih fasilitas & layanan -> (layanan tersedia?) -> isi data & kategori ->
// (data valid?) -> ringkasan -> konfirmasi -> nomor & status antrean.

// Pesan error backend -> field yang perlu diperbaiki.
const fieldForError = (message = '') => {
  const m = message.toLowerCase();
  if (/kuota|tanggal|hari/.test(m)) return 'tanggal';
  if (/jadwal|dokter/.test(m)) return 'jadwal';
  if (/layanan/.test(m)) return 'layanan';
  if (/fasilitas/.test(m)) return 'fasilitas';
  if (/kategori|pasien/.test(m)) return 'kategori';
  return null;
};

export default function QueueRegister() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { loading, error, retry } = useCatalog();
  const maps = useSelector(selectMaps);
  const layananAll = useSelector(selectLayananEnriched);
  const fasilitasAll = useSelector((state) => state.catalog.fasilitas);
  const { profile, profileStatus, updateStatus } = useSelector((state) => state.auth);
  const { createStatus, createError } = useSelector((state) => state.queue);
  const formRef = useRef(null);

  const [fasilitasPick, setFasilitasPick] = useState(params.get('fasilitas') ?? '');
  const [layananId, setLayananId] = useState(params.get('layanan') ?? '');
  const [jadwalId, setJadwalId] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [categoryPick, setCategoryPick] = useState(null);
  const [saveToProfile, setSaveToProfile] = useState(true);
  const [touched, setTouched] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);

  useEffect(() => {
    if (profileStatus === 'idle') dispatch(fetchProfile());
  }, [dispatch, profileStatus]);

  useEffect(() => () => dispatch(resetCreate()), [dispatch]);

  // ----- nilai turunan -----
  const fasilitasId = fasilitasPick || (layananId ? String(maps.layanan[layananId]?.fasilitas_id ?? '') : '');
  const fasilitas = maps.fasilitas[fasilitasId];
  const layananList = useMemo(() => layananAll.filter((l) => String(l.fasilitas_id) === String(fasilitasId)), [layananAll, fasilitasId]);
  const layanan = layananList.find((l) => String(l.id) === String(layananId)) ?? null;
  const jadwal = layanan?.slots.find((j) => String(j.id) === String(jadwalId)) ?? null;
  const dokter = jadwal ? maps.dokter[String(jadwal.dokter_id)] : null;
  const dates = useMemo(() => (jadwal ? nextDatesForHari(jadwal.hari, 4) : []), [jadwal]);

  // Kategori: default dari profil sampai pasien mengubahnya.
  const profileCategory = useMemo(() => {
    const parsed = parseKebutuhan(profile?.kebutuhan_khusus);
    return {
      kategori: profile?.kategori_pasien ?? '',
      kelompok: parsed.kelompok,
      needHelp: parsed.needs.length > 0 || Boolean(parsed.otherNeed),
      needs: parsed.needs,
      otherNeed: parsed.otherNeed,
    };
  }, [profile]);
  const category = categoryPick ?? profileCategory;

  // Cabang "Apakah layanan tersedia?" -> tidak: tampilkan alternatif.
  const alternatives = useMemo(() => {
    if (!layanan || layanan.available) return [];
    const keyword = layanan.nama_layanan.toLowerCase().split(' ').pop();
    const similar = layananAll.filter((l) => l.available && l.id !== layanan.id && l.nama_layanan.toLowerCase().includes(keyword));
    const sameFacility = layananList.filter((l) => l.available);
    return [...new Map([...similar, ...sameFacility].map((l) => [l.id, l])).values()].slice(0, 4);
  }, [layanan, layananAll, layananList]);

  const categoryErrors = validateCategory(category);
  const errors = {
    fasilitas: !fasilitasId ? 'Pilih fasilitas kesehatan' : null,
    layanan: !layanan ? 'Pilih poli/layanan' : !layanan.available ? 'Layanan ini sedang tidak tersedia, pilih layanan lain' : null,
    jadwal: layanan?.available && !jadwal ? 'Pilih dokter & jadwal praktik' : null,
    tanggal: jadwal && !tanggal ? 'Pilih tanggal kunjungan' : null,
    ...categoryErrors,
  };
  const hasErrors = Object.values(errors).some(Boolean);
  const show = (key) => (touched ? errors[key] : null);

  const pickFasilitas = (id) => {
    setFasilitasPick(id);
    setLayananId('');
    setJadwalId('');
    setTanggal('');
  };
  const pickLayanan = (id) => {
    setLayananId(id);
    setJadwalId('');
    setTanggal('');
  };
  const pickJadwal = (id) => {
    setJadwalId(id);
    setTanggal('');
  };

  // Cabang "Apakah data pendaftaran valid?" -> tidak: tandai bagian yang salah.
  const handleReview = (e) => {
    e.preventDefault();
    setTouched(true);
    dispatch(resetCreate());
    if (hasErrors) {
      requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"], .field-error')?.scrollIntoView?.({ block: 'center', behavior: 'smooth' }));
      return;
    }
    setSummaryOpen(true);
  };

  const handleConfirm = async () => {
    try {
      const kebutuhan = buildKebutuhan(category);
      const changed = profile && (profile.kategori_pasien !== category.kategori || (profile.kebutuhan_khusus ?? null) !== kebutuhan);
      if (saveToProfile && changed) {
        await dispatch(updateProfile({ kategori_pasien: category.kategori, kebutuhan_khusus: kebutuhan })).unwrap();
      }
      const row = await dispatch(
        createQueue({
          fasilitas_id: Number(fasilitasId),
          layanan_id: Number(layanan.id),
          dokter_id: Number(jadwal.dokter_id),
          jadwal_dokter_id: Number(jadwal.id),
          tanggal_kunjungan: tanggal,
          kategori_pasien: category.kategori,
        })
      ).unwrap();
      setSummaryOpen(false);
      dispatch(showToast(`Nomor antrean ${row?.nomor_antrean ?? ''} berhasil dibuat.`));
      navigate(row?.id ? `/antrean/${row.id}?baru=1` : '/riwayat', { replace: true });
    } catch {
      // Kuota/jadwal bisa berubah: muat ulang data terbaru.
      dispatch(fetchCatalog(true));
    }
  };

  if (error) return <div className="container page"><ErrorState message={error.message} onRetry={retry} /></div>;

  const errorField = fieldForError(createError?.message);

  return (
    <div className="container page page-form">
      <PageHeader title="Ambil Antrean" subtitle="Lengkapi data kunjungan terlebih dahulu" back />

      {loading ? (
        <SkeletonList rows={5} />
      ) : (
        <form ref={formRef} onSubmit={handleReview} className="queue-form" noValidate>
          <div className="queue-form-grid">
            <div className="stack">
              <FormRow id="f-fasilitas" label="Fasilitas Kesehatan" error={show('fasilitas')}>
                <Select
                  id="f-fasilitas"
                  variant="card"
                  value={fasilitasId}
                  onChange={pickFasilitas}
                  placeholder="Pilih fasilitas kesehatan"
                  invalid={Boolean(show('fasilitas'))}
                  options={fasilitasAll.map((f) => ({ value: String(f.id), label: f.nama_fasilitas }))}
                />
              </FormRow>

              <FormRow id="f-layanan" label="Pilih Poli" error={show('layanan')}>
                <Select
                  id="f-layanan"
                  variant="card"
                  value={layanan ? String(layanan.id) : ''}
                  onChange={pickLayanan}
                  disabled={!fasilitasId}
                  placeholder={fasilitasId ? 'Pilih poli/layanan' : 'Pilih fasilitas terlebih dahulu'}
                  invalid={Boolean(show('layanan'))}
                  options={layananList.map((l) => ({
                    value: String(l.id),
                    label: l.available ? `${l.nama_layanan} · ${formatRupiah(l.biaya)}` : `${l.nama_layanan} — tidak tersedia`,
                  }))}
                />
              </FormRow>

              {layanan && !layanan.available && (
                <Alert tone="warning" title={`${layanan.nama_layanan} sedang tidak tersedia`}>
                  <p>{layanan.unavailableReason}. Pilih layanan lain berikut:</p>
                  {alternatives.length > 0 ? (
                    <div className="chip-row">
                      {alternatives.map((alt) => (
                        <button
                          key={alt.id}
                          type="button"
                          className="chip-btn"
                          onClick={() => {
                            setFasilitasPick(String(alt.fasilitas_id));
                            pickLayanan(String(alt.id));
                          }}
                        >
                          {alt.nama_layanan} · {alt.fasilitas?.nama_fasilitas}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <Link to="/layanan" className="link">
                      Cari fasilitas lain
                    </Link>
                  )}
                </Alert>
              )}

              {layanan?.available && (
                <FormRow
                  id="f-jadwal"
                  label="Dokter & Jadwal Praktik"
                  error={show('jadwal') || (errorField === 'jadwal' ? createError.message : null)}
                  hint={`Estimasi layanan ±${formatDurasi(layanan.estimasi_durasi || 15)} per pasien`}
                >
                  <Select
                    id="f-jadwal"
                    variant="card"
                    value={jadwalId}
                    onChange={pickJadwal}
                    placeholder="Pilih dokter & jadwal"
                    invalid={Boolean(show('jadwal'))}
                    options={layanan.slots.map((j) => ({
                      value: String(j.id),
                      label: `${j.hari}, ${formatJam(j.jam_mulai)}–${formatJam(j.jam_selesai)} · ${maps.dokter[String(j.dokter_id)]?.nama_dokter ?? 'Dokter'}`,
                    }))}
                  />
                </FormRow>
              )}

              <FormRow
                id="f-tanggal"
                label="Tanggal Kunjungan"
                error={show('tanggal') || (errorField === 'tanggal' ? createError.message : null)}
                hint={jadwal ? `Pendaftaran online mulai besok, hanya hari ${jadwal.hari}` : undefined}
              >
                <Select
                  id="f-tanggal"
                  variant="card"
                  value={tanggal}
                  onChange={setTanggal}
                  disabled={!jadwal}
                  placeholder={jadwal ? 'Pilih tanggal kunjungan' : 'Pilih jadwal terlebih dahulu'}
                  invalid={Boolean(show('tanggal'))}
                  options={dates.map((d) => ({ value: d, label: formatTanggal(d) }))}
                />
              </FormRow>

              <FormRow id="f-nama" label="Nama Pasien" hint="Sesuai akun yang sedang masuk. Ubah di menu Profil.">
                <input id="f-nama" className="input-card" value={profile?.nama_pasien ?? ''} placeholder="Masukkan nama lengkap" readOnly />
              </FormRow>
            </div>

            <div className="stack">
              <PatientCategoryFields
                value={category}
                onChange={setCategoryPick}
                variant="card"
                errors={{ kategori: show('kategori'), needs: show('needs') }}
              />
              <label className="check-row">
                <input type="checkbox" checked={saveToProfile} onChange={(e) => setSaveToProfile(e.target.checked)} />
                <span>Simpan kategori & kebutuhan ke profil saya</span>
              </label>

              <InfoCard title="Informasi Pendaftaran">
                <p>Pastikan data yang dimasukkan sesuai.</p>
                <p>Nomor diterbitkan setelah konfirmasi.</p>
              </InfoCard>

              {touched && hasErrors && (
                <Alert tone="danger">Masih ada data yang perlu diperbaiki. Periksa bagian yang ditandai merah.</Alert>
              )}

              <button type="submit" className="btn-primary-action">
                Konfirmasi &amp; Ambil Antrean
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Ringkasan pendaftaran sebelum konfirmasi */}
      <Modal
        open={summaryOpen}
        onClose={createStatus === 'loading' ? undefined : () => setSummaryOpen(false)}
        title="Ringkasan Pendaftaran"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setSummaryOpen(false)} disabled={createStatus === 'loading'}>
              Ubah data
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleConfirm}
              disabled={createStatus === 'loading' || updateStatus === 'loading'}
            >
              {createStatus === 'loading' ? <Spinner label="Mengirim" /> : <Icon name="check" size={18} />}
              {createStatus === 'loading' ? 'Memproses...' : 'Ya, ambil nomor'}
            </button>
          </>
        }
      >
        {createError?.message && (
          <Alert tone="danger" title="Pendaftaran belum berhasil">
            {createError.message}
          </Alert>
        )}
        {layanan && jadwal && (
          <div className="summary">
            <InfoRow icon="building" label="Fasilitas" value={fasilitas?.nama_fasilitas} />
            <InfoRow icon="stethoscope" label="Poli" value={layanan.nama_layanan} />
            <InfoRow icon="user" label="Dokter" value={dokter?.nama_dokter} />
            <InfoRow icon="calendar" label="Tanggal" value={formatTanggal(tanggal)} />
            <InfoRow icon="clock" label="Jam praktik" value={`${formatJam(jadwal.jam_mulai)}–${formatJam(jadwal.jam_selesai)} WIB`} />
            <InfoRow icon="wallet" label="Biaya" value={formatRupiah(layanan.biaya)} />
            <InfoRow icon="user" label="Nama pasien" value={profile?.nama_pasien} />
            <InfoRow icon="card" label="Kategori" value={category.kategori} />
            <InfoRow icon="users" label="Kelompok" value={category.kelompok} />
            <InfoRow icon="access" label="Bantuan khusus" value={needsLabel(category)} />
          </div>
        )}
        <p className="small muted">
          Datanglah 30 menit sebelum jam praktik.{category.kategori === 'BPJS' && ' Bawa kartu BPJS/KTP.'}
          {category.kategori === 'Asuransi' && ' Bawa kartu asuransi.'}
        </p>
      </Modal>
    </div>
  );
}

function FormRow({ id, label, hint, error, children }) {
  return (
    <div className={`field ${error ? 'field-invalid' : ''}`}>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
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

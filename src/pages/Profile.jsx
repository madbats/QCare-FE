import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProfile, logout, updateProfile } from '../features/auth/authSlice';
import { openGuide, showToast } from '../features/ui/uiSlice';
import PatientCategoryFields, { validateCategory } from '../components/PatientCategoryFields';
import AccessibilitySettings from '../components/AccessibilitySettings';
import { MenuCard } from '../components/cards';
import { Alert, ErrorState, InfoRow, LoadingBlock, Modal, PageHeader, Select, Spinner } from '../components/ui';
import Icon from '../components/Icon';
import { JENIS_KELAMIN, PHONE_REGEX, buildKebutuhan, needsLabel, parseKebutuhan } from '../constants/patient';
import { formatTanggal, initials, todayJakarta } from '../utils/format';

// Layar "07 • Profil" + modal "Edit Profil"
export default function Profile() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { profile, profileStatus, profileError, user } = useSelector((state) => state.auth);
  const modal = params.get('modal'); // edit | notifikasi | pengaturan | bantuan

  useEffect(() => {
    if (profileStatus === 'idle') dispatch(fetchProfile());
  }, [dispatch, profileStatus]);

  const openModal = (name) => setParams({ modal: name }, { replace: false });
  const closeModal = () => setParams({}, { replace: true });

  const handleLogout = () => {
    dispatch(logout());
    dispatch(showToast('Kamu sudah keluar dari akun.'));
    navigate('/masuk', { replace: true });
  };

  if (profileStatus === 'failed' && !profile) {
    return (
      <div className="container page page-narrow">
        <ErrorState message={profileError?.message} onRetry={() => dispatch(fetchProfile())} />
      </div>
    );
  }
  if (!profile) return <LoadingBlock label="Memuat profil..." />;

  const kebutuhan = parseKebutuhan(profile.kebutuhan_khusus);

  return (
    <div className="container page page-narrow">
      <PageHeader title="Profil Saya" subtitle="Kelola akun dan informasi pribadimu" />

      <section className="profile-card">
        <span className="avatar avatar-xl">{initials(profile.nama_pasien)}</span>
        <div className="profile-info">
          <p className="profile-name">{profile.nama_pasien}</p>
          <p className="profile-email">{profile.email ?? user?.email}</p>
          <span className="chip chip-secondary">Akun Pasien</span>
        </div>
      </section>

      <section className="profile-details">
        <InfoRow icon="card" label="Kategori" value={profile.kategori_pasien} />
        <InfoRow icon="users" label="Kelompok" value={kebutuhan.kelompok} />
        <InfoRow icon="access" label="Bantuan khusus" value={needsLabel({ needHelp: true, ...kebutuhan })} />
        <InfoRow icon="phone" label="No. HP" value={profile.no_telepon} />
      </section>

      <h2 className="section-title">Pengaturan Akun</h2>
      <div className="stack-sm">
        <MenuCard icon="edit" label="Edit Profil" onClick={() => openModal('edit')} />
        <MenuCard icon="bell" label="Notifikasi" onClick={() => openModal('notifikasi')} />
        <MenuCard icon="history" label="Riwayat Antrean" to="/riwayat" />
        <MenuCard icon="help" label="Bantuan & Dukungan" onClick={() => openModal('bantuan')} />
        <MenuCard icon="settings" label="Pengaturan" onClick={() => openModal('pengaturan')} />
      </div>

      <button type="button" className="btn-logout" onClick={handleLogout}>
        Keluar Akun
      </button>

      {modal === 'edit' && <EditProfileModal key={profile.id} profile={profile} onClose={closeModal} />}

      <Modal open={modal === 'notifikasi'} onClose={closeModal} title="Notifikasi" size="sm">
        <NotificationSettings />
      </Modal>

      <Modal open={modal === 'pengaturan'} onClose={closeModal} title="Pengaturan" size="sm">
        <AccessibilitySettings />
      </Modal>

      <Modal open={modal === 'bantuan'} onClose={closeModal} title="Bantuan & Dukungan" size="sm">
        <div className="stack">
          <button
            type="button"
            className="menu-card"
            onClick={() => {
              closeModal();
              dispatch(openGuide());
            }}
          >
            <span className="menu-icon">
              <Icon name="help" size={22} />
            </span>
            <span className="menu-label">Panduan penggunaan QCare</span>
            <span className="menu-chevron">›</span>
          </button>
          <div className="faq">
            <p className="label-strong">Pertanyaan umum</p>
            <details>
              <summary>Kapan saya harus datang?</summary>
              <p>Datanglah 30 menit sebelum jam praktik dan pantau status antrean dari menu Riwayat.</p>
            </details>
            <details>
              <summary>Bagaimana cara membatalkan antrean?</summary>
              <p>Buka tiket antrean, lalu pilih "Batalkan antrean". Pembatalan hanya bisa saat status masih menunggu.</p>
            </details>
            <details>
              <summary>Saya butuh bantuan khusus saat datang.</summary>
              <p>Pilih "Ya, perlu bantuan" saat mengambil antrean atau di Edit Profil, petugas akan menyiapkan pendampingan.</p>
            </details>
          </div>
          <p className="small muted">Masih butuh bantuan? Hubungi petugas di fasilitas kesehatan tujuanmu (nomor tersedia di Detail Fasilitas).</p>
        </div>
      </Modal>
    </div>
  );
}

function NotificationSettings() {
  const dispatch = useDispatch();
  const supported = typeof window !== 'undefined' && 'Notification' in window;
  const [permission, setPermission] = useState(supported ? Notification.permission : 'unsupported');

  const request = async () => {
    const result = await Notification.requestPermission();
    setPermission(result);
    dispatch(showToast(result === 'granted' ? 'Notifikasi antrean diaktifkan.' : 'Izin notifikasi ditolak browser.', result === 'granted' ? 'success' : 'danger'));
  };

  return (
    <div className="stack">
      <p>Dapatkan pemberitahuan ketika giliranmu sudah dekat atau status antrean berubah.</p>
      {permission === 'granted' && <Alert tone="success">Notifikasi sudah aktif di perangkat ini.</Alert>}
      {permission === 'denied' && <Alert tone="warning">Notifikasi diblokir. Izinkan lewat pengaturan situs di browser.</Alert>}
      {permission === 'unsupported' && <Alert tone="info">Browser ini belum mendukung notifikasi. Pantau status dari halaman tiket.</Alert>}
      {permission === 'default' && (
        <button type="button" className="btn btn-primary btn-block" onClick={request}>
          <Icon name="bell" size={18} /> Aktifkan notifikasi
        </button>
      )}
    </div>
  );
}

function EditProfileModal({ profile, onClose }) {
  const dispatch = useDispatch();
  const { updateStatus, updateError } = useSelector((state) => state.auth);
  const parsed = parseKebutuhan(profile.kebutuhan_khusus);
  const [form, setForm] = useState({
    nama_pasien: profile.nama_pasien ?? '',
    no_telepon: profile.no_telepon ?? '',
    tanggal_lahir: profile.tanggal_lahir ? String(profile.tanggal_lahir).slice(0, 10) : '',
    jenis_kelamin: profile.jenis_kelamin ?? '',
    alamat: profile.alamat ?? '',
  });
  const [category, setCategory] = useState({
    kategori: ['Umum', 'BPJS', 'Asuransi'].includes(profile.kategori_pasien) ? profile.kategori_pasien : '',
    kelompok: parsed.kelompok,
    needHelp: parsed.needs.length > 0 || Boolean(parsed.otherNeed),
    needs: parsed.needs,
    otherNeed: parsed.otherNeed,
  });
  const [touched, setTouched] = useState(false);

  // Validasi mengikuti pasienController.updatePasien
  const errors = {
    nama_pasien: !form.nama_pasien.trim() ? 'Nama pasien tidak boleh kosong' : null,
    no_telepon: form.no_telepon && !PHONE_REGEX.test(form.no_telepon.trim()) ? 'Format nomor telepon tidak valid (8–20 angka)' : null,
    tanggal_lahir: form.tanggal_lahir && form.tanggal_lahir > todayJakarta() ? 'Tanggal lahir tidak valid' : null,
    ...validateCategory(category),
  };
  const show = (k) => (touched ? errors[k] : null);
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;
    const payload = {
      nama_pasien: form.nama_pasien.trim(),
      no_telepon: form.no_telepon.trim() || null,
      tanggal_lahir: form.tanggal_lahir || null,
      alamat: form.alamat.trim() || null,
      kategori_pasien: category.kategori,
      kebutuhan_khusus: buildKebutuhan(category),
    };
    // Backend menolak jenis_kelamin kosong/null, jadi hanya dikirim bila dipilih.
    if (form.jenis_kelamin) payload.jenis_kelamin = form.jenis_kelamin;
    try {
      await dispatch(updateProfile(payload)).unwrap();
      dispatch(showToast('Profil berhasil diperbarui.'));
      onClose();
    } catch {
      /* tampil dari updateError */
    }
  };

  return (
    <Modal open onClose={onClose} title="Edit Profile" size="sm">
      <form className="edit-profile" onSubmit={handleSubmit} noValidate>
        <span className="avatar avatar-lg edit-avatar">{initials(form.nama_pasien || profile.nama_pasien)}</span>
        {updateError?.message && <Alert tone="danger">{updateError.message}</Alert>}

        <EditField id="ep-nama" label="Nama Lengkap" error={show('nama_pasien')}>
          <input id="ep-nama" name="nama_pasien" className="input input-center" value={form.nama_pasien} onChange={handleChange} />
        </EditField>
        <EditField id="ep-email" label="Email" hint="Email tidak dapat diubah">
          <input id="ep-email" className="input input-center" value={profile.email ?? ''} disabled />
        </EditField>
        <EditField id="ep-hp" label="No. HP" error={show('no_telepon')}>
          <input id="ep-hp" name="no_telepon" type="tel" inputMode="tel" className="input input-center" placeholder="081234567890" value={form.no_telepon} onChange={handleChange} />
        </EditField>
        <EditField id="ep-lahir" label="Tanggal Lahir" error={show('tanggal_lahir')} hint={form.tanggal_lahir ? formatTanggal(form.tanggal_lahir, { short: true }) : undefined}>
          <input id="ep-lahir" name="tanggal_lahir" type="date" className="input input-center" max={todayJakarta()} value={form.tanggal_lahir} onChange={handleChange} />
        </EditField>
        <EditField id="ep-jk" label="Jenis Kelamin">
          <Select
            id="ep-jk"
            value={form.jenis_kelamin}
            onChange={(v) => setForm({ ...form, jenis_kelamin: v })}
            placeholder="Choose an option"
            options={JENIS_KELAMIN.map((j) => ({ value: j, label: j }))}
          />
        </EditField>
        <EditField id="ep-alamat" label="Alamat">
          <input id="ep-alamat" name="alamat" className="input input-center" placeholder="Jl. XX Surabaya" value={form.alamat} onChange={handleChange} />
        </EditField>

        <PatientCategoryFields value={category} onChange={setCategory} errors={{ kategori: show('kategori'), needs: show('needs') }} />

        <button type="submit" className="btn btn-primary btn-block" disabled={updateStatus === 'loading'}>
          {updateStatus === 'loading' && <Spinner />} Simpan Perubahan
        </button>
      </form>
    </Modal>
  );
}

function EditField({ id, label, hint, error, children }) {
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

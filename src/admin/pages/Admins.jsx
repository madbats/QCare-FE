import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { tanggalPendek, useAdminResources } from '../model';
import { adminApi } from '../api';
import { createResource, deleteResource, fetchResource, updateResource } from '../store/adminDataSlice';
import { adminProfileUpdated } from '../store/adminAuthSlice';
import { useAdminAction } from '../useAdminAction';
import { showToast } from '../../features/ui/uiSlice';
import { Avatar, BackButton, Btn, Card, ConfirmDialog, Empty, ErrorBox, Field, PageTitle, Pill, Skeleton, Toolbar } from '../ui';
import PasswordInput from '../../components/PasswordInput';
import { initials } from '../../utils/format';

const EMAIL = /^\S+@\S+\.\S+$/;
const MIN_PASSWORD = 6; // sesuai desain ("Minimal 6 karakter")

// Waktu kedaluwarsa token: JWT asli (detik) atau token simulasi (milidetik)
const tokenExpiry = (token) => {
  try {
    const part = String(token).split('.')[1];
    const json = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
    if (!json.exp) return null;
    return new Date(json.exp < 1e12 ? json.exp * 1000 : json.exp);
  } catch {
    return null;
  }
};
const waktu = (d) =>
  d ? `${new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).format(new Date(d))} WIB` : '-';

// Layar "14 · Kelola Admin & Akun"
export default function Admins() {
  const dispatch = useDispatch();
  const { loading, error, retry } = useAdminResources(['admin']);
  const admins = useSelector((s) => s.adminData.admin.items);
  const me = useSelector((s) => s.adminAuth);
  const { busy, run } = useAdminAction();
  const [editing, setEditing] = useState(null); // null = tambah baru
  const [removing, setRemoving] = useState(null);
  const [checking, setChecking] = useState(false);
  const expiry = tokenExpiry(me.token);

  const refresh = async () => {
    setChecking(true);
    try {
      const res = await adminApi.get(`/admin/${me.admin.id}`);
      dispatch(adminProfileUpdated(res.data.data));
      dispatch(fetchResource({ name: 'admin', force: true }));
      dispatch(showToast('Sesi masih valid & data akun diperbarui.'));
    } catch (e) {
      // 401 ditangani interceptor (keluar otomatis)
      dispatch(showToast(e?.response?.data?.message ?? 'Gagal memeriksa sesi', 'danger'));
    } finally {
      setChecking(false);
    }
  };

  const remove = async () => {
    if (await run(removing.id, deleteResource({ name: 'admin', id: removing.id }), 'Akun admin dihapus.')) setRemoving(null);
  };

  if (error) return <ErrorBox message={error.message} onRetry={retry} />;

  return (
    <div className="a-page">
      <PageTitle title="Kelola Admin & Akun" subtitle="Kelola akun admin dan keamanan akses." />
      <Toolbar summary={`${admins.length} Akun Admin`}>
        <Btn className="a-btn-auto" onClick={() => (setEditing(null), document.getElementById('adm-nama')?.focus())}>
          + Admin
        </Btn>
      </Toolbar>

      <section className="a-session">
        <div className="a-card-head">
          <strong>Sesi JWT Aktif</strong>
          <Pill tone="teal">● Terhubung</Pill>
        </div>
        <p>
          Admin aktif: <strong>{me.admin?.nama_admin}</strong> · {me.admin?.role === 'admin' ? 'Admin' : me.admin?.role}
        </p>
        <div className="a-card-head">
          <span className="a-muted small">
            Login: {waktu(me.loginAt)}
            {expiry ? ` · Berlaku s.d. ${waktu(expiry)}` : ''}
          </span>
          <Btn variant="secondary" className="a-btn-sm" loading={checking} onClick={refresh}>
            Refresh
          </Btn>
        </div>
      </section>

      <div className="a-grid-2">
        <Card>
          <h2 className="a-card-title">Daftar akun</h2>
          {loading ? (
            <Skeleton rows={3} />
          ) : admins.length === 0 ? (
            <Empty title="Belum ada akun admin" />
          ) : (
            <div className="a-list">
              {admins.map((a) => {
                const self = String(a.id) === String(me.admin?.id);
                return (
                  <div key={a.id} className="a-account">
                    <div className="a-person">
                      <Avatar text={initials(a.nama_admin)} />
                      <span>
                        <strong>
                          {a.nama_admin}
                          {self && <span className="a-muted xs"> (Anda)</span>}
                        </strong>
                        <span className="a-muted small">{a.email}</span>
                      </span>
                    </div>
                    <div className="a-card-head">
                      <Pill tone={self ? 'teal' : 'sky'}>{a.role === 'admin' ? 'Admin' : a.role}</Pill>
                      <span className="a-muted xs">Dibuat {tanggalPendek(a.created_at)}</span>
                    </div>
                    <div className="a-actions">
                      <Btn variant="soft" className="a-btn-sm" onClick={() => setEditing(a)}>
                        Edit
                      </Btn>
                      <Btn variant="secondary" className="a-btn-sm" to={`/admin/akun/${a.id}/password`}>
                        Reset Password
                      </Btn>
                      {!self && (
                        <Btn variant="danger-soft" className="a-btn-sm" onClick={() => setRemoving(a)}>
                          Hapus
                        </Btn>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <AdminForm key={editing?.id ?? 'baru'} row={editing} onDone={() => setEditing(null)} selfId={me.admin?.id} />
      </div>

      <ConfirmDialog
        open={Boolean(removing)}
        title="Hapus akun admin?"
        message={removing ? `${removing.nama_admin} (${removing.email}) tidak akan bisa masuk lagi.` : ''}
        confirmLabel="Hapus"
        loading={busy === removing?.id}
        onClose={() => setRemoving(null)}
        onConfirm={remove}
      />
    </div>
  );
}

function AdminForm({ row, onDone, selfId }) {
  const dispatch = useDispatch();
  const { busy, run } = useAdminAction();
  const [form, setForm] = useState({ nama_admin: row?.nama_admin ?? '', email: row?.email ?? '', password: '' });
  const [touched, setTouched] = useState(false);
  const isEdit = Boolean(row);

  const errors = {
    nama_admin: form.nama_admin.trim() ? null : 'Nama admin wajib diisi',
    email: !form.email.trim() ? 'Email wajib diisi' : EMAIL.test(form.email.trim()) ? null : 'Format email tidak valid',
    password: isEdit && !form.password ? null : form.password.length >= MIN_PASSWORD ? null : `Password minimal ${MIN_PASSWORD} karakter`,
  };
  const show = (k) => (touched ? errors[k] : null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;
    const data = { nama_admin: form.nama_admin.trim(), email: form.email.trim(), role: 'admin', ...(form.password ? { password: form.password } : {}) };
    const ok = await run(
      'simpan',
      isEdit ? updateResource({ name: 'admin', id: row.id, data }) : createResource({ name: 'admin', data }),
      isEdit ? 'Akun admin diperbarui.' : 'Akun admin baru dibuat.'
    );
    if (!ok) return;
    dispatch(fetchResource({ name: 'admin', force: true }));
    if (isEdit && String(row.id) === String(selfId)) dispatch(adminProfileUpdated({ nama_admin: data.nama_admin, email: data.email }));
    setForm({ nama_admin: '', email: '', password: '' });
    setTouched(false);
    onDone();
  };

  return (
    <Card as="form" onSubmit={submit} noValidate className="a-form">
      <h2 className="a-card-title">{isEdit ? `Ubah Akun ${row.nama_admin}` : 'Tambah Admin Baru'}</h2>
      <p className="a-muted small">{isEdit ? 'Kosongkan password bila tidak ingin mengubahnya.' : 'Buat akses untuk petugas klinik.'}</p>
      <Field label="Nama Admin" required htmlFor="adm-nama" error={show('nama_admin')}>
        <input id="adm-nama" className="a-input" value={form.nama_admin} onChange={set('nama_admin')} placeholder="Bayu Prakoso" />
      </Field>
      <Field label="Email" required htmlFor="adm-email" error={show('email')} hint="Dipakai untuk masuk ke portal admin.">
        <input id="adm-email" type="email" className="a-input" value={form.email} onChange={set('email')} placeholder="bayu@qcare.id" autoComplete="off" />
      </Field>
      <Field label="Role" htmlFor="adm-role" hint="Backend hanya mengizinkan role “admin” untuk seluruh endpoint pengelolaan.">
        <input id="adm-role" className="a-input" value="Admin (akses penuh)" disabled />
      </Field>
      <Field label="Password" required={!isEdit} htmlFor="adm-pass" error={show('password')}>
        <PasswordInput id="adm-pass" value={form.password} onChange={set('password')} placeholder={`Minimal ${MIN_PASSWORD} karakter`} autoComplete="new-password" className="a-input" />
      </Field>
      <div className="a-form-actions">
        {isEdit && (
          <Btn variant="secondary" onClick={onDone}>
            Batal
          </Btn>
        )}
        <Btn type="submit" loading={busy === 'simpan'}>
          {isEdit ? 'Simpan Perubahan' : 'Simpan Akun'}
        </Btn>
      </div>
    </Card>
  );
}

// Layar "22 · Reset Password" (oleh admin untuk akun admin lain/diri sendiri)
export function AdminResetPassword() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { loading, error, retry } = useAdminResources(['admin']);
  const row = useSelector((s) => s.adminData.admin.items.find((a) => String(a.id) === String(id)));
  const { busy, run } = useAdminAction();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [touched, setTouched] = useState(false);

  if (error) return <ErrorBox message={error.message} onRetry={retry} />;
  if (loading) return <Skeleton rows={2} />;
  if (!row) return <Empty title="Akun tidak ditemukan" action={<Btn to="/admin/akun" className="a-btn-auto">Kembali</Btn>} />;

  const errPass = password.length >= MIN_PASSWORD ? null : `Password minimal ${MIN_PASSWORD} karakter`;
  const errConfirm = confirm === password ? null : 'Konfirmasi password tidak sama';
  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (errPass || errConfirm) return;
    const ok = await run('reset', updateResource({ name: 'admin', id: row.id, data: { nama_admin: row.nama_admin, email: row.email, role: row.role, password } }), `Password ${row.nama_admin} berhasil diperbarui.`);
    if (ok) navigate('/admin/akun', { replace: true });
  };

  return (
    <div className="a-page">
      <PageTitle title="Reset Password" subtitle="Perbarui password untuk menjaga keamanan akun." />
      <div>
        <BackButton to="/admin/akun" />
      </div>
      <div className="a-grid-form">
        <Card as="form" onSubmit={submit} noValidate className="a-form">
          <h2 className="a-card-title">Password akun</h2>
          <p className="a-muted small">Kolom bertanda * wajib diisi.</p>
          <Field label="Password Baru" required htmlFor="rp-pass" error={touched ? errPass : null}>
            <PasswordInput id="rp-pass" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={`Minimal ${MIN_PASSWORD} karakter`} autoComplete="new-password" className="a-input" />
          </Field>
          <Field label="Konfirmasi Password" required htmlFor="rp-confirm" error={touched ? errConfirm : null}>
            <PasswordInput id="rp-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Ulangi password baru" autoComplete="new-password" className="a-input" />
          </Field>
          <div className="a-form-actions">
            <Btn variant="secondary" to="/admin/akun">
              Batal
            </Btn>
            <Btn type="submit" loading={busy === 'reset'}>
              Simpan Password
            </Btn>
          </div>
        </Card>
        <section className="a-success">
          <p className="a-success-title">{row.nama_admin}</p>
          <p>Masukkan password baru untuk akun {row.email}. Akun akan memakai password ini pada login berikutnya.</p>
          <p className="a-muted small">Periksa kembali sebelum menyimpan perubahan.</p>
        </section>
      </div>
    </div>
  );
}

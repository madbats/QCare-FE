import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useAdminResources } from '../model';
import { deleteResource, updateResource } from '../store/adminDataSlice';
import { useAdminAction } from '../useAdminAction';
import { Avatar, Btn, Card, ConfirmDialog, Empty, ErrorBox, FilterChips, PageTitle, Pill, SearchBox, Skeleton, Toolbar } from '../ui';
import { initials } from '../../utils/format';
import { pick } from './Schedules';

const FIELDS = ['fasilitas_id', 'nama_dokter', 'spesialisasi', 'no_telepon', 'aktif'];

// Layar "10 · Data Dokter"
export default function Doctors() {
  const { loading, error, retry } = useAdminResources(['dokter', 'fasilitas', 'jadwal']);
  const dokter = useSelector((s) => s.adminData.dokter.items);
  const fasilitas = useSelector((s) => s.adminData.fasilitas.items);
  const jadwal = useSelector((s) => s.adminData.jadwal.items);
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const status = params.get('status') ?? 'semua';
  const { busy, run } = useAdminAction();
  const [removing, setRemoving] = useState(null);

  const set = (key, value, def = '') => {
    const next = new URLSearchParams(params);
    if (value && value !== def) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const aktif = dokter.filter((d) => d.aktif !== false).length;
  const term = q.trim().toLowerCase();
  const list = [...dokter]
    .sort((a, b) => String(a.nama_dokter).localeCompare(String(b.nama_dokter)))
    .filter((d) => (status === 'aktif' ? d.aktif !== false : status === 'nonaktif' ? d.aktif === false : true))
    .filter((d) => !term || [d.nama_dokter, d.spesialisasi, d.no_telepon].some((v) => String(v ?? '').toLowerCase().includes(term)));

  const toggle = (d) =>
    run(
      d.id,
      updateResource({ name: 'dokter', id: d.id, data: { ...pick(d, FIELDS), aktif: d.aktif === false } }),
      d.aktif === false ? `${d.nama_dokter} diaktifkan.` : `${d.nama_dokter} dinonaktifkan.`
    );
  const remove = async () => {
    if (await run(removing.id, deleteResource({ name: 'dokter', id: removing.id }), 'Data dokter berhasil dihapus.')) setRemoving(null);
  };

  if (error) return <ErrorBox message={error.message} onRetry={retry} />;

  return (
    <div className="a-page">
      <PageTitle title="Data Dokter" subtitle="Kelola tenaga medis dan status praktik." />
      <Toolbar summary={`${aktif}/${dokter.length} Dokter Aktif`}>
        <Btn to="/admin/dokter/baru" className="a-btn-auto">
          + Dokter
        </Btn>
      </Toolbar>

      <Card className="a-filter-card">
        <SearchBox value={q} onChange={(v) => set('q', v)} placeholder="Cari nama, spesialisasi, atau telepon..." />
        <FilterChips
          label="Status dokter"
          value={status}
          onChange={(v) => set('status', v, 'semua')}
          options={[
            { value: 'semua', label: `Semua (${dokter.length})` },
            { value: 'aktif', label: `Aktif (${aktif})` },
            { value: 'nonaktif', label: `Nonaktif (${dokter.length - aktif})`, tone: 'rose' },
          ]}
        />
      </Card>

      {loading ? (
        <Skeleton rows={3} />
      ) : list.length === 0 ? (
        <Empty title="Dokter tidak ditemukan" message="Coba kata kunci lain atau tambahkan dokter baru." action={<Btn to="/admin/dokter/baru" className="a-btn-auto">+ Dokter</Btn>} />
      ) : (
        <div className="a-cards">
          {list.map((d) => {
            const fas = fasilitas.find((f) => String(f.id) === String(d.fasilitas_id));
            const jumlahJadwal = jadwal.filter((j) => String(j.dokter_id) === String(d.id)).length;
            return (
              <Card key={d.id} className="a-doctor">
                <div className="a-card-head">
                  <div className="a-person">
                    <Avatar text={initials(d.nama_dokter.replace(/^(dr|drg)\.?\s*/i, ''))} />
                    <span>
                      <strong className="a-queue-name">{d.nama_dokter}</strong>
                      <span className="a-muted small">{d.spesialisasi}</span>
                    </span>
                  </div>
                  <Pill tone={d.aktif === false ? 'rose' : 'teal'}>{d.aktif === false ? 'Nonaktif' : 'Aktif'}</Pill>
                </div>
                <div className="a-legal">
                  <span className="a-overline">FASILITAS</span>
                  <span className="a-strong-line">{fas?.nama_fasilitas ?? '-'}</span>
                  <span className="a-muted small">
                    Telepon {d.no_telepon || '-'} · {jumlahJadwal} jadwal praktik
                  </span>
                </div>
                <div className="a-actions">
                  <Btn variant={d.aktif === false ? 'primary' : 'soft'} className="a-grow" loading={busy === d.id} onClick={() => toggle(d)}>
                    {d.aktif === false ? 'Aktifkan' : 'Nonaktifkan'}
                  </Btn>
                  <Btn variant="secondary" to={`/admin/dokter/${d.id}/ubah`}>
                    Edit
                  </Btn>
                  <Btn variant="danger-soft" onClick={() => setRemoving(d)}>
                    Hapus
                  </Btn>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        title="Hapus dokter?"
        message={removing ? `${removing.nama_dokter} akan dihapus. Dokter yang masih memiliki jadwal/antrean tidak dapat dihapus — nonaktifkan saja.` : ''}
        confirmLabel="Hapus"
        loading={busy === removing?.id}
        onClose={() => setRemoving(null)}
        onConfirm={remove}
      />
    </div>
  );
}

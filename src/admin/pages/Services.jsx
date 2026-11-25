import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useAdminResources } from '../model';
import { deleteResource, updateResource } from '../store/adminDataSlice';
import { useAdminAction } from '../useAdminAction';
import { Btn, Card, ConfirmDialog, Empty, ErrorBox, FilterChips, PageTitle, Pill, Skeleton, Toolbar } from '../ui';
import { formatDurasi, formatRupiah } from '../../utils/format';
import { pick } from './Schedules';

const FIELDS = ['fasilitas_id', 'nama_layanan', 'deskripsi', 'estimasi_durasi', 'biaya', 'aktif'];

// Layar "11 · Layanan Medis"
export default function AdminServices() {
  const { loading, error, retry } = useAdminResources(['layanan', 'fasilitas']);
  const layanan = useSelector((s) => s.adminData.layanan.items);
  const fasilitas = useSelector((s) => s.adminData.fasilitas.items);
  const [params, setParams] = useSearchParams();
  const fasilitasId = params.get('fasilitas') ?? '';
  const { busy, run } = useAdminAction();
  const [removing, setRemoving] = useState(null);

  const aktif = layanan.filter((l) => l.aktif !== false).length;
  const list = layanan.filter((l) => !fasilitasId || String(l.fasilitas_id) === fasilitasId);
  const usedFas = fasilitas.filter((f) => layanan.some((l) => String(l.fasilitas_id) === String(f.id)));

  const toggle = (l) =>
    run(
      l.id,
      updateResource({ name: 'layanan', id: l.id, data: { ...pick(l, FIELDS), aktif: l.aktif === false } }),
      l.aktif === false ? `${l.nama_layanan} diaktifkan.` : `${l.nama_layanan} dinonaktifkan.`
    );
  const remove = async () => {
    if (await run(removing.id, deleteResource({ name: 'layanan', id: removing.id }), 'Layanan berhasil dihapus.')) setRemoving(null);
  };

  if (error) return <ErrorBox message={error.message} onRetry={retry} />;

  return (
    <div className="a-page">
      <PageTitle title="Layanan Medis" subtitle="Kelola poli, estimasi pelayanan, dan tarif." />
      <Toolbar summary={`${layanan.length} Layanan Terdaftar`}>
        <Btn to={`/admin/layanan/baru${fasilitasId ? `?fasilitas=${fasilitasId}` : ''}`} className="a-btn-auto">
          + Layanan
        </Btn>
      </Toolbar>

      <Card className="a-summary-card">
        <div className="a-mini-stats">
          <div>
            <strong>{aktif}</strong>
            <span>Layanan aktif</span>
          </div>
          <div>
            <strong className="a-rose">{layanan.length - aktif}</strong>
            <span>Layanan nonaktif</span>
          </div>
          <div>
            <strong>{usedFas.length}</strong>
            <span>Fasilitas penyedia</span>
          </div>
        </div>
        <p className="a-muted xs">Nomor antrean dibuat otomatis per jadwal & tanggal (A001, A002, …).</p>
      </Card>

      {usedFas.length > 1 && (
        <FilterChips
          label="Filter fasilitas"
          value={fasilitasId}
          onChange={(v) => {
            const next = new URLSearchParams(params);
            if (v) next.set('fasilitas', v);
            else next.delete('fasilitas');
            setParams(next, { replace: true });
          }}
          options={[{ value: '', label: 'Semua' }, ...usedFas.map((f) => ({ value: String(f.id), label: f.nama_fasilitas }))]}
        />
      )}

      {loading ? (
        <Skeleton rows={3} />
      ) : list.length === 0 ? (
        <Empty title="Belum ada layanan" action={<Btn to="/admin/layanan/baru" className="a-btn-auto">+ Layanan</Btn>} />
      ) : (
        <div className="a-cards">
          {list.map((l) => {
            const fas = fasilitas.find((f) => String(f.id) === String(l.fasilitas_id));
            return (
              <Card key={l.id} className="a-service">
                <div className="a-card-head">
                  <Pill tone="sky">{fas?.nama_fasilitas ?? `Fasilitas #${l.fasilitas_id}`}</Pill>
                  <Pill tone={l.aktif === false ? 'rose' : 'teal'}>{l.aktif === false ? 'Nonaktif' : 'Aktif'}</Pill>
                </div>
                <strong className="a-queue-name">{l.nama_layanan}</strong>
                <p className="a-muted small a-clamp">{l.deskripsi || 'Belum ada deskripsi layanan.'}</p>
                <div className="a-two-kv">
                  <div>
                    <span className="a-muted xs">Estimasi pelayanan</span>
                    <strong>{formatDurasi(l.estimasi_durasi)}</strong>
                  </div>
                  <div>
                    <span className="a-muted xs">Tarif layanan</span>
                    <strong>{formatRupiah(l.biaya)}</strong>
                  </div>
                </div>
                <div className="a-actions">
                  <Btn variant={l.aktif === false ? 'primary' : 'soft'} className="a-grow" loading={busy === l.id} onClick={() => toggle(l)}>
                    {l.aktif === false ? 'Aktifkan' : 'Nonaktifkan'}
                  </Btn>
                  <Btn variant="secondary" to={`/admin/layanan/${l.id}/ubah`}>
                    Edit
                  </Btn>
                  <Btn variant="danger-soft" onClick={() => setRemoving(l)}>
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
        title="Hapus layanan?"
        message={removing ? `${removing.nama_layanan} akan dihapus. Layanan yang masih dipakai jadwal/antrean tidak dapat dihapus — nonaktifkan saja.` : ''}
        confirmLabel="Hapus"
        loading={busy === removing?.id}
        onClose={() => setRemoving(null)}
        onConfirm={remove}
      />
    </div>
  );
}

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useAdminResources } from '../model';
import { deleteResource } from '../store/adminDataSlice';
import { useAdminAction } from '../useAdminAction';
import { Btn, Card, ConfirmDialog, Empty, ErrorBox, FilterChips, PageTitle, Pill, Skeleton, Toolbar } from '../ui';
import Icon from '../../components/Icon';

const JENIS_ICON = { 'Rumah Sakit': 'bed', Puskesmas: 'building', Klinik: 'stethoscope', Laboratorium: 'flask' };

// Layar "12 · Fasilitas Klinik" — dipetakan ke tabel fasilitas_kesehatan.
export default function Facilities() {
  const { loading, error, retry } = useAdminResources(['fasilitas', 'layanan', 'dokter']);
  const fasilitas = useSelector((s) => s.adminData.fasilitas.items);
  const layanan = useSelector((s) => s.adminData.layanan.items);
  const dokter = useSelector((s) => s.adminData.dokter.items);
  const [params, setParams] = useSearchParams();
  const jenis = params.get('jenis') ?? '';
  const { busy, run } = useAdminAction();
  const [removing, setRemoving] = useState(null);

  const jenisList = [...new Set(fasilitas.map((f) => f.jenis_fasilitas || 'Lainnya'))];
  const list = fasilitas.filter((f) => !jenis || (f.jenis_fasilitas || 'Lainnya') === jenis);

  const remove = async () => {
    if (await run(removing.id, deleteResource({ name: 'fasilitas', id: removing.id }), 'Fasilitas berhasil dihapus.')) setRemoving(null);
  };

  if (error) return <ErrorBox message={error.message} onRetry={retry} />;

  return (
    <div className="a-page">
      <PageTitle title="Fasilitas Klinik" subtitle="Pantau fasilitas kesehatan beserta layanan dan dokternya." />
      <Toolbar summary={`${fasilitas.length} Unit Fasilitas`}>
        <Btn to="/admin/fasilitas/baru" className="a-btn-auto">
          + Fasilitas
        </Btn>
      </Toolbar>

      <FilterChips
        label="Filter kategori fasilitas"
        value={jenis}
        onChange={(v) => {
          const next = new URLSearchParams(params);
          if (v) next.set('jenis', v);
          else next.delete('jenis');
          setParams(next, { replace: true });
        }}
        options={[{ value: '', label: 'Semua' }, ...jenisList.map((j) => ({ value: j, label: j }))]}
      />

      {loading ? (
        <Skeleton rows={3} />
      ) : list.length === 0 ? (
        <Empty title="Belum ada fasilitas" action={<Btn to="/admin/fasilitas/baru" className="a-btn-auto">+ Fasilitas</Btn>} />
      ) : (
        <div className="a-cards">
          {list.map((f, i) => {
            const nLayanan = layanan.filter((l) => String(l.fasilitas_id) === String(f.id));
            const nAktif = nLayanan.filter((l) => l.aktif !== false).length;
            const nDokter = dokter.filter((d) => String(d.fasilitas_id) === String(f.id) && d.aktif !== false).length;
            const ready = nAktif > 0 && nDokter > 0;
            return (
              <Card key={f.id} className="a-facility">
                <div className="a-facility-visual">
                  <Icon name={JENIS_ICON[f.jenis_fasilitas] ?? 'building'} size={28} />
                  <span>
                    <strong>{f.jenis_fasilitas || 'Fasilitas kesehatan'}</strong>
                    <small>Unit {String(i + 1).padStart(2, '0')}</small>
                  </span>
                </div>
                <div className="a-card-head">
                  <Pill tone="sky">{f.jenis_fasilitas || 'Lainnya'}</Pill>
                  <Pill tone={ready ? 'teal' : 'amber'}>{ready ? 'Tersedia' : 'Belum siap'}</Pill>
                </div>
                <strong className="a-queue-name">{f.nama_fasilitas}</strong>
                <p className="a-muted small">{f.alamat || 'Alamat belum diisi'}</p>
                <p className="a-muted xs">
                  {f.no_telepon || '-'}
                  {f.email ? ` · ${f.email}` : ''}
                </p>
                <p className="a-muted xs">
                  {nAktif}/{nLayanan.length} layanan aktif · {nDokter} dokter aktif
                </p>
                <div className="a-actions">
                  <Btn variant="soft" className="a-grow" to={`/admin/layanan?fasilitas=${f.id}`}>
                    Lihat Layanan
                  </Btn>
                  <Btn variant="secondary" to={`/admin/fasilitas/${f.id}/ubah`}>
                    Edit
                  </Btn>
                  <Btn variant="danger-soft" onClick={() => setRemoving(f)}>
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
        title="Hapus fasilitas?"
        message={removing ? `${removing.nama_fasilitas} akan dihapus. Fasilitas yang masih memiliki layanan/dokter tidak dapat dihapus.` : ''}
        confirmLabel="Hapus"
        loading={busy === removing?.id}
        onClose={() => setRemoving(null)}
        onConfirm={remove}
      />
    </div>
  );
}

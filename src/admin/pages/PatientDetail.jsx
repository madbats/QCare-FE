import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { jamWib, pasienInfo, selectAntreanEnriched, tanggalPendek, umur, useAdminResources } from '../model';
import { deleteResource } from '../store/adminDataSlice';
import { useAdminAction } from '../useAdminAction';
import { Btn, Card, ConfirmDialog, Empty, ErrorBox, KV, PageTitle, Pill, Skeleton, StatusPill } from '../ui';
import { formatTanggal } from '../../utils/format';

const NEEDED = ['pasien', 'antrean', 'layanan', 'dokter', 'jadwal', 'fasilitas', 'riwayat'];

// Layar "09 · Detail Pasien"
export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { loading, error, retry } = useAdminResources(NEEDED, { poll: ['antrean'] });
  const pasien = useSelector((s) => s.adminData.pasien.items.find((p) => String(p.id) === String(id)));
  const antrean = useSelector(selectAntreanEnriched);
  const riwayat = useSelector((s) => s.adminData.riwayat.items);
  const { busy, run } = useAdminAction();
  const [confirm, setConfirm] = useState(false);

  // Riwayat kunjungan: aktif lebih dulu, lalu terbaru.
  const visits = useMemo(
    () =>
      antrean
        .filter((a) => String(a.pasien_id) === String(id))
        .map((a) => {
          const logs = riwayat.filter((r) => String(r.antrean_id) === String(a.id)).sort((x, y) => String(y.created_at).localeCompare(String(x.created_at)));
          return { ...a, note: logs.find((r) => r.keterangan && r.keterangan !== 'Pendaftaran antrean')?.keterangan };
        })
        .sort((a, b) => Number(b.active) - Number(a.active) || String(b.tanggal_kunjungan).localeCompare(String(a.tanggal_kunjungan)) || String(b.created_at).localeCompare(String(a.created_at))),
    [antrean, riwayat, id]
  );

  if (error) return <ErrorBox message={error.message} onRetry={retry} />;
  if (loading) return <Skeleton rows={4} />;
  if (!pasien) return <Empty title="Pasien tidak ditemukan" action={<Btn to="/admin/pasien" className="a-btn-auto">Ke Data Pasien</Btn>} />;

  const info = pasienInfo(pasien);
  const age = umur(pasien.tanggal_lahir);
  const remove = async () => {
    if (await run('hapus', deleteResource({ name: 'pasien', id: pasien.id }), 'Data pasien berhasil dihapus.')) navigate('/admin/pasien', { replace: true });
    else setConfirm(false);
  };

  return (
    <div className="a-page">
      <PageTitle title="Detail Pasien" subtitle="Identitas lengkap dan riwayat kunjungan pasien." />
      <div className="a-toolbar">
        <Btn variant="secondary" className="a-btn-auto" to="/admin/pasien">
          ← Data Pasien
        </Btn>
        <div className="a-toolbar-actions">
          <Btn variant="soft" className="a-btn-auto" to={`/admin/pasien/${pasien.id}/ubah`}>
            Edit Pasien
          </Btn>
        </div>
      </div>

      <div className="a-grid-2">
        <Card>
          <Pill tone={info.tone}>{info.kelompok === 'Disabilitas' ? 'Difabel / Kebutuhan Khusus' : info.kelompokLabel}</Pill>
          <h2 className="a-detail-name">{pasien.nama_pasien}</h2>
          <p className="a-muted xs">
            ID Pasien #{pasien.id} · {pasien.email ? 'Terdaftar di aplikasi QCARE' : 'Didaftarkan melalui loket'}
          </p>
          <div className="a-info-grid">
            <KV label="Kategori" strong>
              {pasien.kategori_pasien ?? '-'}
            </KV>
            <KV label="Jenis kelamin" strong>
              {pasien.jenis_kelamin ?? '-'}
            </KV>
            <KV label="Tanggal lahir" strong>
              {pasien.tanggal_lahir ? formatTanggal(String(pasien.tanggal_lahir).slice(0, 10)) : '-'}
            </KV>
            <KV label="Usia" strong>
              {age != null ? `${age} tahun` : '-'}
            </KV>
            <KV label="Telepon" strong>
              {pasien.no_telepon ?? '-'}
            </KV>
            <KV label="Email" strong>
              {pasien.email ?? '-'}
            </KV>
          </div>
          <KV label="Alamat" strong>
            {pasien.alamat ?? '-'}
          </KV>
          <div className="a-note a-note-rose">
            <strong>Kebutuhan Khusus / Pendampingan</strong>
            <br />
            {info.kebutuhanText || 'Tidak ada kebutuhan khusus'}
          </div>
          <Btn className="a-btn-block" to={`/admin/antrean/baru?pasien=${pasien.id}`}>
            + Daftarkan Antrean
          </Btn>
          <Btn variant="danger-soft" className="a-btn-block" onClick={() => setConfirm(true)}>
            Hapus Pasien
          </Btn>
        </Card>

        <Card>
          <h2 className="a-card-title">Riwayat Kunjungan ({visits.length})</h2>
          <p className="a-muted small">Termasuk kunjungan yang masih aktif.</p>
          {visits.length === 0 ? (
            <Empty title="Belum ada kunjungan" message="Daftarkan antrean pertama untuk pasien ini." />
          ) : (
            <div className="a-list">
              {visits.map((v) => (
                <div key={v.id} className={`a-visit ${v.active ? 'is-active' : ''}`}>
                  <div className="a-card-head">
                    <strong className="a-teal">{v.nomor_antrean}</strong>
                    <StatusPill status={v.status_antrean} />
                  </div>
                  <p className="a-strong-line">{v.layanan?.nama_layanan ?? '-'}</p>
                  <p className="a-muted small">{v.dokter?.nama_dokter ?? '-'}</p>
                  <p className="a-muted xs">
                    {tanggalPendek(v.tanggal_kunjungan)} · Daftar {jamWib(v.created_at)} WIB · {v.jalur}
                  </p>
                  {v.note && <p className="a-muted small">“{v.note}”</p>}
                  <Btn variant={v.active ? 'primary' : 'secondary'} className="a-btn-sm" to={`/admin/antrean/${v.id}`}>
                    {v.active ? 'Lihat Pelayanan' : 'Lihat Detail'}
                  </Btn>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={confirm}
        title="Hapus data pasien?"
        message={`${pasien.nama_pasien} akan dihapus permanen. Pasien yang masih memiliki data antrean tidak dapat dihapus.`}
        confirmLabel="Hapus"
        loading={busy === 'hapus'}
        onClose={() => setConfirm(false)}
        onConfirm={remove}
      />
    </div>
  );
}

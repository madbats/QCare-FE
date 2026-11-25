import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { deleteResource, updateResource } from '../store/adminDataSlice';
import { useAdminAction } from '../useAdminAction';
import { kuotaTerpakai, nextPracticeDate, sortJadwal, tanggalPendek, useAdminResources } from '../model';
import { Btn, Card, ConfirmDialog, Empty, ErrorBox, FilterChips, PageTitle, Pill, Progress, SelectInput, Skeleton, Toolbar } from '../ui';
import { URUTAN_HARI, formatJam } from '../../utils/format';

const NEEDED = ['jadwal', 'dokter', 'layanan', 'antrean'];
const JADWAL_FIELDS = ['dokter_id', 'layanan_id', 'hari', 'jam_mulai', 'jam_selesai', 'kuota', 'aktif'];
export const pick = (row, keys) => Object.fromEntries(keys.map((k) => [k, row[k]]));

// Layar "07 · Jadwal Dokter"
export default function Schedules() {
  const { loading, error, retry } = useAdminResources(NEEDED, { poll: ['antrean'] });
  const { jadwal, dokter, layanan, antrean } = useSelector((s) => ({
    jadwal: s.adminData.jadwal.items,
    dokter: s.adminData.dokter.items,
    layanan: s.adminData.layanan.items,
    antrean: s.adminData.antrean.items,
  }), (a, b) => a.jadwal === b.jadwal && a.dokter === b.dokter && a.layanan === b.layanan && a.antrean === b.antrean);
  const [params, setParams] = useSearchParams();
  const hari = params.get('hari') ?? 'Semua';
  const dokterId = params.get('dokter') ?? '';
  const { busy, run } = useAdminAction();
  const [removing, setRemoving] = useState(null);

  const set = (key, value, def) => {
    const next = new URLSearchParams(params);
    if (value && value !== def) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  // Status kartu: Libur (aktif=false) · Penuh (kuota habis pada tanggal praktik berikutnya) · Tersedia
  const rows = useMemo(
    () =>
      [...jadwal].sort(sortJadwal).map((j) => {
        const tanggal = nextPracticeDate(j.hari);
        const used = kuotaTerpakai(antrean, j.id, tanggal);
        const kuota = Number(j.kuota) || 0;
        const status = j.aktif === false ? 'Libur' : used >= kuota ? 'Penuh' : 'Tersedia';
        return {
          ...j,
          tanggal,
          used,
          kuota,
          status,
          dokter: dokter.find((d) => String(d.id) === String(j.dokter_id)),
          layanan: layanan.find((l) => String(l.id) === String(j.layanan_id)),
        };
      }),
    [jadwal, dokter, layanan, antrean]
  );
  const count = (st) => rows.filter((r) => r.status === st).length;
  const list = rows.filter((r) => (hari === 'Semua' || r.hari === hari) && (!dokterId || String(r.dokter_id) === dokterId));

  const toggle = (j) =>
    run(
      j.id,
      updateResource({ name: 'jadwal', id: j.id, data: { ...pick(j, JADWAL_FIELDS), aktif: j.aktif === false } }),
      j.aktif === false ? 'Jadwal kembali tersedia.' : 'Jadwal ditandai libur.'
    );

  const remove = async () => {
    if (await run(removing.id, deleteResource({ name: 'jadwal', id: removing.id }), 'Jadwal berhasil dihapus.')) setRemoving(null);
  };

  if (error) return <ErrorBox message={error.message} onRetry={retry} />;

  return (
    <div className="a-page">
      <PageTitle title="Jadwal Dokter" subtitle="Atur jadwal praktik, ketersediaan, dan kuota pasien." />
      <Toolbar summary={`${count('Tersedia')} Tersedia · ${count('Penuh')} Penuh · ${count('Libur')} Libur`}>
        <Btn to={`/admin/jadwal/baru${hari !== 'Semua' ? `?hari=${hari}` : ''}`} className="a-btn-auto">
          + Jadwal
        </Btn>
      </Toolbar>

      <Card className="a-filter-card">
        <FilterChips
          label="Filter hari"
          className="a-chips-days"
          value={hari}
          onChange={(v) => set('hari', v, 'Semua')}
          options={[{ value: 'Semua', label: 'Semua' }, ...URUTAN_HARI.map((h) => ({ value: h, label: h.slice(0, 3) }))]}
        />
        <SelectInput
          id="f-dokter"
          value={dokterId}
          onChange={(v) => set('dokter', v, '')}
          placeholder="Semua Dokter"
          options={[{ value: '', label: 'Semua Dokter' }, ...dokter.map((d) => ({ value: String(d.id), label: d.nama_dokter }))]}
        />
      </Card>

      {loading ? (
        <Skeleton rows={3} />
      ) : list.length === 0 ? (
        <Empty title="Belum ada jadwal" message="Tidak ada jadwal untuk filter ini." action={<Btn to="/admin/jadwal/baru" className="a-btn-auto">+ Tambah Jadwal</Btn>} />
      ) : (
        <div className="a-cards">
          {list.map((j) => (
            <Card key={j.id} className="a-schedule">
              <div className="a-card-head">
                <strong className="a-queue-name">{j.dokter?.nama_dokter ?? `Dokter #${j.dokter_id}`}</strong>
                <Pill tone={j.status === 'Tersedia' ? 'teal' : j.status === 'Penuh' ? 'amber' : 'slate'}>{j.status}</Pill>
              </div>
              <p className="a-muted small">
                {j.layanan?.nama_layanan ?? '-'}
                {j.dokter?.spesialisasi ? ` · ${j.dokter.spesialisasi}` : ''}
              </p>
              <p className="a-strong-line">
                {j.hari} · {formatJam(j.jam_mulai).replace('.', ':')}–{formatJam(j.jam_selesai).replace('.', ':')} WIB
              </p>
              <div className="a-quota">
                <div className="a-card-head">
                  <span>
                    <strong>
                      {j.used} / {j.kuota}
                    </strong>{' '}
                    <span className="a-muted xs">kuota {tanggalPendek(j.tanggal)}</span>
                  </span>
                  <span className="a-muted small">Sisa {Math.max(0, j.kuota - j.used)}</span>
                </div>
                <Progress value={j.used} max={j.kuota} tone={j.status === 'Libur' ? 'slate' : undefined} />
              </div>
              <div className="a-actions">
                <Btn variant="soft" className="a-grow" loading={busy === j.id} onClick={() => toggle(j)}>
                  {j.aktif === false ? 'Set Tersedia' : 'Set Libur'}
                </Btn>
                <Btn variant="secondary" to={`/admin/jadwal/${j.id}/ubah`}>
                  Edit
                </Btn>
                <Btn variant="danger-soft" onClick={() => setRemoving(j)}>
                  Hapus
                </Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        title="Hapus jadwal?"
        message={removing ? `Jadwal ${removing.dokter?.nama_dokter ?? ''} hari ${removing.hari} akan dihapus. Jadwal yang sudah memiliki antrean tidak dapat dihapus.` : ''}
        confirmLabel="Hapus"
        loading={busy === removing?.id}
        onClose={() => setRemoving(null)}
        onConfirm={remove}
      />
    </div>
  );
}

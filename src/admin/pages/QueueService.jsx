import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { isStatus, jamWib, selectAntreanEnriched, tanggalPendek, useAdminResources } from '../model';
import { useQueueActions } from '../useQueueActions';
import { Btn, Card, Empty, ErrorBox, Field, KV, PageTitle, Pill, Skeleton, StatusPill } from '../ui';
import { STATUS, sameStatus } from '../../constants/queue';
import { formatJam, formatTanggal } from '../../utils/format';

const NEEDED = ['antrean', 'pasien', 'dokter', 'layanan', 'fasilitas', 'jadwal', 'riwayat'];
const POLL = ['antrean', 'riwayat'];
const STEPS = [
  { status: STATUS.MENUNGGU, label: 'Terdaftar', hint: 'Menunggu dipanggil' },
  { status: STATUS.DIPANGGIL, label: 'Dipanggil', hint: 'Pasien diarahkan ke poli' },
  { status: STATUS.DILAYANI, label: 'Dilayani', hint: 'Tekan Mulai Layani saat pasien hadir' },
  { status: STATUS.SELESAI, label: 'Selesai', hint: 'Catatan tersimpan di Riwayat Antrean' },
];

// Layar "06 · Pelayanan Pasien"
export default function QueueService() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { loading, error, retry } = useAdminResources(NEEDED, { poll: POLL });
  const list = useSelector(selectAntreanEnriched);
  const riwayat = useSelector((s) => s.adminData.riwayat.items);
  const actions = useQueueActions();
  const [note, setNote] = useState('');

  const a = list.find((x) => String(x.id) === String(id));
  const logs = useMemo(
    () => riwayat.filter((r) => String(r.antrean_id) === String(id)).sort((x, y) => String(x.created_at).localeCompare(String(y.created_at))),
    [riwayat, id]
  );

  if (error) return <ErrorBox message={error.message} onRetry={retry} />;
  if (loading) return <Skeleton rows={4} />;
  if (!a) return <Empty title="Antrean tidak ditemukan" action={<Btn to="/admin/antrean">Ke Antrean Aktif</Btn>} />;

  const finished = isStatus(a, STATUS.SELESAI) || isStatus(a, STATUS.DIBATALKAN);
  const resultNote = [...logs].reverse().find((r) => sameStatus(r.status_antrean, STATUS.SELESAI) || sameStatus(r.status_antrean, STATUS.DIBATALKAN))?.keterangan;
  const stepIndex = STEPS.findIndex((s) => isStatus(a, s.status));
  const heroLabel = { menunggu: 'MENUNGGU DIPANGGIL', dipanggil: 'SEDANG DIPANGGIL', dilayani: 'SEDANG DILAYANI', selesai: 'SELESAI', dibatalkan: 'DIBATALKAN' }[
    String(a.status_antrean).toLowerCase()
  ];

  return (
    <div className="a-page">
      <PageTitle title="Pelayanan Pasien" subtitle="Dampingi pasien dari panggilan hingga selesai." />
      <div className="a-grid-2">
        <div className="a-stack">
          <section className={`a-hero-queue ${finished ? 'is-muted' : ''}`}>
            <div className="a-card-head">
              <span className="a-live">● {heroLabel}</span>
              <span className="a-hero-sub">{a.fasilitas?.nama_fasilitas ?? 'Loket QCare'}</span>
            </div>
            <p className="a-hero-number">{a.nomor_antrean}</p>
            <p className="a-hero-name">{a.pasien?.nama_pasien ?? `Pasien #${a.pasien_id}`}</p>
            <p className="a-hero-sub">Silakan menuju {a.layanan?.nama_layanan ?? 'ruang layanan'}</p>
          </section>

          <Card>
            <h2 className="a-card-title">Informasi kunjungan</h2>
            <KV label="Nomor antrean" strong>
              {a.nomor_antrean}
            </KV>
            <KV label="Status">
              <StatusPill status={a.status_antrean} />
            </KV>
            <KV label="Kategori" strong>
              {a.pasien?.kategori_pasien ?? a.kategori_pasien ?? '-'}
            </KV>
            <KV label="Kelompok">
              <Pill tone={a.info.tone}>{a.info.kelompokLabel}</Pill>
            </KV>
            <KV label="Telepon">{a.pasien?.no_telepon ?? '-'}</KV>
            <KV label="Tanggal kunjungan">{formatTanggal(a.tanggal_kunjungan)}</KV>
            <p className="a-muted xs">Dokter penanggung jawab</p>
            <p className="a-strong-line">{a.dokter?.nama_dokter ?? '-'}</p>
            <p className="a-muted xs">
              Jadwal {a.jadwal ? `${a.jadwal.hari} · ${formatJam(a.jadwal.jam_mulai)}–${formatJam(a.jadwal.jam_selesai)}` : '-'} · {a.jalur}
            </p>
            <p className="a-muted xs">Catatan pendaftaran / kebutuhan</p>
            <p className="a-strong-line">{a.info.kebutuhanText || 'Tidak ada kebutuhan khusus'}</p>

            {finished ? (
              <>
                <p className="a-muted xs">Catatan hasil pelayanan</p>
                <p className="a-strong-line">{resultNote || '-'}</p>
                <Btn variant="soft" to={`/admin/pasien/${a.pasien_id}`} className="a-btn-block">
                  Lihat Data Pasien
                </Btn>
              </>
            ) : (
              <>
                <Field label="Catatan hasil pelayanan" htmlFor="s-note" hint="Disimpan ke Riwayat Antrean saat selesai.">
                  <textarea id="s-note" rows={2} className="a-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Contoh: kontrol tekanan darah & evaluasi terapi" />
                </Field>
                <div className="a-form-actions">
                  {isStatus(a, STATUS.MENUNGGU) && (
                    <Btn loading={actions.busyId === a.id} onClick={() => actions.call(a)} className="a-grow">
                      Panggil
                    </Btn>
                  )}
                  {(isStatus(a, STATUS.DIPANGGIL) || isStatus(a, STATUS.DILAYANI)) && (
                    <Btn variant="secondary" onClick={() => actions.recall(a)}>
                      Panggil Ulang
                    </Btn>
                  )}
                  {isStatus(a, STATUS.DIPANGGIL) && (
                    <Btn loading={actions.busyId === a.id} onClick={() => actions.serve(a)}>
                      Mulai Layani
                    </Btn>
                  )}
                </div>
                <Btn variant="soft" className="a-btn-block" disabled={actions.busyId === a.id} onClick={async () => (await actions.finish(a, note)) && setNote('')}>
                  Selesai &amp; Simpan ke Riwayat
                </Btn>
                <Btn variant="danger-soft" className="a-btn-block" onClick={() => navigate(`/admin/antrean/${a.id}/ubah`)}>
                  Batal / Ubah Jadwal
                </Btn>
              </>
            )}
          </Card>
        </div>

        <Card>
          <h2 className="a-card-title">Progres pelayanan</h2>
          <ol className="a-timeline">
            {isStatus(a, STATUS.DIBATALKAN) ? (
              logs.map((r) => (
                <li key={r.id} className="is-done">
                  <strong>{r.status_antrean}</strong>
                  <span>
                    {tanggalPendek(r.created_at)} · {jamWib(r.created_at)} WIB{r.keterangan ? ` · ${r.keterangan}` : ''}
                  </span>
                </li>
              ))
            ) : (
              STEPS.map((s, i) => {
                const log = [...logs].reverse().find((r) => sameStatus(r.status_antrean, s.status));
                const state = i < stepIndex || (i === stepIndex && finished) ? 'is-done' : i === stepIndex ? 'is-current' : '';
                return (
                  <li key={s.status} className={state}>
                    <strong>{s.label}</strong>
                    <span>{log ? `${tanggalPendek(log.created_at)} · ${jamWib(log.created_at)} WIB${log.keterangan && i > 0 ? ` · ${log.keterangan}` : ''}` : s.hint}</span>
                  </li>
                );
              })
            )}
          </ol>
        </Card>
      </div>
    </div>
  );
}

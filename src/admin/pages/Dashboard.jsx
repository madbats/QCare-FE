import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { isStatus, kuotaTerpakai, pasienInfo, nextPracticeDate, selectAdminMaps, selectAntreanEnriched, tanggalPendek, useAdminResources } from '../model';
import { useQueueActions } from '../useQueueActions';
import { Btn, Card, ErrorBox, PageTitle, Pill, Skeleton, StatusPill } from '../ui';
import { STATUS, sameStatus } from '../../constants/queue';
import { greeting, todayJakarta, formatTanggal } from '../../utils/format';

const NEEDED = ['antrean', 'pasien', 'dokter', 'layanan', 'fasilitas', 'jadwal', 'riwayat'];
const POLL = ['antrean', 'riwayat'];

// Layar "02 · Dashboard"
export default function Dashboard() {
  const { loading, error, retry } = useAdminResources(NEEDED, { poll: POLL });
  const admin = useSelector((s) => s.adminAuth.admin);
  const antrean = useSelector(selectAntreanEnriched);
  const maps = useSelector(selectAdminMaps);
  const { dokter, layanan, jadwal, pasien, riwayat } = useSelector((s) => ({
    dokter: s.adminData.dokter.items,
    layanan: s.adminData.layanan.items,
    jadwal: s.adminData.jadwal.items,
    pasien: s.adminData.pasien.items,
    riwayat: s.adminData.riwayat.items,
  }), (a, b) => a.dokter === b.dokter && a.layanan === b.layanan && a.jadwal === b.jadwal && a.pasien === b.pasien && a.riwayat === b.riwayat);
  const actions = useQueueActions();
  const today = todayJakarta();

  const stats = useMemo(() => {
    const todays = antrean.filter((a) => a.tanggal_kunjungan === today && !isStatus(a, STATUS.DIBATALKAN));
    const waiting = todays.filter((a) => isStatus(a, STATUS.MENUNGGU));
    const serving = todays.filter((a) => isStatus(a, STATUS.DIPANGGIL) || isStatus(a, STATUS.DILAYANI));
    const jadwalTersedia = jadwal.filter((j) => j.aktif !== false && kuotaTerpakai(antrean, j.id, nextPracticeDate(j.hari)) < (j.kuota ?? 0));
    const prioritas = pasien.filter((p) => pasienInfo(p).prioritas);
    return { todays, waiting, serving, jadwalTersedia, prioritas };
  }, [antrean, jadwal, pasien, today]);

  // Monitor per poli: layanan aktif + pasien yang sedang dipanggil/dilayani hari ini
  const perPoli = useMemo(
    () =>
      layanan
        .filter((l) => l.aktif !== false)
        .map((l) => {
          const rows = stats.todays.filter((a) => String(a.layanan_id) === String(l.id));
          const current = rows.filter((a) => isStatus(a, STATUS.DIPANGGIL) || isStatus(a, STATUS.DILAYANI)).sort((a, b) => b.id - a.id)[0];
          const waiting = rows.filter((a) => isStatus(a, STATUS.MENUNGGU)).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
          return { layanan: l, fasilitas: maps.fasilitas[String(l.fasilitas_id)], current, waiting };
        })
        .sort((a, b) => b.waiting.length + Number(!!b.current) - (a.waiting.length + Number(!!a.current))),
    [layanan, stats.todays, maps]
  );

  // Riwayat terkini: status akhir (Selesai / Dibatalkan) terbaru
  const recent = useMemo(() => {
    const seen = new Set();
    return [...riwayat]
      .filter((r) => sameStatus(r.status_antrean, STATUS.SELESAI) || sameStatus(r.status_antrean, STATUS.DIBATALKAN))
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .filter((r) => (seen.has(r.antrean_id) ? false : seen.add(r.antrean_id)))
      .slice(0, 4)
      .map((r) => ({ ...r, antrean: antrean.find((a) => String(a.id) === String(r.antrean_id)) }));
  }, [riwayat, antrean]);

  if (error) return <ErrorBox message={error.message} onRetry={retry} />;

  const firstName = admin?.nama_admin?.split(' ')[0] ?? 'Admin';
  const aktifDokter = dokter.filter((d) => d.aktif !== false).length;

  return (
    <div className="a-page">
      <PageTitle title="Dashboard" subtitle="Pantau layanan dan operasional klinik hari ini." />

      <section className="a-hello">
        <div className="a-hello-top">
          <p className="a-hello-title">
            {greeting()}, {firstName}
          </p>
          <span className="a-live">● Live</span>
        </div>
        <p>Siap memberikan pelayanan terbaik hari ini?</p>
        <p className="a-hello-date">{formatTanggal(today)}</p>
      </section>

      {loading ? (
        <Skeleton rows={4} />
      ) : (
        <>
          <div className="a-stats">
            <StatCard label="Antrean Hari Ini" value={stats.todays.length} pill={`${stats.waiting.length} antre`} to="/admin/antrean" />
            <StatCard label="Sedang Dilayani" value={stats.serving.length} pill="Aktif" to="/admin/antrean?status=aktif" />
            <StatCard label="Dokter Aktif" value={aktifDokter} pill={`${aktifDokter}/${dokter.length}`} to="/admin/dokter" />
            <StatCard label="Pasien Terdaftar" value={pasien.length} pill="Terdata" to="/admin/pasien" />
          </div>

          <div className="a-grid-3">
            <FlowCard no="01" title="Online Registration" text={`${stats.jadwalTersedia.length} jadwal/kuota tersedia`} action="Cek Jadwal & Kuota" to="/admin/jadwal" />
            <FlowCard no="02" title="Patient Categorization" text={`${stats.prioritas.length} pasien prioritas terverifikasi`} action="Verifikasi Kategori" to="/admin/pasien?kelompok=prioritas" />
            <FlowCard
              no="03"
              title="Queue Monitoring"
              text={`${stats.waiting.length} menunggu · ${stats.serving.length} dipanggil/dilayani`}
              action="Pantau Antrean"
              to="/admin/antrean"
            />
          </div>

          <div className="a-grid-2">
            <Card>
              <div className="a-card-head">
                <h2 className="a-card-title">Monitor Antrean Per Poli</h2>
                <Pill>{perPoli.length} Poli</Pill>
              </div>
              <p className="a-muted small">Panggil pasien langsung per poli</p>
              <div className="a-list">
                {perPoli.map((p) => (
                  <div key={p.layanan.id} className="a-list-row">
                    <div className="a-list-main">
                      <strong>{p.layanan.nama_layanan}</strong>
                      <span className="a-muted xs">
                        {p.current ? `${p.current.nomor_antrean}  ·  ${p.current.pasien?.nama_pasien ?? '-'}` : '—  ·  Belum ada nomor dipanggil'}
                      </span>
                      <span className="a-teal xs">
                        {p.waiting.length} menunggu{p.fasilitas ? ` · ${p.fasilitas.nama_fasilitas}` : ''}
                      </span>
                    </div>
                    <Btn
                      variant="secondary"
                      className="a-btn-sm"
                      disabled={!p.waiting.length}
                      loading={actions.busyId === p.waiting[0]?.id}
                      onClick={() => actions.call(p.waiting[0])}
                      aria-label={`Panggil antrean berikutnya ${p.layanan.nama_layanan}`}
                    >
                      Panggil
                    </Btn>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h2 className="a-card-title">Riwayat Antrean Terkini</h2>
              <p className="a-muted small">Kunjungan terakhir yang tercatat</p>
              <div className="a-list">
                {recent.length === 0 && <p className="a-muted small">Belum ada kunjungan selesai.</p>}
                {recent.map((r) => (
                  <Link key={r.id} to={r.antrean ? `/admin/antrean/${r.antrean.id}` : '/admin/riwayat'} className="a-list-row a-list-link">
                    <div className="a-list-main">
                      <strong>{r.antrean?.nomor_antrean ?? `#${r.antrean_id}`}</strong>
                      <span>{r.antrean?.pasien?.nama_pasien ?? '-'}</span>
                      <span className="a-muted xs">{tanggalPendek(r.created_at)}</span>
                    </div>
                    <StatusPill status={r.status_antrean} />
                  </Link>
                ))}
              </div>
              <Btn variant="soft" to="/admin/riwayat" className="a-btn-block">
                Lihat Semua →
              </Btn>
            </Card>
          </div>

          <div className="a-footer-actions">
            <span className="a-muted small">Data diperbarui otomatis tiap 15 detik</span>
            <Btn to="/admin/antrean/baru" className="a-btn-auto">
              + Antrean
            </Btn>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, pill, to }) {
  return (
    <Link to={to} className="a-stat">
      <span className="a-stat-label">{label}</span>
      <span className="a-stat-row">
        <span className="a-stat-value">{value}</span>
        <Pill>{pill}</Pill>
      </span>
    </Link>
  );
}

function FlowCard({ no, title, text, action, to }) {
  return (
    <Card className="a-flow">
      <div className="a-card-head">
        <Pill>{no}</Pill>
        <Link to={to} className="a-arrow" aria-label={action}>
          →
        </Link>
      </div>
      <p className="a-flow-title">{title}</p>
      <p className="a-muted xs">{text}</p>
      <Btn variant="soft" to={to} className="a-btn-block">
        {action}
      </Btn>
    </Card>
  );
}

import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { kuotaTerpakai, selectAntreanEnriched, useAdminResources } from '../model';
import { Btn, Card, Empty, ErrorBox, KV, PageTitle, Pill, Skeleton, StatusPill } from '../ui';
import { formatJam, formatTanggal } from '../../utils/format';

const NEEDED = ['antrean', 'pasien', 'dokter', 'layanan', 'fasilitas', 'jadwal'];

// Layar "05 · Nomor Antrean Terbit"
export default function QueueIssued() {
  const { id } = useParams();
  const { loading, error, retry } = useAdminResources(NEEDED);
  const list = useSelector(selectAntreanEnriched);
  const raw = useSelector((s) => s.adminData.antrean.items);
  const a = list.find((x) => String(x.id) === String(id));

  if (error) return <ErrorBox message={error.message} onRetry={retry} />;
  if (loading) return <Skeleton rows={3} />;
  if (!a) return <Empty title="Antrean tidak ditemukan" action={<Btn to="/admin/antrean">Ke Antrean Aktif</Btn>} />;

  return (
    <div className="a-page">
      <PageTitle title="Nomor Antrean Terbit" subtitle="Pendaftaran berhasil. Pasien siap masuk antrean." />
      <div className="a-grid-2">
        <div className="a-stack">
          <section className="a-success">
            <p className="a-overline">✓ PENDAFTARAN BERHASIL</p>
            <p className="a-success-title">Nomor antrean siap digunakan</p>
            <p>Sampaikan nomor ini kepada pasien dan arahkan ke ruang tunggu.</p>
          </section>

          <Card className="a-issued" id="cetak-nomor">
            <p className="a-overline">QCARE · {a.layanan?.nama_layanan?.toUpperCase() ?? 'LAYANAN'}</p>
            <p className="a-issued-number">{a.nomor_antrean}</p>
            <StatusPill status={a.status_antrean} />
            <p className="a-issued-name">{a.pasien?.nama_pasien ?? `Pasien #${a.pasien_id}`}</p>
            <Pill tone={a.info.tone}>{a.info.kelompokLabel}</Pill>
            <KV label="Dokter" strong>
              {a.dokter?.nama_dokter}
            </KV>
            <KV label="Jadwal" strong>
              {a.jadwal ? `${a.jadwal.hari}, ${formatJam(a.jadwal.jam_mulai)}–${formatJam(a.jadwal.jam_selesai)}` : '-'}
            </KV>
            <KV label="Tanggal" strong>
              {formatTanggal(a.tanggal_kunjungan)}
            </KV>
            <KV label="Jalur" strong>
              {a.jalur}
            </KV>
            <KV label="Kuota setelah daftar" strong>
              {a.jadwal ? `${kuotaTerpakai(raw, a.jadwal_dokter_id, a.tanggal_kunjungan)} / ${a.jadwal.kuota}` : '-'}
            </KV>
            <p className="a-muted small">Mohon menunggu hingga nomor Anda dipanggil.</p>
            <div className="a-form-actions">
              <Btn variant="secondary" onClick={() => window.print()}>
                Cetak Nomor
              </Btn>
              <Btn to="/admin/antrean?tanggal=semua">Lihat Antrean</Btn>
            </div>
          </Card>
        </div>

        <Card>
          <h2 className="a-card-title">Selanjutnya</h2>
          <ol className="a-next-steps">
            <li>
              <strong>01 Arahkan ke ruang tunggu</strong>
              <span>Pastikan pasien memperoleh pendampingan sesuai kategori{a.info.kebutuhanText ? `: ${a.info.kebutuhanText}` : '.'}</span>
            </li>
            <li>
              <strong>02 Panggil sesuai antrean</strong>
              <span>Pantau status melalui menu Antrean Aktif.</span>
            </li>
            <li>
              <strong>03 Layani &amp; catat hasil</strong>
              <span>Selesaikan pelayanan untuk memindahkan data ke riwayat.</span>
            </li>
          </ol>
          <Btn variant="soft" to="/admin/antrean/baru" className="a-btn-block">
            + Daftarkan Antrean Lain
          </Btn>
        </Card>
      </div>
    </div>
  );
}

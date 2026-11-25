import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { isStatus, jamWib, selectAntreanEnriched, useAdminResources, KELOMPOK_FILTERS, tanggalPendek } from '../model';
import { useQueueActions } from '../useQueueActions';
import { Btn, Card, ConfirmDialog, ErrorBox, Empty, Field, FilterChips, PageTitle, Pill, SearchBox, SelectInput, Skeleton, StatusPill, Toolbar } from '../ui';
import { STATUS } from '../../constants/queue';
import { todayJakarta } from '../../utils/format';

const NEEDED = ['antrean', 'pasien', 'dokter', 'layanan', 'fasilitas', 'jadwal'];
const POLL = ['antrean'];

// Layar "03 · Antrean Aktif"
export default function ActiveQueue() {
  const { loading, error, retry } = useAdminResources(NEEDED, { poll: POLL });
  const all = useSelector(selectAntreanEnriched);
  const layanan = useSelector((s) => s.adminData.layanan.items);
  const navigate = useNavigate();
  const actions = useQueueActions();
  const [params, setParams] = useSearchParams();
  const [finishing, setFinishing] = useState(null);
  const [note, setNote] = useState('');

  const q = params.get('q') ?? '';
  const status = params.get('status') ?? 'semua';
  const poli = params.get('poli') ?? '';
  const kelompok = params.get('kelompok') ?? '';
  const tanggal = params.get('tanggal') ?? 'hari-ini';
  const today = todayJakarta();

  const set = (key, value, def = '') => {
    const next = new URLSearchParams(params);
    if (value && value !== def) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  // Antrean aktif = Menunggu / Dipanggil / Dilayani (default: kunjungan hari ini)
  const base = useMemo(
    () =>
      all
        .filter((a) => a.active)
        .filter((a) => (tanggal === 'hari-ini' ? a.tanggal_kunjungan === today : true))
        .sort((a, b) => String(a.tanggal_kunjungan).localeCompare(String(b.tanggal_kunjungan)) || String(a.created_at).localeCompare(String(b.created_at))),
    [all, tanggal, today]
  );

  const counts = {
    semua: base.length,
    menunggu: base.filter((a) => isStatus(a, STATUS.MENUNGGU)).length,
    aktif: base.filter((a) => !isStatus(a, STATUS.MENUNGGU)).length,
  };

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return base
      .filter((a) => (status === 'menunggu' ? isStatus(a, STATUS.MENUNGGU) : status === 'aktif' ? !isStatus(a, STATUS.MENUNGGU) : true))
      .filter((a) => !poli || String(a.layanan_id) === poli)
      .filter((a) => !kelompok || a.info.kelompok === kelompok)
      .filter((a) => !term || String(a.nomor_antrean).toLowerCase().includes(term) || (a.pasien?.nama_pasien ?? '').toLowerCase().includes(term));
  }, [base, status, poli, kelompok, q]);

  const next = base.find((a) => isStatus(a, STATUS.MENUNGGU) && (!poli || String(a.layanan_id) === poli));

  if (error) return <ErrorBox message={error.message} onRetry={retry} />;

  return (
    <div className="a-page">
      <PageTitle title="Antrean Aktif" subtitle="Kelola panggilan dan pelayanan pasien secara real-time." />
      <Toolbar summary={`${counts.menunggu} Menunggu · ${counts.aktif} Aktif`}>
        <Btn to="/admin/antrean/baru" className="a-btn-auto">
          + Antrean
        </Btn>
      </Toolbar>

      <Card className="a-filter-card">
        <SearchBox value={q} onChange={(v) => set('q', v)} placeholder="Cari nomor antrean atau nama pasien..." />
        <FilterChips
          value={status}
          onChange={(v) => set('status', v, 'semua')}
          label="Filter status"
          options={[
            { value: 'semua', label: `Semua (${counts.semua})` },
            { value: 'menunggu', label: `Menunggu (${counts.menunggu})`, tone: 'amber' },
            { value: 'aktif', label: `Aktif (${counts.aktif})`, tone: 'sky' },
          ]}
        />
        <div className="a-row-2">
          <SelectInput
            id="f-poli"
            value={poli}
            onChange={(v) => set('poli', v)}
            placeholder="Semua Poli"
            options={[{ value: '', label: 'Semua Poli' }, ...layanan.map((l) => ({ value: String(l.id), label: l.nama_layanan }))]}
          />
          <SelectInput
            id="f-kelompok"
            value={kelompok}
            onChange={(v) => set('kelompok', v)}
            placeholder="Semua Kategori"
            options={[{ value: '', label: 'Semua Kategori' }, ...KELOMPOK_FILTERS]}
          />
        </div>
        <FilterChips
          value={tanggal}
          onChange={(v) => set('tanggal', v, 'hari-ini')}
          label="Tanggal kunjungan"
          options={[
            { value: 'hari-ini', label: `Hari ini · ${tanggalPendek(today)}` },
            { value: 'semua', label: 'Semua tanggal' },
          ]}
        />
      </Card>

      {loading ? (
        <Skeleton rows={3} />
      ) : (
        <>
          {next && (
            <section className="a-next">
              <p className="a-overline">ANTREAN BERIKUTNYA</p>
              <p className="a-next-title">
                {next.nomor_antrean} · {next.pasien?.nama_pasien ?? `Pasien #${next.pasien_id}`}
              </p>
              <p className="a-muted small">
                {next.layanan?.nama_layanan} · {next.dokter?.nama_dokter}
                {next.tanggal_kunjungan !== today && ` · ${tanggalPendek(next.tanggal_kunjungan)}`}
              </p>
              <Btn className="a-btn-block" loading={actions.busyId === next.id} onClick={() => actions.call(next)}>
                Panggil Berikutnya
              </Btn>
            </section>
          )}

          {list.length === 0 ? (
            <Empty
              title="Tidak ada antrean aktif"
              message={tanggal === 'hari-ini' ? 'Belum ada pasien aktif untuk hari ini. Coba lihat "Semua tanggal".' : 'Coba ubah filter pencarian.'}
              action={<Btn to="/admin/antrean/baru" className="a-btn-auto">+ Daftarkan Antrean</Btn>}
            />
          ) : (
            <div className="a-cards">
              {list.map((a) => (
                <Card key={a.id} className="a-queue">
                  <div className="a-card-head">
                    <Link to={`/admin/antrean/${a.id}`} className="a-queue-number">
                      {a.nomor_antrean}
                    </Link>
                    <StatusPill status={a.status_antrean} />
                  </div>
                  <div className="a-card-head">
                    <strong className="a-queue-name">{a.pasien?.nama_pasien ?? `Pasien #${a.pasien_id}`}</strong>
                    <Pill tone={a.info.tone}>{a.info.kelompokLabel}</Pill>
                  </div>
                  <p className="a-muted xs">
                    ID Pasien #{a.pasien_id} · Kategori {a.pasien?.kategori_pasien ?? a.kategori_pasien ?? '-'}
                  </p>
                  <p className="a-muted small">
                    {a.layanan?.nama_layanan ?? '-'} · {a.dokter?.nama_dokter ?? '-'}
                  </p>
                  <p className="a-muted xs">
                    {a.tanggal_kunjungan !== today ? `${tanggalPendek(a.tanggal_kunjungan)} · ` : ''}Daftar {jamWib(a.created_at)} WIB · {a.jalur}
                  </p>
                  {a.info.kebutuhanText && <p className="a-note a-note-amber">{a.info.kebutuhanText}</p>}
                  <div className="a-actions">
                    {isStatus(a, STATUS.MENUNGGU) && (
                      <Btn className="a-grow" loading={actions.busyId === a.id} onClick={() => actions.call(a)}>
                        Panggil
                      </Btn>
                    )}
                    {isStatus(a, STATUS.DIPANGGIL) && (
                      <Btn className="a-grow" loading={actions.busyId === a.id} onClick={() => actions.serve(a)}>
                        Layani
                      </Btn>
                    )}
                    {isStatus(a, STATUS.DILAYANI) && (
                      <Btn className="a-grow" onClick={() => actions.recall(a)}>
                        Panggil Ulang
                      </Btn>
                    )}
                    <Btn variant="soft" onClick={() => (setFinishing(a), setNote(''))} disabled={actions.busyId === a.id}>
                      Selesai
                    </Btn>
                    <Btn variant="secondary" onClick={() => navigate(`/admin/antrean/${a.id}/ubah`)}>
                      Batal/Ubah
                    </Btn>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={Boolean(finishing)}
        title={`Selesaikan ${finishing?.nomor_antrean ?? ''}?`}
        tone="primary"
        confirmLabel="Selesai & Simpan"
        loading={actions.busyId === finishing?.id}
        onClose={() => setFinishing(null)}
        onConfirm={async () => {
          if (await actions.finish(finishing, note)) setFinishing(null);
        }}
      >
        <p className="a-muted small">Status menjadi Selesai dan tercatat di Riwayat Antrean.</p>
        <Field label="Catatan hasil pelayanan" htmlFor="finish-note" hint="Opsional">
          <textarea id="finish-note" rows={3} className="a-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Contoh: pemeriksaan normal, kontrol 1 minggu lagi" />
        </Field>
      </ConfirmDialog>
    </div>
  );
}

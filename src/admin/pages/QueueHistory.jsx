import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { isStatus, jamWib, selectAdminMaps, selectAntreanEnriched, tanggalJakarta, tanggalPendek, useAdminResources } from '../model';
import { Btn, Card, Empty, ErrorBox, Field, FilterChips, PageTitle, Skeleton, StatusPill, Toolbar } from '../ui';
import { STATUS, sameStatus } from '../../constants/queue';
import { addDays, todayJakarta } from '../../utils/format';

const NEEDED = ['riwayat', 'antrean', 'pasien', 'layanan', 'dokter', 'jadwal', 'fasilitas', 'admin'];
const FINAL = [STATUS.SELESAI, STATUS.DIBATALKAN];

// Ekspor CSV (UTF-8 + BOM agar terbaca rapi di Excel)
const toCsv = (rows) =>
  '﻿' +
  rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');

// Layar "13 · Riwayat Antrean"
export default function QueueHistory() {
  const { loading, error, retry } = useAdminResources(NEEDED, { poll: ['riwayat'] });
  const riwayat = useSelector((s) => s.adminData.riwayat.items);
  const antrean = useSelector(selectAntreanEnriched);
  const maps = useSelector(selectAdminMaps);
  const [params, setParams] = useSearchParams();
  const today = todayJakarta();
  const dari = params.get('dari') ?? addDays(today, -7);
  const sampai = params.get('sampai') ?? today;
  const status = params.get('status') ?? 'semua';

  const set = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const inRange = (iso) => {
    const d = tanggalJakarta(iso);
    return d && d >= dari && d <= sampai;
  };

  // Log kunjungan = baris riwayat berstatus akhir (Selesai/Dibatalkan) per antrean
  const logs = useMemo(() => {
    const byAntrean = Object.fromEntries(antrean.map((a) => [String(a.id), a]));
    return riwayat
      .filter((r) => FINAL.some((st) => sameStatus(st, r.status_antrean)) && inRange(r.created_at))
      .map((r) => ({ ...r, antrean: byAntrean[String(r.antrean_id)] }))
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riwayat, antrean, dari, sampai]);

  const counts = {
    semua: logs.length,
    selesai: logs.filter((l) => isStatus(l, STATUS.SELESAI)).length,
    dibatalkan: logs.filter((l) => isStatus(l, STATUS.DIBATALKAN)).length,
  };
  const list = logs.filter((l) => status === 'semua' || (status === 'selesai' ? isStatus(l, STATUS.SELESAI) : isStatus(l, STATUS.DIBATALKAN)));

  const exportCsv = () => {
    const byAntrean = Object.fromEntries(antrean.map((a) => [String(a.id), a]));
    const all = riwayat.filter((r) => inRange(r.created_at)).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    const rows = [
      ['ID Log', 'Waktu (WIB)', 'Nomor Antrean', 'Tanggal Kunjungan', 'Pasien', 'Kategori', 'Layanan', 'Dokter', 'Status', 'Keterangan', 'Petugas'],
      ...all.map((r) => {
        const a = byAntrean[String(r.antrean_id)];
        return [
          r.id,
          `${tanggalJakarta(r.created_at)} ${jamWib(r.created_at)}`,
          a?.nomor_antrean ?? `#${r.antrean_id}`,
          a?.tanggal_kunjungan ?? '',
          a?.pasien?.nama_pasien ?? '',
          a?.pasien?.kategori_pasien ?? '',
          a?.layanan?.nama_layanan ?? '',
          a?.dokter?.nama_dokter ?? '',
          r.status_antrean,
          r.keterangan ?? '',
          r.admin_id ? maps.admin[String(r.admin_id)]?.nama_admin ?? `Admin #${r.admin_id}` : 'Pasien (online)',
        ];
      }),
    ];
    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `riwayat-antrean_${dari}_${sampai}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (error) return <ErrorBox message={error.message} onRetry={retry} />;

  return (
    <div className="a-page">
      <PageTitle title="Riwayat Antrean" subtitle="Telusuri hasil pelayanan dan kunjungan sebelumnya." />
      <Toolbar summary={`${logs.length} Log Riwayat`}>
        <Btn variant="soft" className="a-btn-auto" onClick={exportCsv} disabled={loading}>
          ↓ Ekspor CSV
        </Btn>
      </Toolbar>

      <Card className="a-filter-card">
        <div className="a-row-2">
          <Field label="Dari Tanggal" htmlFor="h-dari">
            <input id="h-dari" type="date" className="a-input" value={dari} max={sampai} onChange={(e) => set('dari', e.target.value)} />
          </Field>
          <Field label="Sampai Tanggal" htmlFor="h-sampai">
            <input id="h-sampai" type="date" className="a-input" value={sampai} min={dari} onChange={(e) => set('sampai', e.target.value)} />
          </Field>
        </div>
        <FilterChips
          label="Filter status"
          value={status}
          onChange={(v) => set('status', v === 'semua' ? '' : v)}
          options={[
            { value: 'semua', label: `Semua (${counts.semua})` },
            { value: 'selesai', label: `Selesai (${counts.selesai})` },
            { value: 'dibatalkan', label: `Dibatalkan (${counts.dibatalkan})`, tone: 'rose' },
          ]}
        />
      </Card>

      {loading ? (
        <Skeleton rows={3} />
      ) : (
        <Card>
          <div className="a-card-head">
            <h2 className="a-card-title">Riwayat kunjungan</h2>
            <span className="a-muted small">{list.length} data</span>
          </div>
          {list.length === 0 ? (
            <Empty title="Tidak ada riwayat" message="Belum ada kunjungan selesai/dibatalkan pada rentang tanggal ini." />
          ) : (
            <div className="a-list">
              {list.map((l) => (
                <div key={l.id} className="a-visit">
                  <div className="a-card-head">
                    <Link to={`/admin/antrean/${l.antrean_id}`} className="a-teal">
                      <strong>{l.antrean?.nomor_antrean ?? `#${l.antrean_id}`}</strong>
                    </Link>
                    <StatusPill status={l.status_antrean} />
                  </div>
                  <p className="a-strong-line">{l.antrean?.pasien?.nama_pasien ?? '-'}</p>
                  <p className="a-muted small">
                    {l.antrean?.layanan?.nama_layanan ?? '-'} · {l.antrean?.dokter?.nama_dokter ?? '-'}
                  </p>
                  <p className="a-muted xs">
                    {tanggalPendek(l.created_at)} · {jamWib(l.created_at)} WIB
                  </p>
                  <div className="a-log-note">
                    <span className="a-overline">CATATAN</span>
                    <p>{l.keterangan || 'Tidak ada catatan.'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
      <p className="a-muted xs a-center">Ekspor CSV mencakup seluruh log riwayat antrean (semua perubahan status) pada rentang tanggal terpilih.</p>
    </div>
  );
}

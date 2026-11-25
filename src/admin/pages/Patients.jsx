import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { KELOMPOK_FILTERS, pasienInfo, umur, useAdminResources } from '../model';
import { Btn, Card, Empty, ErrorBox, FilterChips, PageTitle, Pill, SearchBox, Skeleton, Toolbar } from '../ui';

// Layar "08 · Data Pasien"
export default function Patients() {
  const { loading, error, retry } = useAdminResources(['pasien']);
  const pasien = useSelector((s) => s.adminData.pasien.items);
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const kelompok = params.get('kelompok') ?? 'semua';

  const set = (key, value, def = '') => {
    const next = new URLSearchParams(params);
    if (value && value !== def) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const rows = useMemo(() => pasien.map((p) => ({ ...p, info: pasienInfo(p) })).sort((a, b) => String(a.nama_pasien).localeCompare(String(b.nama_pasien))), [pasien]);
  const list = rows.filter((p) => {
    const term = q.trim().toLowerCase();
    const okTerm =
      !term ||
      [p.nama_pasien, p.no_telepon, p.kebutuhan_khusus, p.email, `#${p.id}`, p.kategori_pasien].some((v) => String(v ?? '').toLowerCase().includes(term));
    const okKel = kelompok === 'semua' || (kelompok === 'prioritas' ? p.info.prioritas : p.info.kelompok === kelompok);
    return okTerm && okKel;
  });

  if (error) return <ErrorBox message={error.message} onRetry={retry} />;

  return (
    <div className="a-page">
      <PageTitle title="Data Pasien" subtitle="Kelola identitas, kategori, dan kebutuhan pendampingan pasien." />
      <Toolbar summary={`${pasien.length} Pasien Terdaftar`}>
        <Btn to="/admin/pasien/baru" className="a-btn-auto">
          + Pasien
        </Btn>
      </Toolbar>

      <Card className="a-filter-card">
        <SearchBox value={q} onChange={(v) => set('q', v)} placeholder="Cari nama, telepon, ID, atau kebutuhan khusus..." />
        <FilterChips
          label="Kelompok pasien"
          value={kelompok}
          onChange={(v) => set('kelompok', v, 'semua')}
          options={[
            { value: 'semua', label: 'Semua' },
            ...KELOMPOK_FILTERS.map((k) => ({ ...k, tone: k.value === 'Umum' ? 'teal' : 'amber' })),
            { value: 'prioritas', label: 'Semua Prioritas', tone: 'rose' },
          ]}
        />
      </Card>

      {loading ? (
        <Skeleton rows={4} />
      ) : list.length === 0 ? (
        <Empty
          title={pasien.length ? 'Pasien tidak ditemukan' : 'Belum ada pasien'}
          message={pasien.length ? 'Coba kata kunci atau kelompok lain.' : 'Tambahkan pasien yang datang langsung ke loket.'}
          action={<Btn to="/admin/pasien/baru" className="a-btn-auto">+ Tambah Pasien</Btn>}
        />
      ) : (
        <div className="a-cards">
          {list.map((p) => {
            const age = umur(p.tanggal_lahir);
            return (
              <Card key={p.id} className="a-patient">
                <div className="a-card-head">
                  <Pill tone={p.info.tone}>{p.info.kelompok === 'Disabilitas' ? 'Difabel / Kebutuhan Khusus' : p.info.kelompokLabel}</Pill>
                  <Pill tone="slate">{p.kategori_pasien ?? 'Umum'}</Pill>
                </div>
                <Link to={`/admin/pasien/${p.id}`} className="a-queue-name a-list-link">
                  {p.nama_pasien}
                </Link>
                <p className="a-muted xs">ID Pasien #{p.id}{p.email ? ` · ${p.email}` : ' · Didaftarkan di loket'}</p>
                <p className="a-muted small">
                  {age != null ? `${age} th · ` : ''}
                  {p.jenis_kelamin ?? '-'} · {p.no_telepon ?? '-'}
                </p>
                <p className={p.info.kebutuhanText ? 'a-note a-note-amber' : 'a-muted small'}>{p.info.kebutuhanText || 'Tidak ada kebutuhan khusus'}</p>
                <div className="a-actions">
                  <Btn variant="soft" className="a-grow" to={`/admin/pasien/${p.id}`}>
                    Detail & Riwayat
                  </Btn>
                  <Btn variant="secondary" to={`/admin/pasien/${p.id}/ubah`}>
                    Edit
                  </Btn>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logoutAdmin } from '../store/adminAuthSlice';
import { useAdminResources } from '../model';
import { showToast } from '../../features/ui/uiSlice';
import { Btn, Card, PageTitle, Pill } from '../ui';
import { initials } from '../../utils/format';
import { sameStatus, STATUS } from '../../constants/queue';

// Layar "15 · Menu Lainnya"
export default function More() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  useAdminResources(['dokter', 'layanan', 'fasilitas', 'riwayat', 'admin']);
  const admin = useSelector((s) => s.adminAuth.admin);
  const d = useSelector((s) => s.adminData);
  const logs = d.riwayat.items.filter((r) => sameStatus(r.status_antrean, STATUS.SELESAI) || sameStatus(r.status_antrean, STATUS.DIBATALKAN)).length;

  const modules = [
    { to: '/admin/dokter', title: 'Data Dokter', desc: 'Profil, spesialisasi, kontak & status praktik', count: `${d.dokter.items.length} Dokter` },
    { to: '/admin/layanan', title: 'Layanan Medis', desc: 'Poli klinik, estimasi & tarif', count: `${d.layanan.items.length} Layanan` },
    { to: '/admin/fasilitas', title: 'Fasilitas Klinik', desc: 'Fasilitas kesehatan, kontak & kesiapan', count: `${d.fasilitas.items.length} Unit` },
    { to: '/admin/riwayat', title: 'Riwayat Antrean', desc: 'Log kunjungan selesai/batal & ekspor CSV', count: `${logs} Log` },
    { to: '/admin/akun', title: 'Kelola Admin & Akun', desc: 'Akun admin, reset password & sesi', count: `${d.admin.items.length} Akun` },
  ];

  const logout = () => {
    dispatch(logoutAdmin());
    dispatch(showToast('Anda telah keluar dari portal admin.', 'info'));
    navigate('/admin/masuk', { replace: true });
  };

  return (
    <div className="a-page">
      <PageTitle title="Menu Lainnya" />
      <section className="a-profile-card">
        <div className="a-card-head">
          <div className="a-person">
            <span className="a-profile-initials">{initials(admin?.nama_admin)}</span>
            <span>
              <strong>{admin?.nama_admin}</strong>
              <span className="a-muted small">{admin?.email}</span>
            </span>
          </div>
          <Btn variant="danger-soft" className="a-btn-sm" onClick={logout}>
            Keluar
          </Btn>
        </div>
        <p className="a-muted small">
          <Pill tone="teal">Admin</Pill> Kelola seluruh operasional dari satu tempat.
        </p>
      </section>
      <div className="a-modules">
        {modules.map((m, i) => (
          <Card key={m.to} as={Link} to={m.to} className="a-module">
            <span className="a-module-index">{String(i + 1).padStart(2, '0')}</span>
            <span className="a-module-text">
              <strong>{m.title}</strong>
              <span className="a-muted small">{m.desc}</span>
            </span>
            <Pill tone="slate">{m.count}</Pill>
            <span className="a-arrow" aria-hidden="true">→</span>
          </Card>
        ))}
      </div>
    </div>
  );
}

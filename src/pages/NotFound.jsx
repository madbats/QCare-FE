import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui';

export default function NotFound() {
  return (
    <div className="container page page-narrow">
      <EmptyState
        icon="search"
        title="Halaman tidak ditemukan"
        message="Alamat yang kamu buka tidak tersedia."
        action={
          <Link to="/" className="btn btn-primary">
            Kembali ke beranda
          </Link>
        }
      />
    </div>
  );
}

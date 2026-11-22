import { Link, useRouteError } from 'react-router-dom';
import Icon from './components/Icon';

export default function ErrorBoundary() {
  const error = useRouteError();
  const message = error?.response?.data?.message || error?.statusText || error?.message || 'Terjadi kesalahan.';

  return (
    <div className="container page page-narrow">
      <div className="state-block state-error" role="alert">
        <span className="state-icon">
          <Icon name="alert" size={26} />
        </span>
        <h1 className="h3">Ups! Ada yang tidak beres.</h1>
        <p>{message}</p>
        <div className="btn-row center">
          <button type="button" className="btn btn-outline" onClick={() => window.location.reload()}>
            <Icon name="refresh" size={18} /> Muat ulang
          </button>
          <Link to="/" className="btn btn-primary">
            Ke beranda
          </Link>
        </div>
      </div>
    </div>
  );
}

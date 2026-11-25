import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCatalog } from '../features/catalog/catalogSlice';

// Ambil master data sekali; halaman lain cukup membaca dari store.
export function useCatalog() {
  const dispatch = useDispatch();
  const status = useSelector((state) => state.catalog.status);
  const error = useSelector((state) => state.catalog.error);
  const hasUser = useSelector((state) => Boolean(state.auth.user));

  useEffect(() => {
    if (hasUser && status === 'idle') dispatch(fetchCatalog());
  }, [dispatch, status, hasUser]);

  return {
    status,
    error,
    loading: status === 'idle' || status === 'loading',
    retry: () => dispatch(fetchCatalog(true)),
  };
}

import ResourceForm from '../ResourceForm';
import { dokterForm, fasilitasForm, jadwalForm, layananForm, pasienForm } from '../forms';

// Layar 16–20 (tambah & ubah memakai rute yang sama: /baru dan /:id/ubah)
export const PasienForm = () => <ResourceForm config={pasienForm} />;
export const DokterForm = () => <ResourceForm config={dokterForm} />;
export const JadwalForm = () => <ResourceForm config={jadwalForm} />;
export const LayananForm = () => <ResourceForm config={layananForm} />;
export const FasilitasForm = () => <ResourceForm config={fasilitasForm} />;

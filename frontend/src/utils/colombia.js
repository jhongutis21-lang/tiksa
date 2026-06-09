export const hoyColombia = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

export const mesPasadoColombia = () => {
  const [y, m, d] = hoyColombia().split('-').map(Number);
  const ultimo = new Date(y, m - 1, 0).getDate();
  const pd = Math.min(d, ultimo);
  const pm = m === 1 ? 12 : m - 1;
  const py = m === 1 ? y - 1 : y;
  return `${py}-${String(pm).padStart(2, '0')}-${String(pd).padStart(2, '0')}`;
};

export const inicioMesColombia = () => {
  const [y, m] = hoyColombia().split('-').map(Number);
  return `${y}-${String(m).padStart(2, '0')}-01`;
};

export const ayerColombia = () => {
  const hoy = hoyColombia();
  const [y, m, d] = hoy.split('-').map(Number);
  const fecha = new Date(y, m - 1, d - 1);
  return fecha.toLocaleDateString('en-CA');
};

export const haceDiasColombia = (dias) => {
  const [y, m, d] = hoyColombia().split('-').map(Number);
  const fecha = new Date(y, m - 1, d - dias);
  return fecha.toLocaleDateString('en-CA');
};

export const formatCOP = (n) =>
  n == null ? '$0' : '$' + Math.round(n).toLocaleString('es-CO');

export const MEDIOS_PAGO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'debito', label: 'Débito' },
  { value: 'credito', label: 'Crédito' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'nequi', label: 'Nequi' },
  { value: 'daviplata', label: 'Daviplata' },
  { value: 'consignacion', label: 'Consignación' },
];

export const MAPA_MEDIOS = Object.fromEntries(MEDIOS_PAGO.map((m) => [m.value, m.label]));

export const estadoBadgeClass = (estado) => {
  const colores = {
    activa: 'bg-green text-white',
    anulada: 'bg-red text-white',
  };
  return colores[estado] || 'bg-gray-200 text-gray-600';
};

export const inicioSemanaColombia = () => {
  const [y, m, d] = hoyColombia().split('-').map(Number);
  const fecha = new Date(y, m - 1, d);
  const diaSemana = fecha.getDay();
  const diff = diaSemana === 0 ? 6 : diaSemana - 1;
  const lunes = new Date(y, m - 1, d - diff);
  return lunes.toLocaleDateString('en-CA');
};

export const MEDIOS_PAGO_COLOR = {
  efectivo: 'bg-green-100 text-green-700 border-green-300',
  debito: 'bg-blue-100 text-blue-700 border-blue-300',
  credito: 'bg-red-100 text-red-700 border-red-300',
  transferencia: 'bg-purple-100 text-purple-700 border-purple-300',
  nequi: 'bg-pink-100 text-pink-700 border-pink-300',
  daviplata: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  consignacion: 'bg-orange-100 text-orange-700 border-orange-300',
};

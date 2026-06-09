import { useState, useEffect } from 'react';
import { Eye, DollarSign, CheckCircle } from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import useAuth from '../hooks/useAuth';
import { formatCOP, MEDIOS_PAGO } from '../utils/colombia';

export default function Creditos() {
  const { tienePermiso } = useAuth();
  const [creditos, setCreditos] = useState([]);
  const [totales, setTotales] = useState({ total_creditos: 0, total_pendiente: 0, total_cobrado: 0 });
  const [toast, setToast] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('activo');
  const [busqueda, setBusqueda] = useState('');
  const [selected, setSelected] = useState(null);
  const [showDetalle, setShowDetalle] = useState(false);
  const [showAbono, setShowAbono] = useState(false);
  const [abonoForm, setAbonoForm] = useState({ creditoId: null, monto: '', medio_pago: 'efectivo', observaciones: '' });

  useEffect(() => { cargar(); }, [filtroEstado]);
  useEffect(() => { cargarTotales(); }, []);

  const cargar = async () => {
    try {
      const params = new URLSearchParams();
      if (filtroEstado) params.append('estado', filtroEstado);
      const res = await api.get(`/creditos?${params}`);
      setCreditos(res.data);
    } catch {
      setToast({ mensaje: 'Error al cargar créditos', tipo: 'error' });
    }
  };

  const cargarTotales = async () => {
    try {
      const res = await api.get('/creditos/totales');
      setTotales(res.data);
    } catch {}
  };

  const verDetalle = async (id) => {
    try {
      const res = await api.get(`/creditos/${id}`);
      setSelected(res.data);
      setShowDetalle(true);
    } catch {
      setToast({ mensaje: 'Error al cargar detalle', tipo: 'error' });
    }
  };

  const abrirAbono = (credito) => {
    setAbonoForm({ creditoId: credito.id, monto: credito.saldo_pendiente, medio_pago: 'efectivo', observaciones: '' });
    setShowAbono(true);
  };

  const handleAbono = async () => {
    try {
      await api.post(`/creditos/${abonoForm.creditoId}/abonar`, {
        monto: parseFloat(abonoForm.monto),
        medio_pago: abonoForm.medio_pago,
        observaciones: abonoForm.observaciones,
      });
      setToast({ mensaje: 'Abono registrado', tipo: 'success' });
      setShowAbono(false);
      cargar();
      cargarTotales();
      if (selected?.id === abonoForm.creditoId) verDetalle(abonoForm.creditoId);
    } catch (err) {
      setToast({ mensaje: err.response?.data?.error || 'Error al registrar abono', tipo: 'error' });
    }
  };

  const filtrados = busqueda.trim()
    ? creditos.filter((c) =>
        (c.cliente_nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
        (c.factura_numero || '').toLowerCase().includes(busqueda.toLowerCase())
      )
    : creditos;

  return (
    <div className="p-6">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <p className="text-gray-500 text-sm mb-1">Total créditos activos</p>
          <p className="text-2xl font-bold">{totales.total_creditos}</p>
        </div>
        <div className="card border-red/30">
          <p className="text-gray-500 text-sm mb-1">Total por cobrar</p>
          <p className="text-2xl font-bold font-mono text-red">{formatCOP(totales.total_pendiente)}</p>
        </div>
        <div className="card border-green/30">
          <p className="text-gray-500 text-sm mb-1">Total cobrado</p>
          <p className="text-2xl font-bold font-mono text-green">{formatCOP(totales.total_cobrado)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="input-field text-sm w-auto">
            <option value="activo">Activos</option>
            <option value="pagado">Pagados</option>
            <option value="">Todos</option>
          </select>
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar cliente o factura..."
            className="input-field text-sm w-64"
          />
        </div>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-border bg-gray-50">
              <th className="p-3">Factura</th>
              <th className="p-3">Cliente</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3 text-right">Saldo pendiente</th>
              <th className="p-3 text-center">Estado</th>
              <th className="p-3 text-center w-32">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((c) => (
              <tr key={c.id} className="border-b border-border/50 hover:bg-gray-50">
                <td className="p-3 font-mono text-gray-400">{c.factura_numero || '-'}</td>
                <td className="p-3 font-medium">{c.cliente_nombre}</td>
                <td className="p-3 text-right font-mono">{formatCOP(c.total)}</td>
                <td className={`p-3 text-right font-mono font-medium ${c.saldo_pendiente > 0 ? 'text-red' : 'text-green'}`}>
                  {formatCOP(c.saldo_pendiente)}
                </td>
                <td className="p-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    c.estado === 'activo' ? 'bg-yellow text-white' :
                    c.estado === 'pagado' ? 'bg-green text-white' :
                    'bg-gray-200 text-gray-600'
                  }`}>{c.estado}</span>
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => verDetalle(c.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-blue" title="Ver detalle">
                      <Eye size={16} />
                    </button>
                    {c.estado === 'activo' && tienePermiso('registrar_abono') && (
                      <button onClick={() => abrirAbono(c)} className="p-1.5 rounded-lg hover:bg-green-50 text-green" title="Registrar abono">
                        <DollarSign size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr><td colSpan="6" className="text-center py-8 text-gray-400">No hay créditos</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showDetalle && selected && (
        <Modal titulo={`Crédito — ${selected.cliente_nombre}`} onClose={() => setShowDetalle(false)} ancho="max-w-2xl">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-3 rounded-lg">
              <div><span className="text-gray-500">Cliente:</span> {selected.cliente_nombre}</div>
              <div><span className="text-gray-500">NIT:</span> {selected.cliente_nit}</div>
              <div><span className="text-gray-500">Factura:</span> {selected.factura_numero || '-'}</div>
              <div><span className="text-gray-500">Creado:</span> {new Date(selected.creado_en).toLocaleDateString('es-CO')}</div>
              <div><span className="text-gray-500">Total:</span> <span className="font-mono">{formatCOP(selected.total)}</span></div>
              <div><span className="text-gray-500">Saldo:</span> <span className={`font-mono font-medium ${selected.saldo_pendiente > 0 ? 'text-red' : 'text-green'}`}>{formatCOP(selected.saldo_pendiente)}</span></div>
            </div>

            <h4 className="font-semibold text-gray-700">Historial de abonos</h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-border bg-gray-50">
                  <th className="pb-2">Fecha</th>
                  <th className="pb-2 text-right">Monto</th>
                  <th className="pb-2 text-center">Pago</th>
                  <th className="pb-2">Registró</th>
                  <th className="pb-2">Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {selected.abonos?.length > 0 ? selected.abonos.map((a) => (
                  <tr key={a.id} className="border-b border-border/50">
                    <td className="py-1.5 text-xs text-gray-500 font-mono">
                      {new Date(a.fecha).toLocaleDateString('es-CO')}
                    </td>
                    <td className="py-1.5 text-right font-mono text-green font-medium">{formatCOP(a.monto)}</td>
                    <td className="py-1.5 text-center text-xs capitalize">{a.medio_pago}</td>
                    <td className="py-1.5 text-xs text-gray-400">{a.usuario_nombre}</td>
                    <td className="py-1.5 text-xs text-gray-400">{a.observaciones || '-'}</td>
                  </tr>
                )) : (
                  <tr><td colSpan="5" className="py-4 text-center text-gray-400">Sin abonos registrados</td></tr>
                )}
              </tbody>
            </table>

            {selected.estado === 'activo' && tienePermiso('registrar_abono') && (
              <div className="flex justify-end">
                <button onClick={() => { setShowDetalle(false); abrirAbono(selected); }} className="btn-primary flex items-center gap-1.5">
                  <DollarSign size={16} /> Registrar abono
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {showAbono && (
        <Modal titulo="Registrar abono" onClose={() => setShowAbono(false)} ancho="max-w-sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
              <input type="number" value={abonoForm.monto} onChange={(e) => setAbonoForm({ ...abonoForm, monto: e.target.value })} className="input-field" autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Medio de pago</label>
              <select value={abonoForm.medio_pago} onChange={(e) => setAbonoForm({ ...abonoForm, medio_pago: e.target.value })} className="input-field">
                {MEDIOS_PAGO.map((mp) => (
                  <option key={mp.value} value={mp.value}>{mp.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
              <input value={abonoForm.observaciones} onChange={(e) => setAbonoForm({ ...abonoForm, observaciones: e.target.value })} className="input-field" placeholder="Opcional" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAbono(false)} className="btn-secondary">Cancelar</button>
              <button onClick={handleAbono} disabled={!abonoForm.monto || parseFloat(abonoForm.monto) <= 0} className="btn-success flex items-center gap-1.5">
                <CheckCircle size={16} /> Registrar abono
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

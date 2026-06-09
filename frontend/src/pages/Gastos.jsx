import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import useAuth from '../hooks/useAuth';
import { hoyColombia, inicioMesColombia, formatCOP, MEDIOS_PAGO } from '../utils/colombia';

export default function Gastos() {
  const { tienePermiso } = useAuth();
  const [gastos, setGastos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [toast, setToast] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [desde, setDesde] = useState(inicioMesColombia());
  const [hasta, setHasta] = useState(hoyColombia());
  const [filtroCat, setFiltroCat] = useState('');
  const [form, setForm] = useState({ categoria_id: '', descripcion: '', monto: '', forma_pago: 'efectivo' });
  const [totalGastos, setTotalGastos] = useState(0);

  useEffect(() => {
    api.get('/gastos/categorias').then((res) => {
      setCategorias(res.data);
      if (res.data.length > 0) setForm((f) => ({ ...f, categoria_id: res.data[0].id }));
    }).catch(() => {});
  }, []);

  useEffect(() => { cargar(); }, [desde, hasta, filtroCat]);

  const cargar = async () => {
    try {
      const params = new URLSearchParams({ desde, hasta });
      if (filtroCat) params.append('categoria_id', filtroCat);
      const [gastosRes, totalesRes] = await Promise.all([
        api.get(`/gastos?${params}`),
        api.get(`/gastos/totales?${params}`),
      ]);
      setGastos(gastosRes.data);
      setTotalGastos(totalesRes.data.total);
    } catch {
      setToast({ mensaje: 'Error al cargar gastos', tipo: 'error' });
    }
  };

  const guardar = async () => {
    try {
      await api.post('/gastos', form);
      setToast({ mensaje: 'Gasto registrado', tipo: 'success' });
      setShowModal(false);
      setForm({ categoria_id: categorias[0]?.id || '', descripcion: '', monto: '', forma_pago: 'efectivo' });
      cargar();
    } catch (err) {
      setToast({ mensaje: err.response?.data?.error || 'Error al guardar', tipo: 'error' });
    }
  };

  const eliminar = async (g) => {
    if (!confirm(`¿Eliminar el gasto "${g.descripcion}" por ${formatCOP(g.monto)}?`)) return;
    try {
      await api.delete(`/gastos/${g.id}`);
      setToast({ mensaje: 'Gasto eliminado', tipo: 'success' });
      cargar();
    } catch {
      setToast({ mensaje: 'Error al eliminar', tipo: 'error' });
    }
  };

  return (
    <div className="p-6">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">Gastos</h2>
        {tienePermiso('editar_gastos') && (
          <button onClick={() => setShowModal(true)} className="btn-primary text-sm flex items-center gap-1.5">
            <Plus size={16} /> Nuevo gasto
          </button>
        )}
      </div>

      <div className="card p-3 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Desde</label>
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="input-field text-sm py-1.5" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Hasta</label>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="input-field text-sm py-1.5" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Categoría</label>
            <select value={filtroCat} onChange={(e) => setFiltroCat(e.target.value)} className="input-field text-sm py-1.5">
              <option value="">Todas</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div className="self-end">
            <p className="text-sm text-gray-500">
              Total: <span className="font-bold font-mono text-red">{formatCOP(totalGastos)}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-border bg-gray-50">
              <th className="p-3">Fecha</th>
              <th className="p-3">Categoría</th>
              <th className="p-3">Descripción</th>
              <th className="p-3 text-center">Pago</th>
              <th className="p-3 text-right">Monto</th>
              <th className="p-3">Registró</th>
              {tienePermiso('editar_gastos') && <th className="p-3 w-12"></th>}
            </tr>
          </thead>
          <tbody>
            {gastos.map((g) => (
              <tr key={g.id} className="border-b border-border/50 hover:bg-gray-50">
                <td className="p-3 text-xs text-gray-500 font-mono">
                  {new Date(g.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', timeZone: 'America/Bogota' })}
                </td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">{g.categoria_nombre}</span>
                </td>
                <td className="p-3 font-medium">{g.descripcion}</td>
                <td className="p-3 text-center text-xs text-gray-500 capitalize">{g.forma_pago}</td>
                <td className="p-3 text-right font-mono font-medium text-red">{formatCOP(g.monto)}</td>
                <td className="p-3 text-xs text-gray-400">{g.usuario_nombre}</td>
                {tienePermiso('editar_gastos') && (
                  <td className="p-3">
                    <button onClick={() => eliminar(g)} className="p-1 rounded hover:bg-red-50 text-red" title="Eliminar">
                      <Trash2 size={14} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {gastos.length === 0 && (
              <tr>
                <td colSpan={tienePermiso('editar_gastos') ? 7 : 6} className="text-center py-8 text-gray-400">No hay gastos registrados en este período</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal titulo="Nuevo gasto" onClose={() => setShowModal(false)} ancho="max-w-sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <select value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: parseInt(e.target.value) })} className="input-field">
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} className="input-field" placeholder="Ej: Compra de café" autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
              <input type="number" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} className="input-field" placeholder="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Forma de pago</label>
              <select value={form.forma_pago} onChange={(e) => setForm({ ...form, forma_pago: e.target.value })} className="input-field">
                {MEDIOS_PAGO.map((fp) => <option key={fp.value} value={fp.value}>{fp.label}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={guardar} disabled={!form.descripcion.trim() || !form.monto} className="btn-primary">Guardar</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

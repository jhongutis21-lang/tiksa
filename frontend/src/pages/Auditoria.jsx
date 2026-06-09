import { useState, useEffect } from 'react';
import api from '../services/api';
import Toast from '../components/Toast';
import { hoyColombia } from '../utils/colombia';

const ACCIONES = {
  factura_creada: { label: 'Factura creada', color: 'text-primary' },
  factura_anulada: { label: 'Factura anulada', color: 'text-red' },
  factura_eliminada: { label: 'Factura eliminada', color: 'text-red' },
  producto_creado: { label: 'Producto creado', color: 'text-green' },
  stock_ajustado: { label: 'Stock ajustado', color: 'text-yellow' },
  usuario_creado: { label: 'Usuario creado', color: 'text-primary' },
  usuario_activado: { label: 'Usuario activado', color: 'text-green' },
  usuario_desactivado: { label: 'Usuario desactivado', color: 'text-red' },
  cambio_procesado: { label: 'Cambio procesado', color: 'text-yellow' },
  login_exitoso: { label: 'Inicio de sesión', color: 'text-green' },
};

export default function Auditoria() {
  const [registros, setRegistros] = useState([]);
  const [acciones, setAcciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtroAccion, setFiltroAccion] = useState('');
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [filtroDias, setFiltroDias] = useState('90');
  const [toast, setToast] = useState(null);
  const [limpiando, setLimpiando] = useState(false);

  const hoy = hoyColombia();

  const cargar = async () => {
    setCargando(true);
    try {
      const params = new URLSearchParams();
      if (filtroAccion) params.set('accion', filtroAccion);
      if (filtroUsuario) params.set('usuario', filtroUsuario);
      if (filtroDias === 'hoy') {
        params.set('desde', hoy);
        params.set('hasta', hoy);
      } else if (filtroDias !== '90') {
        const d = new Date();
        d.setDate(d.getDate() - parseInt(filtroDias));
        params.set('desde', d.toISOString().slice(0, 10));
        params.set('hasta', hoy);
      }
      const res = await api.get(`/auditoria?${params}`);
      setRegistros(res.data);
    } catch {
      setToast({ mensaje: 'Error al cargar auditoría', tipo: 'error' });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, [filtroAccion, filtroUsuario, filtroDias]);

  useEffect(() => {
    api.get('/auditoria/acciones')
      .then((res) => setAcciones(res.data))
      .catch(() => {});
  }, []);

  const handleLimpiar = async () => {
    if (!confirm('¿Borrar registros de auditoría anteriores a 90 días?')) return;
    setLimpiando(true);
    try {
      const res = await api.delete('/auditoria/limpiar?dias=90');
      setToast({ mensaje: res.data.mensaje, tipo: 'success' });
      cargar();
    } catch {
      setToast({ mensaje: 'Error al limpiar auditoría', tipo: 'error' });
    } finally {
      setLimpiando(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {toast && (
        <Toast mensaje={toast.mensaje} tipo={toast.tipo} onClose={() => setToast(null)} />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Auditoría</h2>
          <p className="text-gray-500 text-sm">Registro de acciones del sistema</p>
        </div>
        <button
          onClick={handleLimpiar}
          disabled={limpiando}
          className="btn-secondary text-sm disabled:opacity-50"
        >
          {limpiando ? 'Limpiando...' : 'Limpiar registros viejos'}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 font-medium">Período:</span>
        {[
          { value: 'hoy', label: 'Hoy' },
          { value: '7', label: '7 días' },
          { value: '90', label: '90 días' },
        ].map((o) => (
          <button
            key={o.value}
            onClick={() => setFiltroDias(o.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filtroDias === o.value
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="flex gap-4">
        <select
          value={filtroAccion}
          onChange={(e) => setFiltroAccion(e.target.value)}
          className="input-field w-64"
        >
          <option value="">Todas las acciones</option>
          {acciones.map((a) => (
            <option key={a} value={a}>
              {ACCIONES[a]?.label || a}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={filtroUsuario}
          onChange={(e) => setFiltroUsuario(e.target.value)}
          className="input-field w-64"
          placeholder="Filtrar por usuario..."
        />
      </div>

      {cargando ? (
        <div className="text-center text-gray-400 py-12">Cargando...</div>
      ) : registros.length === 0 ? (
        <div className="text-center text-gray-400 py-12">No hay registros de auditoría</div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Usuario</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Acción</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Detalle</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">IP</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap font-mono text-xs">
                    {r.fecha}
                  </td>
                  <td className="px-4 py-3 font-medium">{r.usuario_nombre}</td>
                  <td className="px-4 py-3">
                    <span className={`${ACCIONES[r.accion]?.color || 'text-gray-600'} font-medium`}>
                      {ACCIONES[r.accion]?.label || r.accion}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{r.detalle}</td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{r.ip || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

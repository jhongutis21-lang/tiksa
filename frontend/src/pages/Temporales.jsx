import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash2, FileText, Calendar, User, CreditCard } from 'lucide-react';
import api from '../services/api';
import Toast from '../components/Toast';
import { formatCOP } from '../utils/colombia';

export default function Temporales() {
  const navigate = useNavigate();
  const [temporales, setTemporales] = useState([]);
  const [toast, setToast] = useState(null);
  const [eliminandoId, setEliminandoId] = useState(null);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    try {
      const res = await api.get('/temporales');
      setTemporales(res.data);
    } catch (err) {
      setToast({ mensaje: 'Error al cargar temporales', tipo: 'error' });
    }
  };

  const completar = (t) => {
    localStorage.setItem('tiksa_restaurar_temporal_id', t.id.toString());
    navigate('/pos');
  };

  const eliminar = async (id) => {
    setEliminandoId(id);
    try {
      await api.delete(`/temporales/${id}`);
      setToast({ mensaje: 'Temporal eliminado', tipo: 'success' });
      cargar();
    } catch (err) {
      setToast({ mensaje: 'Error al eliminar temporal', tipo: 'error' });
    }
    setEliminandoId(null);
  };

  const limpiarViejos = async () => {
    try {
      const res = await api.post('/temporales/limpiar');
      setToast({ mensaje: res.data.mensaje, tipo: 'success' });
      cargar();
    } catch (err) {
      setToast({ mensaje: 'Error al limpiar temporales', tipo: 'error' });
    }
  };

  const calcularTotal = (datos) => {
    if (!datos.items || datos.items.length === 0) return 0;
    return datos.items.reduce((sum, item) => {
      const descMonto = item.precio_unitario * item.cantidad * (item.descuento_porcentaje / 100);
      return sum + (item.precio_unitario * item.cantidad - descMonto);
    }, 0);
  };

  return (
    <div className="p-6">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <FileText size={20} className="text-yellow-600" />
            Facturas temporales
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Facturas que quedaron sin finalizar. Se eliminan automáticamente después de 7 días.
          </p>
        </div>
        {temporales.length > 0 && (
          <button onClick={limpiarViejos} className="btn-secondary text-sm flex items-center gap-1.5">
            <Trash2 size={14} /> Limpiar antiguos
          </button>
        )}
      </div>

      {temporales.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText size={48} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No hay facturas temporales</p>
          <p className="text-xs mt-1">Las facturas que queden sin terminar aparecerán aquí automáticamente.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {temporales.map((t) => {
            const datos = t.datos || {};
            const total = calcularTotal(datos);
            return (
              <div key={t.id} className="card p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={14} />
                        {new Date(t.creado_en).toLocaleString('es-CO', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                      {datos.medioPago && (
                        <span className="flex items-center gap-1.5 capitalize">
                          <CreditCard size={14} /> {datos.medioPago}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                      <span>
                        <span className="text-gray-400">Productos:</span>{' '}
                        <span className="font-medium">{datos.items?.length || 0}</span>
                      </span>
                      {datos.cliente_nombre && (
                        <span className="flex items-center gap-1">
                          <User size={14} className="text-gray-400" />
                          <span className="font-medium">{datos.cliente_nombre}</span>
                        </span>
                      )}
                      {total > 0 && (
                        <span>
                          <span className="text-gray-400">Total estimado:</span>{' '}
                          <span className="font-mono font-medium text-blue">{formatCOP(total)}</span>
                        </span>
                      )}
                    </div>

                    {datos.items && datos.items.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {datos.items.slice(0, 5).map((item, i) => (
                          <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full truncate max-w-[200px]">
                            {item.cantidad}x {item.producto_nombre}
                          </span>
                        ))}
                        {datos.items.length > 5 && (
                          <span className="text-xs text-gray-400">+{datos.items.length - 5} más</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => completar(t)}
                      className="btn-primary text-sm flex items-center gap-1.5 px-3 py-1.5"
                    >
                      <ShoppingCart size={14} /> Completar
                    </button>
                    <button
                      onClick={() => eliminar(t.id)}
                      disabled={eliminandoId === t.id}
                      className="btn-secondary text-sm px-2 py-1.5 text-red"
                      title="Eliminar temporal"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="text-xs text-gray-400 mt-2 border-t border-border/50 pt-2">
                  {t.actualizado_en !== t.creado_en ? (
                    <span>Última actividad: {new Date(t.actualizado_en).toLocaleString('es-CO')}</span>
                  ) : (
                    <span>Creado: {new Date(t.creado_en).toLocaleString('es-CO')}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

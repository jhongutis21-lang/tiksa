import { useState, useEffect } from 'react';
import { Eye, Ban, Trash2, ClipboardCopy, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import api from '../services/api';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { formatCOP, hoyColombia, mesPasadoColombia } from '../utils/colombia';

export default function Domicilios() {
  const { usuario, tienePermiso } = useAuth();
  const [domicilios, setDomicilios] = useState([]);
  const [toast, setToast] = useState(null);
  const [showDetalle, setShowDetalle] = useState(false);
  const [selected, setSelected] = useState(null);
  const [showMotivoModal, setShowMotivoModal] = useState(false);
  const [motivoDomicilio, setMotivoDomicilio] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [tab, setTab] = useState('activos');

  const [historialData, setHistorialData] = useState([]);
  const [historialPage, setHistorialPage] = useState(1);
  const [historialTotalPages, setHistorialTotalPages] = useState(1);
  const [historialTotal, setHistorialTotal] = useState(0);
  const [desde, setDesde] = useState(mesPasadoColombia());
  const [hasta, setHasta] = useState(hoyColombia());
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  useEffect(() => { cargar(); }, []);

  useEffect(() => {
    if (tab === 'historial') cargarHistorial();
  }, [tab, historialPage, desde, hasta, filtroEstado, busqueda]);

  const cargar = async () => {
    try {
      const res = await api.get('/domicilios');
      setDomicilios(res.data);
    } catch {
      setToast({ mensaje: 'Error al cargar domicilios', tipo: 'error' });
    }
  };

  const cargarHistorial = async () => {
    setCargandoHistorial(true);
    try {
      const params = new URLSearchParams({ page: historialPage, limit: 50 });
      if (desde) params.append('desde', desde);
      if (hasta) params.append('hasta', hasta);
      if (filtroEstado && filtroEstado !== 'todos') params.append('estado', filtroEstado);
      if (busqueda) params.append('busqueda', busqueda);
      const res = await api.get(`/domicilios/historial?${params}`);
      setHistorialData(res.data.data);
      setHistorialTotalPages(res.data.totalPages);
      setHistorialTotal(res.data.total);
    } catch {
      setToast({ mensaje: 'Error al cargar historial', tipo: 'error' });
    } finally {
      setCargandoHistorial(false);
    }
  };

  const actualizarEstado = async (id, estado) => {
    try {
      await api.patch(`/domicilios/${id}/estado`, { estado });
      setToast({ mensaje: `Domicilio actualizado a "${estado}"`, tipo: 'success' });
      cargar();
    } catch {
      setToast({ mensaje: 'Error al actualizar estado', tipo: 'error' });
    }
  };

  const verFactura = async (facturaId) => {
    try {
      const res = await api.get(`/facturas/${facturaId}`);
      setSelected(res.data);
      setShowDetalle(true);
    } catch {
      setToast({ mensaje: 'Error al cargar factura', tipo: 'error' });
    }
  };

  const abrirAnular = (d) => {
    setMotivoDomicilio(d);
    setMotivo('');
    setShowMotivoModal(true);
  };

  const confirmarAnular = async () => {
    const d = motivoDomicilio;
    if (!d || !motivo.trim()) return;
    setShowMotivoModal(false);
    try {
      await api.patch(`/facturas/${d.factura_id}/anular`, { motivo });
      setToast({ mensaje: `Factura ${d.factura_numero} anulada`, tipo: 'success' });
      if (tab === 'activos') cargar();
      else cargarHistorial();
    } catch (err) {
      setToast({ mensaje: err.response?.data?.error || 'Error al anular', tipo: 'error' });
    }
  };

  const eliminar = async (d) => {
    if (!confirm(`¿Eliminar domicilio ${d.factura_numero}?`)) return;
    try {
      await api.delete(`/domicilios/${d.id}`);
      setToast({ mensaje: 'Domicilio eliminado', tipo: 'success' });
      if (tab === 'activos') cargar();
      else cargarHistorial();
    } catch (err) {
      setToast({ mensaje: err.response?.data?.error || 'Error al eliminar', tipo: 'error' });
    }
  };

  const copiaCaja = (d) =>
    `TIKSA - COPIA CAJA\nNúmero: ${d.factura_numero}\nCliente: ${d.cliente_nombre}\nTotal: ${formatCOP(d.total)}\nMedio de pago: ${d.medio_pago || 'N/A'}\nFecha: ${new Date().toLocaleString('es-CO')}`;

  const copiaDespacho = (d) =>
    `TIKSA - COPIA DESPACHO\nNúmero: ${d.factura_numero}\n\nProductos a despachar:\n${d.productos || 'Ver factura'}`;

  const copiaRepartidor = (d) =>
    `TIKSA - COPIA REPARTIDOR\n\nDestinatario: ${d.dom_nombre || d.cliente_nombre}\nTeléfono: ${d.dom_telefono || 'N/A'}\nDirección: ${d.dom_direccion || 'N/A'}\nReferencia: ${d.dom_referencia || 'N/A'}`;

  const copiar = (texto, label) => {
    navigator.clipboard.writeText(texto);
    setToast({ mensaje: `${label} copiado`, tipo: 'success' });
  };

  const ESTADOS = [
    { value: 'todos', label: 'Todos' },
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'camino', label: 'En camino' },
    { value: 'entregado', label: 'Entregado' },
    { value: 'anulado', label: 'Anulado' },
  ];

  const estadoBadge = (estado) => {
    const map = {
      pendiente: 'badge-yellow',
      camino: 'badge-green',
      entregado: 'bg-green-100 text-green-700',
      anulado: 'bg-red-100 text-red-700',
    };
    return map[estado] || 'bg-gray-100 text-gray-600';
  };

  const estadoLabel = (estado) => {
    const map = {
      pendiente: 'Pendiente',
      camino: 'En camino',
      entregado: 'Entregado',
      anulado: 'Anulado',
    };
    return map[estado] || estado;
  };

  const renderPaginacion = () => {
    if (historialTotalPages <= 1) return null;
    return (
      <div className="flex items-center justify-center gap-2 mt-4">
        <button
          onClick={() => setHistorialPage(p => Math.max(1, p - 1))}
          disabled={historialPage <= 1}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm text-gray-500">
          Página {historialPage} de {historialTotalPages}
        </span>
        <button
          onClick={() => setHistorialPage(p => Math.min(historialTotalPages, p + 1))}
          disabled={historialPage >= historialTotalPages}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    );
  };

  return (
    <div className="p-6">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 border-b border-border">
          <button
            onClick={() => setTab('activos')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'activos'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Activos
          </button>
          <button
            onClick={() => setTab('historial')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'historial'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Historial
          </button>
        </div>
        <button
          onClick={tab === 'activos' ? cargar : cargarHistorial}
          className="btn-secondary text-sm"
        >
          Actualizar
        </button>
      </div>

      {tab === 'activos' ? (
        <div className="space-y-3">
          {domicilios.map((d) => (
            <div key={d.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-medium text-primary">{d.factura_numero}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${estadoBadge(d.estado)}`}>
                      {estadoLabel(d.estado)}
                    </span>
                  </div>
                  <p className="font-medium">{d.dom_nombre || d.cliente_nombre}</p>
                  <p className="text-sm text-gray-500">{d.dom_direccion}</p>
                  {d.dom_referencia && <p className="text-sm text-gray-400">Ref: {d.dom_referencia}</p>}
                  {d.dom_telefono && <p className="text-sm text-gray-400">Tel: {d.dom_telefono}</p>}
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold">{formatCOP(d.total)}</p>
                  <p className="text-xs text-gray-400">{d.cliente_nombre}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {d.estado === 'pendiente' && (
                  <button onClick={() => actualizarEstado(d.id, 'camino')} className="btn-primary text-xs">
                    Enviar a camino
                  </button>
                )}
                {d.estado === 'camino' && (
                  <button onClick={() => actualizarEstado(d.id, 'entregado')} className="btn-success text-xs">
                    Marcar entregado
                  </button>
                )}

                <button onClick={() => copiar(copiaCaja(d), 'Copia caja')} className="btn-secondary text-xs">
                  <ClipboardCopy size={16} /> Caja
                </button>
                <button onClick={() => copiar(copiaDespacho(d), 'Copia despacho')} className="btn-secondary text-xs">
                  <ClipboardCopy size={16} /> Despacho
                </button>
                <button onClick={() => copiar(copiaRepartidor(d), 'Copia repartidor')} className="btn-secondary text-xs">
                  <ClipboardCopy size={16} /> Repartidor
                </button>

                <div className="flex items-center gap-1 ml-auto">
                        <button onClick={() => verFactura(d.factura_id)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-primary" title="Ver factura">
                    <Eye size={16} />
                  </button>
                  {tienePermiso('anular_factura') && (
                    <button onClick={() => abrirAnular(d)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-red" title="Anular factura">
                      <Ban size={16} />
                    </button>
                  )}
                  {usuario?.rol === 'admin' && (
                    <button onClick={() => eliminar(d)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-red" title="Eliminar domicilio">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              <div className="text-xs text-gray-400 mt-2">
                {d.fecha_salida ? `Salida: ${new Date(d.fecha_salida).toLocaleTimeString('es-CO', { timeZone: 'America/Bogota' })}` : ''}
                {d.fecha_entrega ? ` | Entrega: ${new Date(d.fecha_entrega).toLocaleTimeString('es-CO', { timeZone: 'America/Bogota' })}` : ''}
              </div>
            </div>
          ))}
          {domicilios.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              No hay domicilios registrados
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="card p-3 mb-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">Desde</label>
                <input
                  type="date"
                  value={desde}
                  onChange={(e) => { setDesde(e.target.value); setHistorialPage(1); }}
                  className="input-field text-sm py-1.5"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">Hasta</label>
                <input
                  type="date"
                  value={hasta}
                  onChange={(e) => { setHasta(e.target.value); setHistorialPage(1); }}
                  className="input-field text-sm py-1.5"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">Estado</label>
                <select
                  value={filtroEstado}
                  onChange={(e) => { setFiltroEstado(e.target.value); setHistorialPage(1); }}
                  className="input-field text-sm py-1.5"
                >
                  {ESTADOS.map((e) => (
                    <option key={e.value} value={e.value}>{e.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">Buscar</label>
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={busqueda}
                    onChange={(e) => { setBusqueda(e.target.value); setHistorialPage(1); }}
                    placeholder="N° factura o cliente"
                    className="input-field text-sm py-1.5 pl-8 w-44"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">{historialTotal} domicilios encontrados</p>
          </div>

          <div className="card p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-border bg-gray-50">
                  <th className="p-3">Factura</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Dirección</th>
                  <th className="p-3 text-center">Estado</th>
                  <th className="p-3 text-center">Salida</th>
                  <th className="p-3 text-center">Entrega</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3 text-center w-28">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cargandoHistorial ? (
                  <tr>
                    <td colSpan="8" className="text-center py-12 text-gray-400">
                      <span className="animate-pulse">Cargando...</span>
                    </td>
                  </tr>
                ) : historialData.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-8 text-gray-400">
                      No se encontraron domicilios con esos filtros
                    </td>
                  </tr>
                ) : historialData.map((d) => (
                  <tr key={d.id} className="border-b border-border/50 hover:bg-gray-50">
                    <td className="p-3 font-mono font-medium text-primary">{d.factura_numero}</td>
                    <td className="p-3">{d.dom_nombre || d.cliente_nombre}</td>
                    <td className="p-3 text-gray-500 max-w-[200px] truncate">{d.dom_direccion}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${estadoBadge(d.estado)}`}>
                        {estadoLabel(d.estado)}
                      </span>
                    </td>
                    <td className="p-3 text-center text-gray-500 font-mono text-xs">
                      {d.fecha_salida
                        ? new Date(d.fecha_salida).toLocaleDateString('es-CO', {
                            timeZone: 'America/Bogota', day: '2-digit', month: '2-digit',
                            hour: '2-digit', minute: '2-digit'
                          })
                        : '-'
                      }
                    </td>
                    <td className="p-3 text-center text-gray-500 font-mono text-xs">
                      {d.fecha_entrega
                        ? new Date(d.fecha_entrega).toLocaleDateString('es-CO', {
                            timeZone: 'America/Bogota', day: '2-digit', month: '2-digit',
                            hour: '2-digit', minute: '2-digit'
                          })
                        : '-'
                      }
                    </td>
                    <td className="p-3 text-right font-mono">{formatCOP(d.total)}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1">
                  <button onClick={() => verFactura(d.factura_id)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-primary" title="Ver factura">
                          <Eye size={16} />
                        </button>
                        {tienePermiso('anular_factura') && (
                          <button onClick={() => abrirAnular(d)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-red" title="Anular factura">
                            <Ban size={16} />
                          </button>
                        )}
                        {usuario?.rol === 'admin' && (
                          <button onClick={() => eliminar(d)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-red" title="Eliminar domicilio">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {renderPaginacion()}
        </>
      )}

      {showDetalle && selected && (
        <Modal titulo={`Factura ${selected.numero}`} onClose={() => setShowDetalle(false)} ancho="max-w-3xl">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-3 rounded-lg">
              <div><span className="text-gray-500">Cliente:</span> {selected.cliente_nombre}</div>
              <div><span className="text-gray-500">NIT:</span> {selected.cliente_nit}</div>
              <div><span className="text-gray-500">Atendido por:</span> {selected.usuario_nombre}</div>
              <div><span className="text-gray-500">Medio de pago:</span> {selected.medio_pago}</div>
              <div><span className="text-gray-500">Estado:</span> {selected.estado}</div>
              <div><span className="text-gray-500">CUFE:</span> {selected.cufe}</div>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-border">
                  <th className="pb-2">Producto</th>
                  <th className="pb-2 text-center">Cant</th>
                  <th className="pb-2 text-right">Precio</th>
                  <th className="pb-2 text-right">IVA</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {selected.items?.map((item) => (
                  <tr key={item.id} className="border-b border-border/50">
                    <td className="py-1.5">{item.nombre_mostrar || item.producto_nombre}</td>
                    <td className="py-1.5 text-center">{item.cantidad}</td>
                    <td className="py-1.5 text-right font-mono">{formatCOP(item.precio_unitario)}</td>
                    <td className="py-1.5 text-right font-mono">{item.iva_porcentaje}%</td>
                    <td className="py-1.5 text-right font-mono">{formatCOP(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end">
              <div className="text-right space-y-1">
                <p className="text-sm text-gray-500">Subtotal: <span className="font-mono">{formatCOP(selected.subtotal)}</span></p>
                <p className="text-sm text-gray-500">IVA 19%: <span className="font-mono">{formatCOP(selected.iva_19)}</span></p>
                <p className="text-sm text-gray-500">IVA 5%: <span className="font-mono">{formatCOP(selected.iva_5)}</span></p>
                <p className="text-lg font-bold font-mono text-primary">Total: {formatCOP(selected.total)}</p>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {showMotivoModal && (
        <Modal titulo="Anular factura" onClose={() => setShowMotivoModal(false)} ancho="max-w-sm">
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Se anulará la factura {motivoDomicilio?.factura_numero} y se restaurará el stock.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de anulación</label>
              <input
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="input-field"
                placeholder="Ej: Cliente canceló el domicilio"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowMotivoModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={confirmarAnular} disabled={!motivo.trim()} className="btn-primary">Confirmar</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
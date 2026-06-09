import { useState, useEffect } from 'react';
import { FileText, Search, Printer, XCircle } from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { formatCOP } from '../utils/colombia';

const ESTADOS = {
  activa: { label: 'Activa', color: 'text-green bg-green/10' },
  anulada: { label: 'Anulada', color: 'text-red bg-red/10' },
};

const TIPOS = {
  total: 'Total',
  parcial: 'Parcial',
};

export default function NotasCreditoLista() {
  const [notas, setNotas] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [paginas, setPaginas] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [toast, setToast] = useState(null);
  const [notaSeleccionada, setNotaSeleccionada] = useState(null);
  const [anularId, setAnularId] = useState(null);
  const [motivoAnular, setMotivoAnular] = useState('');

  useEffect(() => { cargar(); }, [pagina]);

  const cargar = async () => {
    try {
      const params = { page: pagina, limit: 50 };
      if (busqueda) {
        params.desde = busqueda;
        params.hasta = busqueda;
      }
      const res = await api.get('/notas-credito', { params });
      setNotas(res.data.data || []);
      setTotal(res.data.total);
      setPaginas(res.data.paginas);
    } catch (err) {
      setToast({ mensaje: 'Error al cargar Notas Crédito', tipo: 'error' });
    }
  };

  const abrirNota = async (id) => {
    try {
      const res = await api.get(`/notas-credito/${id}`);
      setNotaSeleccionada(res.data);
    } catch (err) {
      setToast({ mensaje: 'Error al obtener Nota Crédito', tipo: 'error' });
    }
  };

  const handleAnular = async () => {
    if (!motivoAnular.trim()) {
      setToast({ mensaje: 'Debes ingresar un motivo de anulación', tipo: 'error' });
      return;
    }
    try {
      await api.patch(`/notas-credito/${anularId}/anular`, { motivo: motivoAnular });
      setToast({ mensaje: 'Nota Crédito anulada', tipo: 'success' });
      setAnularId(null);
      setMotivoAnular('');
      cargar();
      if (notaSeleccionada?.id === anularId) setNotaSeleccionada(null);
    } catch (err) {
      setToast({ mensaje: err.response?.data?.error || 'Error al anular', tipo: 'error' });
    }
  };

  return (
    <div className="p-6">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <FileText size={20} className="text-red" />
            Notas Crédito
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {total} nota(s) — {notas.filter((n) => n.estado === 'activa').length} activas
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setPagina(1); cargar(); } }}
            className="input-field text-sm w-48"
          />
          <button onClick={() => { setPagina(1); cargar(); }} className="btn-secondary text-sm flex items-center gap-1.5">
            <Search size={14} /> Buscar
          </button>
        </div>
      </div>

      {notas.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText size={48} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No hay Notas Crédito</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500">
                <th className="p-3">NC #</th>
                <th className="p-3">Factura</th>
                <th className="p-3">Fecha</th>
                <th className="p-3">Usuario</th>
                <th className="p-3">Motivo</th>
                <th className="p-3">Tipo</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3">Estado</th>
                <th className="p-3 text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              {notas.map((nc) => (
                <tr key={nc.id} className="border-t border-border hover:bg-gray-50 cursor-pointer" onClick={() => abrirNota(nc.id)}>
                  <td className="p-3 font-medium">{nc.numero}</td>
                  <td className="p-3 text-gray-500">{nc.factura_numero}</td>
                  <td className="p-3 text-gray-500 text-xs">
                    {new Date(nc.creado_en).toLocaleDateString('es-CO', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                  </td>
                  <td className="p-3">{nc.usuario_nombre}</td>
                  <td className="p-3 text-gray-500 max-w-[200px] truncate">{nc.motivo}</td>
                  <td className="p-3">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      nc.tipo === 'total' ? 'bg-red/10 text-red' : 'bg-yellow/10 text-yellow'
                    }`}>
                      {TIPOS[nc.tipo] || nc.tipo}
                    </span>
                  </td>
                  <td className="p-3 text-right font-mono font-medium text-red">{formatCOP(nc.total)}</td>
                  <td className="p-3">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${ESTADOS[nc.estado]?.color || 'bg-gray/10 text-gray'}`}>
                      {ESTADOS[nc.estado]?.label || nc.estado}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    {nc.estado === 'activa' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setAnularId(nc.id); setMotivoAnular(''); }}
                        className="text-gray-400 hover:text-red transition-colors"
                        title="Anular NC"
                      >
                        <XCircle size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {paginas > 1 && (
            <div className="flex items-center justify-between p-3 border-t border-border bg-gray-50">
              <span className="text-sm text-gray-500">Página {pagina} de {paginas}</span>
              <div className="flex gap-2">
                <button disabled={pagina <= 1} onClick={() => setPagina((p) => Math.max(1, p - 1))} className="btn-secondary text-sm px-3">Anterior</button>
                <button disabled={pagina >= paginas} onClick={() => setPagina((p) => p + 1)} className="btn-secondary text-sm px-3">Siguiente</button>
              </div>
            </div>
          )}
        </div>
      )}

      {notaSeleccionada && (
        <Modal titulo={`Nota Crédito ${notaSeleccionada.numero}`} onClose={() => setNotaSeleccionada(null)} ancho="max-w-lg">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <p className="text-sm text-gray-500">Factura original: <span className="font-medium text-gray-800">{notaSeleccionada.factura_numero}</span></p>
                <p className="text-sm text-gray-500">Cliente: <span className="font-medium text-gray-800">{notaSeleccionada.cliente_nombre}</span></p>
                <p className="text-sm text-gray-500">Atendido por: <span className="font-medium text-gray-800">{notaSeleccionada.usuario_nombre}</span></p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold font-mono text-red">{formatCOP(notaSeleccionada.total)}</p>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${ESTADOS[notaSeleccionada.estado]?.color}`}>
                  {ESTADOS[notaSeleccionada.estado]?.label}
                </span>
              </div>
            </div>

            <div className="text-sm bg-yellow/5 border border-yellow/20 rounded-lg p-3">
              <p className="font-medium text-yellow-700">Motivo: {notaSeleccionada.motivo}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Tipo: {TIPOS[notaSeleccionada.tipo]} — Medio devolución: {notaSeleccionada.medio_pago_devolucion}
              </p>
              {notaSeleccionada.motivo_anulacion && (
                <p className="text-xs text-red mt-1">Anulada: {notaSeleccionada.motivo_anulacion}</p>
              )}
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-border">
                  <th className="pb-1">Producto</th>
                  <th className="pb-1 text-center">Cant</th>
                  <th className="pb-1 text-right">Precio</th>
                  <th className="pb-1 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {notaSeleccionada.items?.map((item) => (
                  <tr key={item.id} className="border-b border-border/30">
                    <td className="py-1">{item.producto_nombre}</td>
                    <td className="py-1 text-center font-mono">{item.cantidad}</td>
                    <td className="py-1 text-right font-mono">{formatCOP(item.precio_unitario)}</td>
                    <td className="py-1 text-right font-mono">{formatCOP(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-between text-sm pt-2 border-t border-border">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-mono">{formatCOP(notaSeleccionada.subtotal)}</span>
            </div>
            {notaSeleccionada.iva_19 > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">IVA 19%</span>
                <span className="font-mono">{formatCOP(notaSeleccionada.iva_19)}</span>
              </div>
            )}
            {notaSeleccionada.iva_5 > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">IVA 5%</span>
                <span className="font-mono">{formatCOP(notaSeleccionada.iva_5)}</span>
              </div>
            )}

            <div className="flex gap-3 justify-end pt-2 border-t border-border">
              {notaSeleccionada.estado === 'activa' && (
                <button onClick={() => { setNotaSeleccionada(null); setAnularId(notaSeleccionada.id); }} className="btn-danger flex items-center gap-1.5">
                  <XCircle size={16} /> Anular NC
                </button>
              )}
              <button onClick={() => setNotaSeleccionada(null)} className="btn-secondary">Cerrar</button>
              <button onClick={() => window.print()} className="btn-primary flex items-center gap-2">
                <Printer size={16} /> Imprimir
              </button>
            </div>
          </div>
        </Modal>
      )}

      {anularId && (
        <Modal titulo="Anular Nota Crédito" onClose={() => { setAnularId(null); setMotivoAnular(''); }}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">¿Estás seguro de anular esta Nota Crédito? El inventario se devolverá a su estado anterior.</p>
            <input
              type="text"
              value={motivoAnular}
              onChange={(e) => setMotivoAnular(e.target.value)}
              placeholder="Motivo de anulación *"
              className="input-field text-sm"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setAnularId(null); setMotivoAnular(''); }} className="btn-secondary">Cancelar</button>
              <button onClick={handleAnular} disabled={!motivoAnular.trim()} className="btn-danger">Anular NC</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

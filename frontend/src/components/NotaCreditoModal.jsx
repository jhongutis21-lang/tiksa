import { useState } from 'react';
import { Search, FileText, Printer, RotateCcw } from 'lucide-react';
import api from '../services/api';
import Modal from './Modal';
import Toast from './Toast';
import { formatCOP } from '../utils/colombia';

const MOTIVOS = [
  { value: 'producto_danado', label: 'Producto dañado' },
  { value: 'producto_vencido', label: 'Producto vencido' },
  { value: 'error_cobro', label: 'Error de cobro' },
  { value: 'cambio_producto', label: 'Cambio de producto' },
  { value: 'cliente_cancelo', label: 'Cliente canceló' },
  { value: 'otro', label: 'Otro' },
];

export default function NotaCreditoModal({ onClose, onCreada }) {
  const [busqueda, setBusqueda] = useState('');
  const [factura, setFactura] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [cantidades, setCantidades] = useState({});
  const [motivo, setMotivo] = useState('');
  const [motivoOtro, setMotivoOtro] = useState('');
  const [medioPagoDev, setMedioPagoDev] = useState('efectivo');
  const [creando, setCreando] = useState(false);
  const [toast, setToast] = useState(null);
  const [ncCreada, setNcCreada] = useState(null);

  const buscarFactura = async () => {
    if (!busqueda.trim()) return;
    setBuscando(true);
    setFactura(null);
    try {
      const res = await api.get(`/facturas?busqueda=${encodeURIComponent(busqueda)}&limit=1`);
      if (res.data.data.length === 0) {
        setToast({ mensaje: 'Factura no encontrada', tipo: 'error' });
        return;
      }
      const f = res.data.data[0];
      const detalle = await api.get(`/facturas/${f.id}`);
      if (detalle.data.estado === 'anulada' || detalle.data.estado === 'eliminada') {
        setToast({ mensaje: 'Esta factura está anulada o eliminada', tipo: 'error' });
        return;
      }
      if (detalle.data.estado === 'devuelta_total') {
        setToast({ mensaje: 'Esta factura ya fue devuelta totalmente', tipo: 'error' });
        return;
      }
      setFactura(detalle.data);
      const iniciales = {};
      detalle.data.items.forEach((item) => { iniciales[item.id] = 0; });
      setCantidades(iniciales);
    } catch (err) {
      setToast({ mensaje: 'Error al buscar factura', tipo: 'error' });
    } finally {
      setBuscando(false);
    }
  };

  const toggleItem = (itemId, cantidadVendida) => {
    setCantidades((prev) => ({
      ...prev,
      [itemId]: prev[itemId] > 0 ? 0 : cantidadVendida,
    }));
  };

  const cambiarCantidad = (itemId, valor) => {
    setCantidades((prev) => {
      const item = factura?.items.find(i => i.id === itemId);
      const max = item?.cantidad || 0;
      return { ...prev, [itemId]: Math.max(0, Math.min(max, parseInt(valor) || 0)) };
    });
  };

  const itemsSeleccionados = factura
    ? factura.items.filter((item) => cantidades[item.id] > 0).map((item) => ({
        ...item,
        cantidad_devuelta: cantidades[item.id],
      }))
    : [];

  const totalNota = itemsSeleccionados.reduce((sum, item) => {
    const descMonto = item.precio_unitario * item.cantidad_devuelta * ((item.descuento_porcentaje || 0) / 100);
    return sum + (item.precio_unitario * item.cantidad_devuelta - descMonto);
  }, 0);

  const handleCrear = async () => {
    if (itemsSeleccionados.length === 0) {
      setToast({ mensaje: 'Selecciona al menos un producto', tipo: 'error' });
      return;
    }
    const motivoFinal = motivo === 'otro' ? motivoOtro.trim() : MOTIVOS.find((m) => m.value === motivo)?.label;
    if (!motivoFinal) {
      setToast({ mensaje: 'Selecciona un motivo', tipo: 'error' });
      return;
    }
    setCreando(true);
    try {
      const res = await api.post('/notas-credito', {
        factura_id: factura.id,
        items: itemsSeleccionados.map((item) => ({
          producto_id: item.producto_id,
          cantidad: item.cantidad_devuelta,
          presentacion_id: item.presentacion_id || null,
        })),
        motivo: motivoFinal,
        medio_pago_devolucion: medioPagoDev,
      });
      setNcCreada(res.data);
      setToast({ mensaje: `Nota Crédito ${res.data.numero} creada ✅`, tipo: 'success' });
      if (onCreada) onCreada(res.data);
    } catch (err) {
      setToast({ mensaje: err.response?.data?.error || 'Error al crear Nota Crédito', tipo: 'error' });
    }
    setCreando(false);
  };

  const cerrarTicket = () => {
    setNcCreada(null);
    onClose();
  };

  return (
    <>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {ncCreada ? (
        <Modal titulo={`Nota Crédito ${ncCreada.numero}`} onClose={cerrarTicket} ancho="max-w-md">
          <div className="space-y-4">
            <div className="text-center border-b border-border pb-3">
              <FileText size={40} className="mx-auto text-yellow-600 mb-2" />
              <p className="text-3xl font-bold font-mono text-red">{formatCOP(ncCreada.total)}</p>
              <p className="text-sm text-gray-500 mt-1">{ncCreada.motivo}</p>
            </div>
            <div className="text-sm space-y-1 text-gray-600">
              <p><span className="text-gray-400">Factura original:</span> {ncCreada.factura_numero}</p>
              <p><span className="text-gray-400">Tipo:</span> {ncCreada.tipo === 'total' ? 'Devolución total' : 'Devolución parcial'}</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-border">
                  <th className="pb-1">Producto</th>
                  <th className="pb-1 text-center">Cant</th>
                  <th className="pb-1 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {ncCreada.items?.map((item) => (
                  <tr key={item.id} className="border-b border-border/30">
                    <td className="py-1">{item.producto_nombre}</td>
                    <td className="py-1 text-center font-mono">{item.cantidad}</td>
                    <td className="py-1 text-right font-mono">{formatCOP(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={cerrarTicket} className="btn-secondary">Cerrar</button>
              <button onClick={() => window.print()} className="btn-primary flex items-center gap-2">
                <Printer size={16} /> Imprimir
              </button>
            </div>
          </div>
        </Modal>
      ) : (
        <Modal titulo="Nota Crédito" onClose={onClose} ancho="max-w-lg">
          <div className="space-y-4">
            {!factura ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">Ingresa el número de factura para buscar</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') buscarFactura(); }}
                    placeholder="Número de factura (ej: POS-000042)..."
                    className="input-field flex-1"
                    autoFocus
                  />
                  <button onClick={buscarFactura} disabled={buscando} className="btn-primary flex items-center gap-1.5">
                    <Search size={16} /> {buscando ? 'Buscando...' : 'Buscar'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm flex items-center justify-between">
                  <div>
                    <p className="font-medium text-primary">Factura {factura.numero}</p>
                    <p className="text-gray-500 text-xs">
                      {new Date(factura.fecha).toLocaleDateString('es-CO')} — {factura.cliente_nombre}
                    </p>
                  </div>
                  <button onClick={() => { setFactura(null); setBusqueda(''); }} className="text-gray-400 hover:text-gray-600 text-sm">
                    Cambiar
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1">
                  {factura.items.map((item) => {
                    const cant = cantidades[item.id] || 0;
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                          cant > 0 ? 'border-primary/30 bg-primary/5' : 'border-border hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={cant > 0}
                          onChange={() => toggleItem(item.id, item.cantidad)}
                          className="rounded border-gray-300"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{item.producto_nombre}</p>
                          <p className="text-xs text-gray-400">
                            {formatCOP(item.precio_unitario)} x {item.cantidad}
                            {item.observacion && <span> — {item.observacion}</span>}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">Vendido: {item.cantidad}</span>
                          <input
                            type="number"
                            value={cant}
                            onChange={(e) => cambiarCantidad(item.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            min="0"
                            max={item.cantidad}
                            className="input-field text-sm w-14 text-center py-1"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-2 pt-2 border-t border-border">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Motivo de la devolución *</label>
                    <select
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      className="input-field text-sm"
                    >
                      <option value="">Seleccionar motivo...</option>
                      {MOTIVOS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                    {motivo === 'otro' && (
                      <input
                        type="text"
                        value={motivoOtro}
                        onChange={(e) => setMotivoOtro(e.target.value)}
                        placeholder="Especifica el motivo..."
                        className="input-field text-sm mt-1.5"
                        autoFocus
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Medio de devolución</label>
                    <select value={medioPagoDev} onChange={(e) => setMedioPagoDev(e.target.value)} className="input-field text-sm">
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="consignacion">Consignación</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between text-sm pt-1">
                    <span className="text-gray-500">
                      {itemsSeleccionados.length} producto(s) seleccionado(s)
                    </span>
                    <span className="font-mono font-bold text-lg text-red">
                      -{formatCOP(totalNota)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-2 border-t border-border">
                  <button onClick={() => { setFactura(null); setBusqueda(''); }} className="btn-secondary">Cancelar</button>
                  <button
                    onClick={handleCrear}
                    disabled={creando || itemsSeleccionados.length === 0}
                    className="btn-danger flex items-center gap-2"
                  >
                    <RotateCcw size={16} /> {creando ? 'Creando...' : `Crear NC (${itemsSeleccionados.length})`}
                  </button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}

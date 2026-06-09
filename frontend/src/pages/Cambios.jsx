import { useState, useRef } from 'react';
import { Check, X, Search, Package } from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { formatCOP } from '../utils/colombia';

const MOTIVOS_PREDEFINIDOS = [
  'Producto defectuoso',
  'Cambio de talla/tamaño',
  'No le gustó',
  'Producto equivocado',
  'Garantía',
];

export default function Cambios() {
  const [numFactura, setNumFactura] = useState('');
  const [factura, setFactura] = useState(null);
  const [itemsDevueltos, setItemsDevueltos] = useState([]);
  const [busquedaReemplazo, setBusquedaReemplazo] = useState('');
  const [productosReemplazo, setProductosReemplazo] = useState([]);
  const [reemplazo, setReemplazo] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [toast, setToast] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);
  const busquedaRef = useRef(null);

  const buscarFactura = async () => {
    if (!numFactura.trim()) return;
    try {
      const res = await api.get(`/facturas?page=1&limit=200`);
      const facturas = res.data.data || [];
      const f = facturas.find((f) => f.numero === numFactura.trim().toUpperCase());
      if (!f) {
        setToast({ mensaje: 'Factura no encontrada', tipo: 'error' });
        return;
      }
      const detalle = await api.get(`/facturas/${f.id}`);
      setFactura(detalle.data);
      setItemsDevueltos(detalle.data.items?.map((i) => ({ ...i, devuelve: false, _devCant: i.cantidad })) || []);
      setReemplazo(null);
      setBusquedaReemplazo('');
      setProductosReemplazo([]);
      setMotivo('');
    } catch (err) {
      setToast({ mensaje: 'Error al buscar factura', tipo: 'error' });
    }
  };

  const buscarReemplazo = async (q) => {
    setBusquedaReemplazo(q);
    if (q.length >= 2) {
      try {
        const res = await api.get(`/productos?activo=true&busqueda=${encodeURIComponent(q)}`);
        setProductosReemplazo(res.data);
      } catch { }
    } else {
      setProductosReemplazo([]);
    }
  };

  const toggleDevuelve = (id) => {
    setItemsDevueltos(itemsDevueltos.map((i) => i.id === id ? { ...i, devuelve: !i.devuelve } : i));
  };

  const toggleTodos = () => {
    const todosSeleccionados = itemsDevueltos.every((i) => i.devuelve);
    setItemsDevueltos(itemsDevueltos.map((i) => ({ ...i, devuelve: !todosSeleccionados })));
  };

  const actualizarCantDev = (id, cantidad) => {
    const item = itemsDevueltos.find((i) => i.id === id);
    if (!item) return;
    const max = item.cantidad;
    const val = Math.max(1, Math.min(max, parseInt(cantidad) || 1));
    const precioUnitario = item.precio_unitario;
    const descPorcentaje = item.descuento_porcentaje || 0;
    const nuevoTotal = Math.round(precioUnitario * val * (1 - descPorcentaje / 100) * 100) / 100;
    setItemsDevueltos(itemsDevueltos.map((i) =>
      i.id === id ? { ...i, _devCant: val, total: nuevoTotal } : i
    ));
  };

  const totalDevuelto = itemsDevueltos.filter((i) => i.devuelve).reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0);
  const precioReemplazo = reemplazo ? (parseFloat(reemplazo.precio_1) || 0) : 0;
  const diferencia = Math.round((totalDevuelto - precioReemplazo) * 100) / 100;
  const seleccionados = itemsDevueltos.filter((i) => i.devuelve).length;

  const procesarCambio = async () => {
    if (!motivo.trim()) {
      setToast({ mensaje: 'Debe ingresar un motivo', tipo: 'error' });
      return;
    }
    setCargando(true);
    try {
      const itemsSalen = itemsDevueltos.filter((i) => i.devuelve).map((i) => ({
        producto_id: i.producto_id,
        cantidad: i._devCant,
        precio: i.precio_unitario,
        presentacion_id: i.presentacion_id || null,
      }));
      const itemsEntran = reemplazo ? [{ producto_id: reemplazo.id, cantidad: 1, precio: precioReemplazo }] : [];

      await api.post('/cambios', {
        factura_original_id: factura.id,
        motivo: motivo.trim(),
        items_salen: itemsSalen,
        items_entran: itemsEntran,
        diferencia
      });

      setToast({ mensaje: 'Cambio procesado exitosamente', tipo: 'success' });
      setFactura(null);
      setItemsDevueltos([]);
      setReemplazo(null);
      setBusquedaReemplazo('');
      setProductosReemplazo([]);
      setMotivo('');
      setNumFactura('');
      setShowConfirmar(false);
    } catch (err) {
      setToast({ mensaje: err.response?.data?.error || 'Error al procesar cambio', tipo: 'error' });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="p-6">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Package size={20} className="text-primary" /> Cambios y devoluciones
      </h2>

      <div className="card mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <Search size={14} className="inline mr-1" />
          Buscar factura original por número
        </label>
        <div className="flex gap-2">
          <input
            ref={busquedaRef}
            type="text"
            value={numFactura}
            onChange={(e) => setNumFactura(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && buscarFactura()}
            placeholder="Ej: POS-000001"
            className="input-field flex-1 font-mono"
            autoFocus
          />
          <button onClick={buscarFactura} className="btn-primary">Buscar</button>
          {factura && (
            <button onClick={() => { setFactura(null); setItemsDevueltos([]); setNumFactura(''); busquedaRef.current?.focus(); }}
              className="btn-secondary">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {factura && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Productos de factura {factura.numero}</h3>
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={itemsDevueltos.length > 0 && itemsDevueltos.every((i) => i.devuelve)}
                  onChange={toggleTodos}
                  className="rounded border-border"
                />
                <span className="text-gray-600 font-medium">{seleccionados} seleccionados</span>
              </label>
            </div>
            {itemsDevueltos.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                <input type="checkbox" checked={item.devuelve} onChange={() => toggleDevuelve(item.id)} className="rounded border-border" />
                <span className="flex-1 min-w-0">
                  <span className="font-medium truncate block">{item.producto_nombre}</span>
                  {item.presentacion_nombre && <span className="text-xs text-gray-400">{item.presentacion_nombre}</span>}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <label className="text-xs text-gray-400">Cant:</label>
                  <input
                    type="number"
                    value={item._devCant}
                    onChange={(e) => actualizarCantDev(item.id, e.target.value)}
                    min="1"
                    max={item.cantidad}
                    disabled={!item.devuelve}
                    className={`w-14 text-center input-field text-sm py-1 ${!item.devuelve ? 'opacity-40' : ''}`}
                  />
                  <span className="text-xs text-gray-400">/ {item.cantidad}</span>
                </div>
                <span className="font-mono font-medium w-28 text-right">{formatCOP(item.total)}</span>
              </div>
            ))}
          </div>

          <div className="card">
            <h3 className="font-semibold mb-3">Producto de reemplazo <span className="text-sm font-normal text-gray-400">(opcional)</span></h3>
            <input
              type="text"
              value={busquedaReemplazo}
              onChange={(e) => buscarReemplazo(e.target.value)}
              placeholder="Buscar producto de reemplazo..."
              className="input-field"
            />
            {productosReemplazo.length > 0 && (
              <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                {productosReemplazo.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setReemplazo(p); setBusquedaReemplazo(p.nombre); setProductosReemplazo([]); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-50 flex justify-between items-center ${reemplazo?.id === p.id ? 'bg-primary/10 ring-1 ring-primary/30' : ''}`}
                  >
                    <div className="min-w-0">
                      <span className="block truncate">{p.nombre}</span>
                      <span className="text-xs text-gray-400">Stock: {p.stock} | Código: {p.codigo_interno || '—'}</span>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span className="font-mono block">{formatCOP(p.precio_1)}</span>
                      {p.stock <= 0 && <span className="text-xs text-red font-medium">AGOTADO</span>}
                      {p.stock > 0 && p.stock <= p.stock_minimo && <span className="text-xs text-yellow">Stock bajo</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {reemplazo && (
              <div className="mt-2 flex items-center justify-between bg-primary/5 px-3 py-2 rounded-lg">
                <span className="text-sm font-medium">{reemplazo.nombre}</span>
                <button onClick={() => { setReemplazo(null); setBusquedaReemplazo(''); }} className="text-red text-xs hover:underline">Quitar</button>
              </div>
            )}
          </div>

          <div className="card bg-gray-50">
            <h3 className="font-semibold mb-2">Resumen</h3>
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Total devuelto: <span className="font-mono font-medium">{formatCOP(totalDevuelto)}</span></p>
              {reemplazo && (
                <p className="text-sm text-gray-500">Producto nuevo: <span className="font-mono font-medium">{formatCOP(precioReemplazo)}</span></p>
              )}
              <p className={`text-lg font-bold font-mono ${diferencia >= 0 ? 'text-green' : 'text-red'}`}>
                {diferencia >= 0
                  ? `A favor del cliente: ${formatCOP(diferencia)}`
                  : `A cobrar: ${formatCOP(Math.abs(diferencia))}`}
              </p>
            </div>
          </div>

          <div className="card">
            <label className="block text-sm font-medium text-gray-700 mb-2">Motivo del cambio</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {MOTIVOS_PREDEFINIDOS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMotivo(m)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    motivo === m
                      ? 'bg-primary text-white border-primary'
                      : 'border-border hover:border-primary/30 text-gray-600'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="input-field text-sm"
              rows="2"
              placeholder="O escribe un motivo personalizado..."
            />
          </div>

          <button
            onClick={() => setShowConfirmar(true)}
            disabled={cargando || seleccionados === 0}
            className="btn-primary w-full disabled:opacity-50 text-lg py-3"
          >
            <Check size={20} className="inline mr-2" />
            {cargando ? 'Procesando...' : `Procesar cambio (${seleccionados} ${seleccionados === 1 ? 'item' : 'items'})`}
          </button>
        </div>
      )}

      {showConfirmar && (
        <Modal titulo="Confirmar cambio" onClose={() => setShowConfirmar(false)} ancho="max-w-lg">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Factura original: <span className="font-mono font-medium">{factura?.numero}</span>
            </p>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Items a devolver:</p>
              <ul className="text-sm space-y-1">
                {itemsDevueltos.filter((i) => i.devuelve).map((i) => (
                  <li key={i.id} className="flex justify-between">
                    <span>{i.producto_nombre} x{i._devCant}</span>
                    <span className="font-mono">{formatCOP(i.total)}</span>
                  </li>
                ))}
              </ul>
            </div>

            {reemplazo && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Reemplazo:</p>
                <p className="text-sm flex justify-between">
                  <span>{reemplazo.nombre}</span>
                  <span className="font-mono">{formatCOP(precioReemplazo)}</span>
                </p>
              </div>
            )}

            <div className="border-t border-border pt-3">
              <p className="text-sm text-gray-500">Motivo: <span className="font-medium text-gray-700">{motivo}</span></p>
              <p className={`text-lg font-bold font-mono mt-1 ${diferencia >= 0 ? 'text-green' : 'text-red'}`}>
                {diferencia >= 0
                  ? `A favor del cliente: ${formatCOP(diferencia)}`
                  : `A cobrar: ${formatCOP(Math.abs(diferencia))}`}
              </p>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowConfirmar(false)} className="btn-secondary">Cancelar</button>
              <button onClick={procesarCambio} disabled={cargando} className="btn-success flex items-center gap-2">
                <Check size={20} />
                <span>{cargando ? 'Procesando...' : 'Confirmar cambio'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

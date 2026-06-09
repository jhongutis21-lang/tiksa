import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Truck, CreditCard, Barcode, Tag, MessageSquare, Plus, Trash2, Printer, Square, CheckSquare, FileText, Search, X, ShoppingCart, Banknote, Smartphone, Building2 } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import api from '../services/api';
import Modal from '../components/Modal';
import NotaCreditoModal from '../components/NotaCreditoModal';
import Toast from '../components/Toast';
import StockBadge from '../components/StockBadge';
import { formatCOP, MEDIOS_PAGO } from '../utils/colombia';

const PAGO_ICONS = {
  efectivo: Banknote, debito: CreditCard, credito: CreditCard,
  transferencia: Building2, nequi: Smartphone, daviplata: Smartphone,
  consignacion: Building2,
};

const PAGO_STYLES = {
  efectivo: 'bg-green/10 text-green border-green/30 hover:bg-green/20 active:bg-green/30',
  debito: 'bg-blue/10 text-blue border-blue/30 hover:bg-blue/20 active:bg-blue/30',
  credito: 'bg-red/10 text-red border-red/30 hover:bg-red/20 active:bg-red/30',
  transferencia: 'bg-purple/10 text-purple border-purple/30 hover:bg-purple/20 active:bg-purple/30',
  nequi: 'bg-pink/10 text-pink border-pink/30 hover:bg-pink/20 active:bg-pink/30',
  daviplata: 'bg-yellow/10 text-yellow border-yellow/30 hover:bg-yellow/20 active:bg-yellow/30',
  consignacion: 'bg-orange/10 text-orange border-orange/30 hover:bg-orange/20 active:bg-orange/30',
};

export default function POS() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [clienteActual, setClienteActual] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState([]);
  const [items, setItems] = useState([]);
  const [medioPago, setMedioPago] = useState(null);
  const [toast, setToast] = useState(null);
  const [esDomicilio, setEsDomicilio] = useState(false);
  const [dom, setDom] = useState({ nombre: '', telefono: '', direccion: '', referencia: '' });
  const [observaciones, setObservaciones] = useState('');
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const busquedaRef = useRef(null);
  const [showPresModal, setShowPresModal] = useState(false);
  const [presParaProducto, setPresParaProducto] = useState(null);
  const [presentaciones, setPresentaciones] = useState([]);
  const [codigoBarras, setCodigoBarras] = useState('');
  const codigoRef = useRef(null);
  const [obsPopover, setObsPopover] = useState(null);
  const popoverRef = useRef(null);
  const [precioListaOverride, setPrecioListaOverride] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showCrearCliente, setShowCrearCliente] = useState(false);
  const [clienteForm, setClienteForm] = useState({ nombre: '', nit: '', telefono: '', direccion: '', limite_credito: 0, lista_precio: 1 });
  const [creandoCliente, setCreandoCliente] = useState(false);
  const [facturaCreada, setFacturaCreada] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [guardando, setGuardando] = useState(false);
  const [seleccionados, setSeleccionados] = useState(new Set());
  const [temporalPendiente, setTemporalPendiente] = useState(null);
  const [temporalId, setTemporalId] = useState(null);
  const [showTemporalModal, setShowTemporalModal] = useState(false);
  const [showNcModal, setShowNcModal] = useState(false);
  const temporalDataRef = useRef(null);
  const guardarRef = useRef(null);
  const pendingRestoreRef = useRef(null);

  const listaPrecio = precioListaOverride ?? clienteActual?.lista_precio ?? 1;
  const puedeDescontar = usuario?.rol === 'admin' || usuario?.rol === 'encargado';

  const extraerUnidad = (nombre) => {
    const match = nombre.match(/^(.+?)\s+([\d.,]+\s*(?:ml|ML|L|l|g|gr|kg|Kg|un|pz|oz|cc))\s*$/);
    if (match) return { base: match[1].trim(), unidad: match[2].replace(/\s+/g, '') };
    return { base: nombre, unidad: null };
  };

  const getPrecio = (obj, lista) => {
    if (!obj) return 0;
    return lista === 2 ? (obj.precio_2 || obj.precio_1)
      : lista === 3 ? (obj.precio_3 || obj.precio_1)
      : lista === 4 ? (obj.precio_4 || obj.precio_1)
      : obj.precio_1;
  };

  useEffect(() => {
    let mounted = true;

    api.get('/productos?activo=true').then((res) => {
      if (!mounted) return;
      setProductos(res.data);
    }).catch((err) => console.error('Error al cargar productos:', err));

    api.get('/clientes').then((res) => {
      if (!mounted) return;
      setClientes(res.data);
      const cf = res.data.find((c) => c.nit === '222222222');
      if (cf) setClienteActual(cf);
    }).catch((err) => console.error('Error al cargar clientes:', err));

    const saved = localStorage.getItem('tiksa_copiar_items');
    if (saved) {
      try {
        setItems(JSON.parse(saved));
        localStorage.removeItem('tiksa_copiar_items');
      } catch (e) {}
    }

    const restoreId = localStorage.getItem('tiksa_restaurar_temporal_id');
    if (restoreId) {
      localStorage.removeItem('tiksa_restaurar_temporal_id');
      api.get(`/temporales/${restoreId}`).then((res) => {
        if (!mounted) return;
        const t = res.data;
        if (t.datos.cliente_id && clientes.length === 0) {
          pendingRestoreRef.current = t;
        } else {
          restaurarTemporal(t);
        }
      }).catch(() => {});
    } else {
      api.get('/temporales').then((res) => {
        if (!mounted) return;
        if (res.data.length > 0) {
          const t = res.data[0];
          const tieneItems = t.datos.items && t.datos.items.length > 0;
          const tieneCliente = t.datos.cliente_id;
          if (tieneItems || tieneCliente) {
            setTemporalPendiente(t);
            setTemporalId(t.id);
            setShowTemporalModal(true);
          }
        }
      }).catch(() => {});
    }

    busquedaRef.current?.focus();

    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!obsPopover) return;
    const handler = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setObsPopover(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [obsPopover]);

  useEffect(() => {
    setSeleccionados(new Set());
    if (busqueda.length >= 2) {
      const filtrados = productos.filter(
        (p) => p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
               (p.codigo_interno && p.codigo_interno.toLowerCase().includes(busqueda.toLowerCase()))
      );
      setResultados(filtrados.slice(0, 10));
    } else if (busqueda.length === 1) {
      setResultados(productos.filter(p => p.codigo_interno === busqueda).slice(0, 10));
    } else {
      setResultados([]);
    }
  }, [busqueda, productos]);

  useEffect(() => { setSelectedIndex(resultados.length > 0 ? 0 : -1); }, [resultados]);

  const seleccionarProducto = (producto) => {
    if (producto.presentaciones?.length) {
      setPresParaProducto(producto);
      setPresentaciones(producto.presentaciones);
      setShowPresModal(true);
    } else {
      agregarAlCarrito(producto, null);
    }
  };

  const toggleSeleccion = (id) => {
    setSeleccionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const agregarMultiples = (productos) => {
    const conPres = productos.filter(p => p.presentaciones?.length > 0);
    const sinPres = productos.filter(p => !p.presentaciones?.length);
    sinPres.forEach(p => agregarAlCarrito(p, null));
    if (conPres.length > 0) {
      const nombres = conPres.map(p => p.nombre).join(', ');
      setToast({ mensaje: `${nombres} tienen presentaciones, agrégalos individualmente`, tipo: 'warning' });
    }
    setSeleccionados(new Set());
    setBusqueda('');
    setResultados([]);
    busquedaRef.current?.focus();
  };

  const agregarAlCarrito = (producto, presentacion) => {
    const precio = getPrecio(presentacion || producto, listaPrecio);
    const nuevoItem = {
      _key: Date.now() + Math.random(),
      producto_id: producto.id,
      producto_nombre: producto.nombre + (presentacion ? ` — ${presentacion.nombre}` : ''),
      cantidad: 1,
      precio_unitario: precio,
      iva: producto.iva,
      descuento_porcentaje: 0,
      stock: producto.stock,
      stock_minimo: producto.stock_minimo,
      presentacion_id: presentacion?.id || null,
      presentacion_nombre: presentacion?.nombre || null,
      observacion: '',
    };
    setItems(prev => [...prev, nuevoItem]);
    setBusqueda('');
    setResultados([]);
    busquedaRef.current?.focus();
  };

  const eliminarItem = (key) => setItems(prev => prev.filter(i => i._key !== key));

  const actualizarCantidad = (key, cantidad) => setItems(prev => prev.map(i => i._key === key ? { ...i, cantidad } : i));

  const actualizarDesc = (key, descuento_porcentaje) => setItems(prev => prev.map(i => i._key === key ? { ...i, descuento_porcentaje } : i));

  const calcularItem = (item) => {
    const descMonto = item.precio_unitario * item.cantidad * (item.descuento_porcentaje / 100);
    const totalItem = item.precio_unitario * item.cantidad - descMonto;
    const base = item.iva > 0 ? Math.round((totalItem / (1 + item.iva / 100)) * 100) / 100 : totalItem;
    const ivaMonto = item.iva > 0 ? totalItem - base : 0;
    return { descMonto: Math.round(descMonto * 100) / 100, totalItem: Math.round(totalItem * 100) / 100, base, ivaMonto };
  };

  const totales = items.reduce((acc, item) => {
    const calc = calcularItem(item);
    acc.subtotal += calc.base;
    acc.total += calc.totalItem;
    acc.descuentos += calc.descMonto;
    if (item.iva === 19) acc.iva19 += calc.ivaMonto;
    if (item.iva === 5) acc.iva5 += calc.ivaMonto;
    return acc;
  }, { subtotal: 0, iva19: 0, iva5: 0, descuentos: 0, total: 0 });

  const handleGuardar = async () => {
    if (guardando) return;
    if (!medioPago) { setToast({ mensaje: 'Selecciona un medio de pago', tipo: 'error' }); return; }
    const cantInvalida = items.find(i => i.cantidad <= 0);
    if (cantInvalida) {
      setToast({ mensaje: `"${cantInvalida.producto_nombre}" tiene cantidad inválida`, tipo: 'error' });
      return;
    }
    setGuardando(true);
    try {
      const payload = {
        tipo: 'POS',
        cliente_id: clienteActual?.id || 1,
        items: items.map((i) => ({
          producto_id: i.producto_id,
          cantidad: i.cantidad,
          precio_unitario: i.precio_unitario,
          iva: i.iva,
          descuento_porcentaje: i.descuento_porcentaje,
          observacion: i.observacion,
          presentacion_id: i.presentacion_id,
          presentacion_nombre: i.presentacion_nombre,
        })),
        medio_pago: medioPago,
        observaciones,
        es_domicilio: esDomicilio,
        ...(esDomicilio && dom),
      };

      const res = await api.post('/facturas', payload);
      const data = res.data;

      let msg = `Factura ${data.numero} creada`;
      if (data.alertas?.length > 0) {
        const nombres = data.alertas.map((a) => `${a.producto} (${a.stock})`).join(', ');
        msg += ` ⚠️ ${nombres}`;
      }
      setToast({
        mensaje: msg,
        tipo: 'success',
        accion: { label: 'Ver ticket', onClick: () => setFacturaCreada(data) },
      });

      setItems([]);
      setClienteActual(null);
      setMedioPago(null);
      setPrecioListaOverride(null);
      setEsDomicilio(false);
      setDom({ nombre: '', telefono: '', direccion: '', referencia: '' });
      setObservaciones('');

      if (temporalId) {
        api.delete(`/temporales/${temporalId}`).catch(() => {});
        setTemporalId(null);
      }

      api.get('/productos?activo=true').then((r) => setProductos(r.data)).catch((err) => console.error('Error al recargar productos:', err));
    } catch (err) {
      setToast({ mensaje: err.response?.data?.error || 'Error al crear factura', tipo: 'error' });
    } finally {
      setGuardando(false);
    }
  };

  guardarRef.current = handleGuardar;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        busquedaRef.current?.focus();
      }
      if ((e.key === 'b' || e.key === 'B') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        codigoRef.current?.focus();
      }
      if ((e.key === 'q' || e.key === 'Q') && (e.ctrlKey || e.metaKey) && items.length > 0) {
        e.preventDefault();
        setShowClearConfirm(true);
      }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && items.length > 0 && !guardando) {
        e.preventDefault();
        const sinStock = items.filter((i) => i.stock <= 0);
        if (sinStock.length > 0) {
          const nombres = sinStock.map((i) => i.producto_nombre).join(', ');
          setToast({ mensaje: `No puedes facturar productos agotados: ${nombres}`, tipo: 'error' });
          return;
        }
        guardarRef.current();
      }
      if ((e.key === 'd' || e.key === 'D') && (e.ctrlKey || e.metaKey) && items.length > 0) {
        e.preventDefault();
        const last = items[items.length - 1];
        eliminarItem(last._key);
      }
      const esInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable;
      if (e.key === '+' && !e.ctrlKey && !e.metaKey && items.length > 0 && !esInput) {
        e.preventDefault();
        const last = items[items.length - 1];
        actualizarCantidad(last._key, last.cantidad + 1);
      }
      if (e.key === '-' && !e.ctrlKey && !e.metaKey && items.length > 0 && !esInput) {
        e.preventDefault();
        const last = items[items.length - 1];
        if (last.cantidad > 1) actualizarCantidad(last._key, last.cantidad - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items]);

  const lastSaveRef = useRef('');

  useEffect(() => {
    if (pendingRestoreRef.current && clientes.length > 0) {
      const t = pendingRestoreRef.current;
      pendingRestoreRef.current = null;
      restaurarTemporal(t);
    }
  }, [clientes]);

  useEffect(() => {
    temporalDataRef.current = { items, clienteActual, medioPago, observaciones, esDomicilio, dom, precioListaOverride, listaPrecio };
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const ref = temporalDataRef.current;
      if (ref.items.length === 0 && !ref.clienteActual && !ref.medioPago) return;
      const datos = {
        items: ref.items,
        cliente_id: ref.clienteActual?.id,
        cliente_nombre: ref.clienteActual?.nombre,
        medioPago: ref.medioPago,
        observaciones: ref.observaciones,
        esDomicilio: ref.esDomicilio,
        dom: ref.dom,
        precioListaOverride: ref.precioListaOverride,
        listaPrecio: ref.listaPrecio,
      };
      const serialized = JSON.stringify(datos);
      if (serialized === lastSaveRef.current) return;
      lastSaveRef.current = serialized;
      api.post('/temporales', { datos }).then((res) => {
        setTemporalId(res.data.id);
      }).catch(() => {});
    }, 30000);

    const handleBeforeUnload = () => {
      const ref = temporalDataRef.current;
      if (ref.items.length === 0 && !ref.clienteActual && !ref.medioPago) return;
      const token = localStorage.getItem('tiksa_token');
      const baseUrl = import.meta.env.VITE_API_URL || '/api';
      const datos = {
        items: ref.items,
        cliente_id: ref.clienteActual?.id,
        cliente_nombre: ref.clienteActual?.nombre,
        medioPago: ref.medioPago,
        observaciones: ref.observaciones,
        esDomicilio: ref.esDomicilio,
        dom: ref.dom,
        precioListaOverride: ref.precioListaOverride,
        listaPrecio: ref.listaPrecio,
      };
      const serialized = JSON.stringify(datos);
      if (serialized === lastSaveRef.current) return;
      fetch(`${baseUrl}/temporales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ datos }),
        keepalive: true,
      });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const restaurarTemporal = (t) => {
    const d = t.datos;
    setItems(d.items || []);
    if (d.cliente_id) {
      const cliente = clientes.find(c => c.id === d.cliente_id);
      if (cliente) setClienteActual(cliente);
    }
    setMedioPago(d.medioPago || null);
    setObservaciones(d.observaciones || '');
    setEsDomicilio(d.esDomicilio || false);
    if (d.dom) setDom(d.dom);
    if (d.precioListaOverride !== undefined) setPrecioListaOverride(d.precioListaOverride);
    setTemporalPendiente(null);
    setShowTemporalModal(false);
    setToast({ mensaje: 'Factura temporal restaurada', tipo: 'success' });
  };

  const descartarTemporal = () => {
    const id = temporalPendiente?.id;
    if (id) {
      api.delete(`/temporales/${id}`).catch(() => {});
    }
    setTemporalPendiente(null);
    setTemporalId(null);
    setShowTemporalModal(false);
  };

  const imprimirTicket = () => {
    const f = facturaCreada;
    if (!f) return;
    const html = `<!DOCTYPE html><html><head><title>Factura ${f.numero}</title>
      <style>
        body { font-family: monospace; font-size: 12px; margin: 20px; width: 280px; }
        h2 { text-align: center; margin-bottom: 4px; }
        .center { text-align: center; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { padding: 3px 4px; text-align: left; }
        th { border-bottom: 1px solid #000; }
        .right { text-align: right; }
        .total { font-size: 14px; font-weight: bold; text-align: right; margin-top: 8px; }
        hr { border: none; border-top: 1px dashed #999; margin: 8px 0; }
      </style></head><body>
      <h2>TIKSA</h2>
      <p class="center" style="font-size:10px">NIT: 000.000.000-0</p>
      <p class="center" style="font-size:11px"><b>Factura:</b> ${f.numero}</p>
      <p style="font-size:10px">${new Date(f.fecha + 'Z').toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</p>
      <hr/>
      <table>
        <tr><th>Producto</th><th class="right">Cant</th><th class="right">$</th></tr>
        ${f.items.map(i => `<tr><td>${i.nombre_mostrar}${i.observacion ? '<br/><small>' + i.observacion + '</small>' : ''}</td><td class="right">${i.cantidad}</td><td class="right">${formatCOP(i.total)}</td></tr>`).join('')}
      </table>
      <hr/>
      <p style="font-size:11px">Subtotal: <span class="right" style="float:right">${formatCOP(f.subtotal)}</span></p>
      ${f.iva_19 > 0 ? `<p style="font-size:11px">IVA 19%: <span class="right" style="float:right">${formatCOP(f.iva_19)}</span></p>` : ''}
      ${f.iva_5 > 0 ? `<p style="font-size:11px">IVA 5%: <span class="right" style="float:right">${formatCOP(f.iva_5)}</span></p>` : ''}
      ${f.descuento > 0 ? `<p style="font-size:11px">Descuento: <span class="right" style="float:right">-${formatCOP(f.descuento)}</span></p>` : ''}
      <p class="total">Total: ${formatCOP(f.total)}</p>
      <hr/>
      <p style="font-size:10px">Medio de pago: ${f.medio_pago}</p>
      <p style="font-size:10px;word-break:break-all">CUFE: ${f.cufe}</p>
      <script>window.print();window.close();<\/script>
    </body></html>`;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
  };

  return (
    <div className="flex flex-col h-full">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="p-3 bg-white border-b border-border">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[220px] relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              ref={busquedaRef}
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex((prev) => Math.min(prev + 1, resultados.length - 1)); }
                if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex((prev) => Math.max(prev - 1, 0)); }
                if (e.key === 'Enter' && busqueda.trim() === '-1' && items.length > 0) { e.preventDefault(); eliminarItem(items[items.length - 1]._key); setBusqueda(''); return; }
                if (e.key === 'Enter' && resultados.length > 0) {
                  e.preventDefault();
                  const selec = resultados.filter(p => seleccionados.has(p.id));
                  if (selec.length > 0) {
                    agregarMultiples(selec);
                  } else {
                    const prod = resultados[selectedIndex] || resultados[0];
                    if (prod) seleccionarProducto(prod);
                  }
                }
              }}
              placeholder="Buscar producto (Ctrl+K)..."
              className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border-2 border-gray-100 rounded-xl focus:bg-white focus:border-primary focus:outline-none text-sm transition-all"
            />
            {busqueda && (
              <button onClick={() => { setBusqueda(''); setResultados([]); busquedaRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                <X size={16} />
              </button>
            )}
            {resultados.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-border rounded-xl shadow-xl mt-1.5 z-10 max-h-72 overflow-y-auto">
                {resultados.map((p, i) => {
                  const { base, unidad } = extraerUnidad(p.nombre);
                  return (
                  <button
                    key={p.id}
                    onClick={() => seleccionarProducto(p)}
                    onMouseEnter={() => setSelectedIndex(i)}
                    className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between text-sm border-b border-border/30 last:border-0 ${i === selectedIndex ? 'bg-primary/10' : 'hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {seleccionados.has(p.id) ? <CheckSquare size={16} className="text-primary shrink-0" /> : <Square size={16} className="text-gray-400 shrink-0" />}
                      <div>
                        <span className="font-medium text-gray-800">{base}</span>
                        {(unidad || p.codigo_interno) && (
                          <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
                            {unidad && <span>{unidad}</span>}
                            {p.codigo_interno && <span>#{p.codigo_interno}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StockBadge stock={p.stock} minimo={p.stock_minimo} />
                      <span className="font-mono text-primary font-semibold text-sm">
                        {formatCOP(getPrecio(p, listaPrecio))}
                      </span>
                    </div>
                  </button>
                );})}
              </div>
            )}
            {busqueda.length >= 2 && resultados.length === 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-border rounded-xl shadow-xl mt-1.5 z-10 p-4 text-center text-sm text-gray-400">
                No se encontraron productos
              </div>
            )}
          </div>

          <div className="relative w-36 shrink-0">
            <Barcode size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={codigoRef}
              type="text"
              value={codigoBarras}
              onChange={(e) => setCodigoBarras(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && codigoBarras.length >= 2) {
                  e.preventDefault();
                  try {
                    const res = await api.get(`/productos/buscar-codigo?codigo=${encodeURIComponent(codigoBarras)}`);
                    if (res.data.tipo === 'presentacion') {
                      const pd = res.data.data;
                      const prod = productos.find((p) => p.id === pd.producto_id);
                      if (prod) {
                        agregarAlCarrito(prod, pd);
                        setCodigoBarras('');
                      }
                    } else if (res.data.tipo === 'producto') {
                      agregarAlCarrito(res.data.data, null);
                      setCodigoBarras('');
                    }
                  } catch (err) {
                    setToast({ mensaje: 'Código no encontrado', tipo: 'error' });
                  }
                }
              }}
              placeholder="Código barras"
              className="w-full pl-8 pr-3 py-2.5 bg-gray-50 border-2 border-gray-100 rounded-xl focus:bg-white focus:border-primary focus:outline-none text-sm transition-all"
            />
          </div>

          <button
            onClick={() => setShowClienteModal(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm font-medium text-gray-700 hover:bg-white hover:border-gray-200 transition-all whitespace-nowrap"
          >
            <User size={16} className="text-gray-400" />
            <span className="max-w-[120px] truncate">{clienteActual?.nombre || 'Cliente'}</span>
            {clienteActual?.saldo_pendiente > 0 && (
              <span className="text-[10px] font-medium bg-red/10 text-red px-1.5 py-0.5 rounded-full">{formatCOP(clienteActual.saldo_pendiente)}</span>
            )}
          </button>

          <div className="flex items-center gap-1.5">
            <Tag size={15} className="text-gray-400" />
            <select
              value={listaPrecio}
              onChange={(e) => setPrecioListaOverride(parseInt(e.target.value))}
              className="bg-gray-50 border-2 border-gray-100 rounded-xl text-sm py-2.5 px-2.5 focus:outline-none focus:border-primary transition-all"
            >
              <option value={1}>Lista 1</option>
              <option value={2}>Lista 2</option>
              <option value={3}>Lista 3</option>
              <option value={4}>Lista 4</option>
            </select>
          </div>

          <button
            onClick={() => setShowNcModal(true)}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm text-red hover:bg-red/5 hover:border-red/30 transition-all"
            title="Nota Crédito"
          >
            <FileText size={15} />
            <span className="hidden sm:inline font-medium">NC</span>
          </button>

          <label className={`flex items-center gap-2 px-3 py-2.5 border-2 rounded-xl text-sm cursor-pointer transition-all select-none ${esDomicilio ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-white hover:border-gray-200'}`}>
            <input type="checkbox" checked={esDomicilio}
              onChange={(e) => setEsDomicilio(e.target.checked)} className="sr-only" />
            <Truck size={16} />
            <span className="font-medium">Domicilio</span>
          </label>
        </div>

        {esDomicilio && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-3">
            <input type="text" placeholder="Nombre destinatario" value={dom.nombre}
              onChange={(e) => setDom({ ...dom, nombre: e.target.value })} className="input-field text-sm py-2" />
            <input type="text" placeholder="Teléfono" value={dom.telefono}
              onChange={(e) => setDom({ ...dom, telefono: e.target.value })} className="input-field text-sm py-2" />
            <input type="text" placeholder="Dirección (Cra, Cll, Tv...)" value={dom.direccion}
              onChange={(e) => setDom({ ...dom, direccion: e.target.value })} className="input-field text-sm py-2" />
            <input type="text" placeholder="Referencia" value={dom.referencia}
              onChange={(e) => setDom({ ...dom, referencia: e.target.value })} className="input-field text-sm py-2" />
          </div>
        )}
      </div>

      <div className="px-4 pb-1.5 flex gap-3 text-[10px] text-gray-400 border-b border-border/50 select-none overflow-x-auto">
        <span><kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-500 font-medium">Ctrl+K</kbd> Buscar</span>
        <span><kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-500 font-medium">Ctrl+B</kbd> Barras</span>
        <span><kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-500 font-medium">Ctrl+Enter</kbd> Facturar</span>
        <span><kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-500 font-medium">↑</kbd><kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-500 font-medium ml-0.5">↓</kbd> Navegar</span>
        <span><kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-500 font-medium">Espacio</kbd> Marcar</span>
        <span><kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-500 font-medium">+</kbd>/<kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-500 font-medium">-</kbd> Cant</span>
        <span><kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-500 font-medium">Ctrl+D</kbd> Eliminar</span>
        <span><kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-500 font-medium">Ctrl+Q</kbd> Limpiar</span>
      </div>

      <div className="flex-1 overflow-auto p-3">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-border text-xs uppercase tracking-wide">
              <th className="pb-2.5 w-8 font-medium">#</th>
              <th className="pb-2.5 font-medium">Producto</th>
              <th className="pb-2.5 text-center w-16 font-medium">Stock</th>
              <th className="pb-2.5 text-right font-medium">Precio</th>
              <th className="pb-2.5 text-center w-14 font-medium">IVA</th>
              <th className="pb-2.5 text-center w-20 font-medium">Cant</th>
              <th className="pb-2.5 text-center w-20 font-medium">Desc%</th>
              <th className="pb-2.5 text-right font-medium">Total</th>
              <th className="pb-2.5 text-center w-20 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const calc = calcularItem(item);
              return (
                <tr key={item._key} className="border-b border-border/30 hover:bg-primary/5 transition-colors">
                  <td className="py-2 text-gray-400">{idx + 1}</td>
                  <td className="py-2">
                    <div className="font-medium text-gray-800 leading-tight text-sm truncate max-w-[200px]">
                      {item.producto_nombre}
                      {item.presentacion_nombre && <span className="text-xs text-gray-400 ml-1">({item.presentacion_nombre})</span>}
                    </div>
                    {item.observacion && (
                      <div className="text-xs text-gray-400 italic leading-tight mt-0.5">
                        └ {item.observacion}
                      </div>
                    )}
                  </td>
                  <td className="py-2 text-center">
                    <StockBadge stock={item.stock} minimo={item.stock_minimo} />
                  </td>
                  <td className="py-2 text-right font-mono text-gray-700">{formatCOP(item.precio_unitario)}</td>
                  <td className={`py-2 text-center text-xs font-medium ${item.iva === 19 ? 'text-primary' : item.iva === 5 ? 'text-green' : item.iva === -1 ? 'text-red' : 'text-gray-400'}`}>
                    {item.iva === -1 ? 'Excluido' : item.iva === 0 ? '0%' : `${item.iva}%`}
                  </td>
                  <td className="py-2">
                    <input
                      type="number"
                      value={item.cantidad}
                      onChange={(e) => actualizarCantidad(item._key, parseFloat(e.target.value) || 0)}
                       className="w-16 text-center bg-gray-50 border border-gray-200 rounded-lg text-sm py-1.5 focus:outline-none focus:border-primary focus:bg-white transition-all"
                      min="0"
                      step="any"
                    />
                  </td>
                  <td className="py-2">
                    <input
                      type="number"
                      value={item.descuento_porcentaje}
                      onChange={(e) => puedeDescontar ? actualizarDesc(item._key, Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))) : null}
                       className={`w-16 text-center bg-gray-50 border border-gray-200 rounded-lg text-sm py-1.5 focus:outline-none focus:border-primary transition-all ${puedeDescontar ? '' : 'opacity-50 cursor-not-allowed'}`}
                      min="0"
                      max="100"
                      step="1"
                      disabled={!puedeDescontar}
                    />
                  </td>
                  <td className="py-2 text-right font-mono font-semibold text-gray-800">{formatCOP(calc.totalItem)}</td>
                  <td className="py-2">
                    <div className="flex items-center justify-end gap-1">
                      <div className="relative">
                        <button
                          onClick={() => setObsPopover(obsPopover === item._key ? null : item._key)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            item.observacion
                              ? 'text-primary bg-primary/10'
                              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                          }`}
                          title="Observación"
                        >
                          <MessageSquare size={15} />
                        </button>
                        {obsPopover === item._key && (
                          <div ref={popoverRef} className="absolute right-0 top-full mt-1 z-20 bg-white border border-border rounded-xl shadow-xl p-2.5 w-60">
                            <textarea
                              value={item.observacion}
                              onChange={(e) => setItems(items.map((i) =>
                                i._key === item._key ? { ...i, observacion: e.target.value } : i
                              ))}
                              className="input-field text-xs w-full resize-none"
                              rows="2"
                              placeholder="Ej: color rojo, sabor menta..."
                              autoFocus
                            />
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => eliminarItem(item._key)}
                        className="p-1.5 rounded-lg text-red hover:bg-red/10 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan="9" className="text-center py-16 text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <ShoppingCart size={40} className="text-gray-200" />
                    <p className="text-sm">Agrega productos usando el buscador</p>
                    <p className="text-xs text-gray-300"><kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">Ctrl+K</kbd> para enfocar el buscador</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white border-t border-border p-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1.5 w-full lg:w-auto">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
              <span>Subtotal: <span className="font-mono text-gray-700 font-medium">{formatCOP(totales.subtotal)}</span></span>
              <span>IVA 19%: <span className="font-mono text-gray-700 font-medium">{formatCOP(totales.iva19)}</span></span>
              <span>IVA 5%: <span className="font-mono text-gray-700 font-medium">{formatCOP(totales.iva5)}</span></span>
              <span>Desc: <span className="font-mono text-gray-700 font-medium">{formatCOP(totales.descuentos)}</span></span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-2xl lg:text-3xl font-bold font-mono text-primary">
                Total: {formatCOP(totales.total)}
              </div>
              {items.length > 0 && (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="text-gray-400 hover:text-red transition-colors p-1.5 rounded-lg hover:bg-red/5"
                  title="Limpiar carrito"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className="input-field text-xs w-full max-w-sm resize-none py-1.5"
              rows="1"
              placeholder="Observaciones..."
            />
          </div>

          <div className="flex flex-col items-stretch lg:items-end gap-3 w-full lg:w-auto">
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
              {MEDIOS_PAGO.map((mp) => {
                const Icon = PAGO_ICONS[mp.value] || CreditCard;
                const activo = medioPago === mp.value;
                return (
                  <button
                    key={mp.value}
                    onClick={() => setMedioPago(mp.value)}
                    className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border-2 text-[11px] font-medium transition-all ${
                      activo
                        ? PAGO_STYLES[mp.value]
                        : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-white hover:border-gray-200'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{mp.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const sinStock = items.filter((i) => i.stock <= 0);
                  if (sinStock.length > 0) {
                    const nombres = sinStock.map((i) => i.producto_nombre).join(', ');
                    setToast({ mensaje: `No puedes facturar productos agotados: ${nombres}`, tipo: 'error' });
                    return;
                  }
                  handleGuardar();
                }}
                disabled={items.length === 0 || guardando || !medioPago}
                className="btn-primary px-8 py-3 disabled:opacity-40 flex items-center gap-2.5 text-base rounded-xl shadow-sm hover:shadow-md transition-all"
              >
                <CreditCard size={20} />
                <span className="font-semibold">{guardando ? 'Facturando...' : `Facturar (${items.length})`}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {showClearConfirm && (
        <Modal titulo="Limpiar carrito" onClose={() => setShowClearConfirm(false)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">¿Estás seguro? Se perderán todos los items del carrito.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowClearConfirm(false)} className="btn-secondary">Cancelar</button>
              <button onClick={() => { setItems([]); setShowClearConfirm(false); }} className="btn-danger flex items-center gap-2">
                <Trash2 size={16} /> Limpiar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showTemporalModal && temporalPendiente && (
        <Modal titulo="Factura temporal encontrada" onClose={() => setShowTemporalModal(false)}>
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-yellow-700 bg-yellow/10 border border-yellow/30 rounded-lg p-3">
              <FileText size={24} className="shrink-0 text-yellow-600" />
              <div className="text-sm">
                <p className="font-medium">Tienes una factura sin terminar</p>
                <p className="text-yellow-600 mt-0.5">
                  {new Date(temporalPendiente.creado_en).toLocaleString('es-CO', {
                    day: 'numeric', month: 'long', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </div>
            </div>

            <div className="text-sm text-gray-600 space-y-1">
              <p><span className="font-medium text-gray-800">{temporalPendiente.datos.items?.length || 0}</span> producto(s) en el carrito</p>
              {temporalPendiente.datos.cliente_nombre && (
                <p>Cliente: <span className="font-medium">{temporalPendiente.datos.cliente_nombre}</span></p>
              )}
              {temporalPendiente.datos.medioPago && (
                <p>Medio de pago: <span className="font-medium capitalize">{temporalPendiente.datos.medioPago}</span></p>
              )}
            </div>

            <div className="flex gap-3 justify-end pt-2 border-t border-border">
              <button onClick={descartarTemporal} className="btn-secondary">Descartar</button>
              <button onClick={() => restaurarTemporal(temporalPendiente)} className="btn-primary flex items-center gap-2">
                <FileText size={16} /> Restaurar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showPresModal && presParaProducto && (
        <Modal titulo={`Elige presentación — ${presParaProducto.nombre}`} onClose={() => { setShowPresModal(false); setPresParaProducto(null); }}>
          <div className="space-y-2">
            {presentaciones.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  agregarAlCarrito(presParaProducto, p);
                  setShowPresModal(false);
                  setPresParaProducto(null);
                }}
                className="w-full text-left px-4 py-3.5 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-gray-800">{p.nombre}</p>
                  {p.codigo_barras && <p className="text-xs text-gray-400 font-mono">{p.codigo_barras}</p>}
                </div>
                <div className="text-right">
                  <p className="font-mono text-primary font-semibold">{formatCOP(getPrecio(p, listaPrecio))}</p>
                  <p className="text-xs text-gray-400">Factor: {p.factor}</p>
                </div>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {showClienteModal && (
        <Modal titulo="Cliente" onClose={() => { setShowClienteModal(false); setShowCrearCliente(false); }}>
          <div className="flex gap-2 mb-3 border-b border-border">
            <button
              onClick={() => setShowCrearCliente(false)}
              className={`pb-2.5 px-3 text-sm font-medium transition-colors ${!showCrearCliente ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-600'}`}
            >Buscar</button>
            <button
              onClick={() => setShowCrearCliente(true)}
              className={`pb-2.5 px-3 text-sm font-medium transition-colors ${showCrearCliente ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-600'}`}
            >Crear nuevo</button>
          </div>

          {showCrearCliente ? (
            <div className="space-y-3">
              <input type="text" placeholder="Nombre *" value={clienteForm.nombre}
                onChange={(e) => setClienteForm({ ...clienteForm, nombre: e.target.value })}
                className="input-field text-sm" autoFocus />
              <input type="text" placeholder="NIT *" value={clienteForm.nit}
                onChange={(e) => setClienteForm({ ...clienteForm, nit: e.target.value })}
                className="input-field text-sm" />
              <input type="text" placeholder="Teléfono" value={clienteForm.telefono}
                onChange={(e) => setClienteForm({ ...clienteForm, telefono: e.target.value })}
                className="input-field text-sm" />
              <input type="text" placeholder="Dirección" value={clienteForm.direccion}
                onChange={(e) => setClienteForm({ ...clienteForm, direccion: e.target.value })}
                className="input-field text-sm" />
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Lista precio</label>
                  <select value={clienteForm.lista_precio}
                    onChange={(e) => setClienteForm({ ...clienteForm, lista_precio: parseInt(e.target.value) })}
                    className="input-field text-sm">
                    <option value={1}>Consumo</option>
                    <option value={2}>Reventa</option>
                    <option value={3}>Trabajadores</option>
                    <option value={4}>Misma empresa</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Límite crédito</label>
                  <input type="number" placeholder="0" value={clienteForm.limite_credito}
                    onChange={(e) => setClienteForm({ ...clienteForm, limite_credito: parseFloat(e.target.value) || 0 })}
                    className="input-field text-sm" />
                </div>
              </div>
              <button
                onClick={async () => {
                  if (!clienteForm.nombre || !clienteForm.nit) {
                    setToast({ mensaje: 'Nombre y NIT son requeridos', tipo: 'error' });
                    return;
                  }
                  setCreandoCliente(true);
                  try {
                    const res = await api.post('/clientes', clienteForm);
                    setClienteActual(res.data);
                    setClientes([...clientes, res.data]);
                    setPrecioListaOverride(null);
                    setShowClienteModal(false);
                    setShowCrearCliente(false);
                    setClienteForm({ nombre: '', nit: '', telefono: '', direccion: '', limite_credito: 0, lista_precio: 1 });
                    setToast({ mensaje: `Cliente creado: ${res.data.nombre}`, tipo: 'success' });
                  } catch (err) {
                    setToast({ mensaje: err.response?.data?.error || 'Error al crear cliente', tipo: 'error' });
                  }
                  setCreandoCliente(false);
                }}
                disabled={creandoCliente}
                className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
              >
                <Plus size={16} /> {creandoCliente ? 'Creando...' : 'Crear cliente'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                value={busquedaCliente}
                onChange={(e) => setBusquedaCliente(e.target.value)}
                placeholder="Buscar cliente por nombre o NIT..."
                className="input-field"
                autoFocus
              />
              <div className="max-h-60 overflow-y-auto space-y-1">
                {clientes
                  .filter((c) => !busquedaCliente || c.nombre.toLowerCase().includes(busquedaCliente.toLowerCase()) || c.nit.includes(busquedaCliente))
                  .map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setClienteActual(c);
                        setPrecioListaOverride(null);
                        setShowClienteModal(false);
                        setBusquedaCliente('');
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-sm hover:bg-gray-50 flex items-center justify-between ${
                          clienteActual?.id === c.id ? 'bg-primary/10 border border-primary/30' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium truncate text-gray-800">{c.nombre}</span>
                        {c.saldo_pendiente > 0 && (
                          <span className="text-xs bg-red/10 text-red px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap">
                            {formatCOP(c.saldo_pendiente)}
                          </span>
                        )}
                        {c.limite_credito > 0 && !c.saldo_pendiente && (
                          <span className="text-xs text-gray-400">Límite: {formatCOP(c.limite_credito)}</span>
                        )}
                      </div>
                      <span className="text-gray-400 shrink-0 text-xs">{c.nit}</span>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </Modal>
      )}

      {facturaCreada && (
        <Modal titulo={`Factura ${facturaCreada.numero}`} onClose={() => setFacturaCreada(null)} ancho="max-w-lg">
          <div className="space-y-4">
            <div className="text-center border-b border-border pb-4">
              <p className="text-3xl font-bold font-mono text-primary">{formatCOP(facturaCreada.total)}</p>
              <p className="text-sm text-gray-500 capitalize">{facturaCreada.medio_pago}</p>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-border text-xs uppercase tracking-wide">
                  <th className="pb-1.5 font-medium">Producto</th>
                  <th className="pb-1.5 text-center font-medium">Cant</th>
                  <th className="pb-1.5 text-right font-medium">Precio</th>
                  <th className="pb-1.5 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {facturaCreada.items?.map((item) => (
                  <tr key={item.id} className="border-b border-border/30">
                    <td className="py-1.5 text-gray-800">{item.nombre_mostrar}</td>
                    <td className="py-1.5 text-center font-mono text-gray-700">{item.cantidad}</td>
                    <td className="py-1.5 text-right font-mono text-gray-700">{formatCOP(item.precio_unitario)}</td>
                    <td className="py-1.5 text-right font-mono font-semibold text-gray-800">{formatCOP(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="text-sm space-y-1 pt-2 border-t border-border">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-mono text-gray-700">{formatCOP(facturaCreada.subtotal)}</span>
              </div>
              {facturaCreada.iva_19 > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">IVA 19%</span>
                  <span className="font-mono text-gray-700">{formatCOP(facturaCreada.iva_19)}</span>
                </div>
              )}
              {facturaCreada.iva_5 > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">IVA 5%</span>
                  <span className="font-mono text-gray-700">{formatCOP(facturaCreada.iva_5)}</span>
                </div>
              )}
              {facturaCreada.descuento > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Descuento</span>
                  <span className="font-mono text-red">-{formatCOP(facturaCreada.descuento)}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setFacturaCreada(null)} className="btn-secondary">Cerrar</button>
              <button onClick={imprimirTicket} className="btn-primary flex items-center gap-2">
                <Printer size={16} /> Imprimir
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showNcModal && (
        <NotaCreditoModal
          onClose={() => setShowNcModal(false)}
          onCreada={() => {
            setShowNcModal(false);
            api.get('/productos?activo=true').then((r) => setProductos(r.data)).catch(() => {});
          }}
        />
      )}
    </div>
  );
}

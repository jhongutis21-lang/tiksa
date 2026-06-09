import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Ban, Printer, FileText, Trash2, Download, ChevronLeft, ChevronRight, ArrowUpDown, Search } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import api from '../services/api';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { hoyColombia, mesPasadoColombia, inicioMesColombia, formatCOP, MEDIOS_PAGO, estadoBadgeClass, inicioSemanaColombia, MEDIOS_PAGO_COLOR, MAPA_MEDIOS } from '../utils/colombia';

const mapearItems = (det) =>
  det.data.items.map((i) => ({
    _key: `prod-${i.producto_id}`,
    producto_id: i.producto_id,
    producto_nombre: i.producto_nombre,
    presentacion_id: i.presentacion_id || null,
    presentacion_nombre: i.presentacion_nombre || null,
    stock: i.stock || 0,
    precio_unitario: i.precio_unitario,
    iva: i.iva_porcentaje,
    cantidad: i.cantidad,
    descuento_porcentaje: i.descuento_porcentaje || 0,
    observacion: i.observacion || '',
  }));

const generarPDFHtml = (d) => `
  <html><head><title>Factura ${d.factura.numero}</title>
  <style>
    body { font-family: monospace; font-size: 12px; margin: 20px; }
    h2 { text-align: center; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { border-bottom: 1px solid #ccc; padding: 4px; text-align: left; }
    .right { text-align: right; }
    .total { font-size: 16px; font-weight: bold; margin-top: 10px; text-align: right; }
    @media print { body { margin: 0; } }
  </style></head><body>
  <h2>TIKSA</h2>
  <p>NIT: 000.000.000-0</p>
  <p><b>Factura:</b> ${d.factura.numero}</p>
  <p><b>Cliente:</b> ${d.factura.cliente_nombre} (${d.factura.cliente_nit || 'N/A'})</p>
  <p><b>Fecha:</b> ${new Date(d.factura.fecha).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</p>
  <p><b>Atendido por:</b> ${d.factura.usuario_nombre}</p>
  <table>
    <tr><th>Producto</th><th class="right">Cant</th><th class="right">Precio</th><th class="right">Total</th></tr>
    ${d.items.map((i) => `<tr><td>${i.producto_nombre}${i.presentacion_nombre ? ' (' + i.presentacion_nombre + ')' : ''}${i.observacion ? '<br/><small>' + i.observacion + '</small>' : ''}</td><td class="right">${i.cantidad}</td><td class="right">${formatCOP(i.precio_unitario)}</td><td class="right">${formatCOP(i.total)}</td></tr>`).join('')}
  </table>
  <p>Subtotal: ${formatCOP(d.factura.subtotal)}</p>
  <p>IVA 19%: ${formatCOP(d.factura.iva_19)}</p>
  <p>IVA 5%: ${formatCOP(d.factura.iva_5)}</p>
  <p>Descuento: ${formatCOP(d.factura.descuento)}</p>
  <p class="total">Total: ${formatCOP(d.factura.total)}</p>
  <p><small>Medio de pago: ${d.factura.medio_pago}</small></p>
  <p><small>CUFE: ${d.factura.cufe}</small></p>
  <script>window.print();</script>
</body></html>`;

export default function Historial() {
  const navigate = useNavigate();
  const { usuario, tienePermiso } = useAuth();
  const [facturas, setFacturas] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showDetalle, setShowDetalle] = useState(false);
  const [toast, setToast] = useState(null);
  const [showMotivoModal, setShowMotivoModal] = useState(false);
  const [motivoFactura, setMotivoFactura] = useState(null);
  const [accionMotivo, setAccionMotivo] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [desde, setDesde] = useState(mesPasadoColombia());
  const [hasta, setHasta] = useState(hoyColombia());
  const [filtroMedioPago, setFiltroMedioPago] = useState('');
  const [filtroUsuarioId, setFiltroUsuarioId] = useState('');
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [orden, setOrden] = useState('desc');
  const [paginaInput, setPaginaInput] = useState('');
  const [paginaError, setPaginaError] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [presetActivo, setPresetActivo] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');

  const adminOrEncargado = usuario?.rol === 'admin' || usuario?.rol === 'encargado';

  useEffect(() => {
    if (adminOrEncargado) {
      api.get('/usuarios').then((res) => setUsuarios(res.data)).catch(() => {});
    }
  }, []);

  useEffect(() => { cargar(); }, [page, desde, hasta, filtroMedioPago, filtroUsuarioId, orden, busqueda]);

  const cargar = async () => {
    setCargando(true);
    try {
      const params = new URLSearchParams({ page, limit: 50 });
      if (desde) params.append('desde', desde);
      if (hasta) params.append('hasta', hasta);
      if (filtroMedioPago) params.append('medio_pago', filtroMedioPago);
      if (filtroUsuarioId) params.append('usuario_id', filtroUsuarioId);
      if (busqueda) params.append('busqueda', busqueda);
      params.append('orden', orden);
      const res = await api.get(`/facturas?${params}`);
      setFacturas(res.data.data);
      setTotalPages(res.data.paginas);
      setTotal(res.data.total);
    } catch {
      setToast({ mensaje: 'Error al cargar historial', tipo: 'error' });
    } finally {
      setCargando(false);
    }
  };

  const verDetalle = async (id) => {
    try {
      const res = await api.get(`/facturas/${id}`);
      setSelected(res.data);
      setShowDetalle(true);
    } catch {
      setToast({ mensaje: 'Error al cargar factura', tipo: 'error' });
    }
  };

  const abrirAnular = (f) => {
    setMotivoFactura(f);
    setAccionMotivo('anular');
    setMotivo('');
    setShowMotivoModal(true);
  };

  const abrirAnularYCopiar = (f) => {
    setMotivoFactura(f);
    setAccionMotivo('anularYCopiar');
    setMotivo('');
    setShowMotivoModal(true);
  };

  const [eliminarModal, setEliminarModal] = useState(null);

  const eliminar = async (f) => {
    try {
      await api.delete(`/facturas/${f.id}`);
      setToast({ mensaje: `Factura ${f.numero} eliminada`, tipo: 'success' });
      setEliminarModal(null);
      cargar();
    } catch (err) {
      setToast({ mensaje: err.response?.data?.error || 'Error al eliminar', tipo: 'error' });
      setEliminarModal(null);
    }
  };

  const confirmarMotivo = async () => {
    const f = motivoFactura;
    if (!f || !motivo.trim()) {
      setToast({ mensaje: 'Agrega un motivo de anulación', tipo: 'error' });
      return;
    }
    try {
      await api.patch(`/facturas/${f.id}/anular`, { motivo });
      if (accionMotivo === 'anular') {
        setToast({ mensaje: `Factura ${f.numero} anulada`, tipo: 'success' });
        cargar();
      } else {
        const det = await api.get(`/facturas/${f.id}`);
        const items = mapearItems(det);
        localStorage.setItem('tiksa_copiar_items', JSON.stringify(items));
        navigate('/pos');
      }
      setShowMotivoModal(false);
    } catch (err) {
      setShowMotivoModal(false);
      const msg = err.response?.data?.error || err.message || 'Error';
      setToast({ mensaje: msg, tipo: 'error' });
    }
  };

  const verPreview = async (f) => {
    try {
      const res = await api.get(`/facturas/${f.id}/pdf`);
      setPreviewHtml(generarPDFHtml(res.data));
      setShowPreview(true);
    } catch {
      setToast({ mensaje: 'Error al cargar factura', tipo: 'error' });
    }
  };

  const imprimirPreview = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(previewHtml);
    win.document.close();
  };

  const handleExportar = async () => {
    setExportando(true);
    try {
      const params = new URLSearchParams();
      if (desde) params.append('desde', desde);
      if (hasta) params.append('hasta', hasta);
      if (filtroMedioPago) params.append('medio_pago', filtroMedioPago);
      if (filtroUsuarioId) params.append('usuario_id', filtroUsuarioId);
      const res = await api.get(`/facturas/exportar?${params}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `historial_${desde || 'todo'}_${hasta || 'todo'}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      setToast({ mensaje: 'Error al exportar', tipo: 'error' });
    } finally {
      setExportando(false);
    }
  };

  const irPagina = (p) => {
    if (p >= 1 && p <= totalPages) setPage(p);
  };

  const irAPaginaInput = () => {
    const p = parseInt(paginaInput);
    if (p >= 1 && p <= totalPages) {
      setPage(p);
      setPaginaInput('');
      setPaginaError(false);
    } else if (paginaInput) {
      setPaginaError(true);
      setTimeout(() => setPaginaError(false), 1200);
    }
  };

  const renderPaginacion = () => {
    if (totalPages <= 1) return null;
    const mostrar = 5;
    let inicio = Math.max(1, page - Math.floor(mostrar / 2));
    let fin = Math.min(totalPages, inicio + mostrar - 1);
    if (fin - inicio + 1 < mostrar) inicio = Math.max(1, fin - mostrar + 1);
    const paginas = [];
    for (let i = inicio; i <= fin; i++) paginas.push(i);
    const mostrarPrimera = inicio > 1;
    const mostrarUltima = fin < totalPages;
    return (
      <div className="flex items-center justify-center gap-1 mt-4">
        <button onClick={() => irPagina(page - 1)} disabled={page <= 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronLeft size={18} />
        </button>
        {mostrarPrimera && (
          <>
            <button onClick={() => irPagina(1)} className={`px-3 py-1 rounded text-sm font-medium ${page === 1 ? 'bg-blue text-white' : 'hover:bg-gray-100 text-gray-700'}`}>1</button>
            <span className="text-gray-400 text-sm select-none">...</span>
          </>
        )}
        {paginas.map((p) => (
          <button key={p} onClick={() => irPagina(p)} className={`px-3 py-1 rounded text-sm font-medium ${p === page ? 'bg-blue text-white' : 'hover:bg-gray-100 text-gray-700'}`}>{p}</button>
        ))}
        {mostrarUltima && (
          <>
            <span className="text-gray-400 text-sm select-none">...</span>
            <button onClick={() => irPagina(totalPages)} className={`px-3 py-1 rounded text-sm font-medium ${page === totalPages ? 'bg-blue text-white' : 'hover:bg-gray-100 text-gray-700'}`}>{totalPages}</button>
          </>
        )}
        <button onClick={() => irPagina(page + 1)} disabled={page >= totalPages} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronRight size={18} />
        </button>
        <div className="flex items-center gap-1 ml-3 border-l border-border pl-3">
          <input
            value={paginaInput}
            onChange={(e) => setPaginaInput(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => { if (e.key === 'Enter') irAPaginaInput(); }}
            placeholder="#"
            className={`w-12 text-center text-sm py-1 font-mono input-field ${paginaError ? 'border-red text-red' : ''}`}
          />
          <button onClick={irAPaginaInput} disabled={!paginaInput} className="px-2 py-1 rounded text-xs font-medium bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">Ir</button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-800">Historial de ventas</h2>
          <div className="flex items-center gap-1">
            {[
              { id: 'hoy', label: 'Hoy', desde: hoyColombia(), hasta: hoyColombia() },
              { id: 'semana', label: 'Semana', desde: inicioSemanaColombia(), hasta: hoyColombia() },
              { id: 'mes', label: 'Mes', desde: inicioMesColombia(), hasta: hoyColombia() },
            ].map(({ id, label, desde: d, hasta: h }) => (
              <button
                key={id}
                onClick={() => { setPresetActivo(id); setDesde(d); setHasta(h); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  presetActivo === id
                    ? 'bg-blue text-white border-blue'
                    : 'border-border text-gray-600 hover:bg-gray-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportar} disabled={exportando} className="btn-secondary text-sm disabled:opacity-50" title="Exportar CSV">
            {exportando ? <span className="animate-pulse">...</span> : <Download size={16} />}
          </button>
          <button onClick={cargar} disabled={cargando} className="btn-secondary text-sm disabled:opacity-50">Actualizar</button>
        </div>
      </div>

      <div className="card p-3 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Desde</label>
            <input type="date" value={desde} onChange={(e) => { setPresetActivo(null); setDesde(e.target.value); setPage(1); }} className="input-field text-sm py-1.5" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Hasta</label>
            <input type="date" value={hasta} onChange={(e) => { setPresetActivo(null); setHasta(e.target.value); setPage(1); }} className="input-field text-sm py-1.5" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Medio de pago</label>
            <select value={filtroMedioPago} onChange={(e) => { setFiltroMedioPago(e.target.value); setPage(1); }} className="input-field text-sm py-1.5">
              <option value="">Todos</option>
              {MEDIOS_PAGO.map((mp) => <option key={mp.value} value={mp.value}>{mp.label}</option>)}
            </select>
          </div>
          {adminOrEncargado && (
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Atendido por</label>
              <select value={filtroUsuarioId} onChange={(e) => { setFiltroUsuarioId(e.target.value); setPage(1); }} className="input-field text-sm py-1.5">
                <option value="">Todos</option>
                {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Buscar</label>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={busqueda}
                onChange={(e) => { setBusqueda(e.target.value); setPage(1); }}
                placeholder="N° factura o cliente"
                className="input-field text-sm py-1.5 pl-8 w-44"
              />
            </div>
          </div>
          <div className="self-end flex gap-2">
            <button onClick={() => { setOrden(o => o === 'asc' ? 'desc' : 'asc'); setPage(1); }} className={`btn-secondary text-sm flex items-center gap-1.5 ${orden === 'asc' ? 'border-blue text-blue' : ''}`} title={orden === 'asc' ? 'Más antiguas primero' : 'Más recientes primero'}>
              <ArrowUpDown size={16} />
              {orden === 'asc' ? '↑ Antiguas' : '↓ Recientes'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-500">{total} facturas encontradas</p>
      </div>

      <div className="card-static p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-border bg-gray-50">
              <th className="p-3 w-14">#</th>
              <th className="p-3">Atendido</th>
              <th className="p-3">Cliente</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3 text-center">Fecha</th>
              <th className="p-3 text-center">Hora</th>
              <th className="p-3 text-center">Pago</th>
              <th className="p-3 text-center">Estado</th>
              <th className="p-3 text-center w-32">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan="9" className="text-center py-12 text-gray-400">
                  <span className="animate-pulse">Cargando...</span>
                </td>
              </tr>
            ) : facturas.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center py-8 text-gray-400">
                  No se encontraron facturas con esos filtros
                </td>
              </tr>
            ) : facturas.map((f) => (
              <tr key={f.id} className="border-b border-border/50 hover:bg-gray-50">
                <td className="p-3 font-mono text-gray-400">{f.numero}</td>
                <td className="p-3 font-medium">{f.usuario_nombre}</td>
                <td className="p-3">{f.cliente_nombre}</td>
                <td className="p-3 text-right font-mono">{formatCOP(f.total)}</td>
                <td className="p-3 text-center text-gray-500 font-mono text-xs">
                  {new Date(f.fecha).toLocaleDateString('es-CO', { timeZone: 'America/Bogota', day: '2-digit', month: '2-digit' })}
                </td>
                <td className="p-3 text-center text-gray-500 font-mono text-xs">
                  {new Date(f.fecha).toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hour12: false })}
                </td>
                <td className="p-3 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${MEDIOS_PAGO_COLOR[f.medio_pago] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {MAPA_MEDIOS[f.medio_pago] || f.medio_pago}
                  </span>
                </td>
                <td className="p-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${estadoBadgeClass(f.estado)}`}>
                    {f.estado.charAt(0).toUpperCase() + f.estado.slice(1)}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => verDetalle(f.id)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-blue" title="Ver detalle">
                      <Eye size={16} />
                    </button>
                    {f.estado === 'activa' && tienePermiso('anular_factura') && (
                      <button onClick={() => abrirAnular(f)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-red" title="Anular">
                        <Ban size={16} />
                      </button>
                    )}
                    {f.estado === 'activa' && tienePermiso('anular_factura') && (
                      <button onClick={() => abrirAnularYCopiar(f)} className="p-1.5 rounded-lg hover:bg-orange-50 transition-colors text-orange-600" title="Anular y Copiar">
                        <FileText size={16} />
                      </button>
                    )}
                    {usuario?.rol === 'admin' && (
                      <button onClick={() => setEliminarModal(f)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-red" title="Eliminar">
                        <Trash2 size={16} />
                      </button>
                    )}
                    <button onClick={() => verPreview(f)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500" title="Vista previa / Imprimir">
                      <Printer size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          {facturas.length > 0 && (
            <tfoot>
              <tr className="sticky bottom-0 border-t-2 border-blue-200 bg-blue-50">
                <td colSpan="2"></td>
                <td className="p-3 text-right text-xs text-gray-400 font-medium">Total página:</td>
                <td className="p-3 text-right font-semibold font-mono text-blue text-base">{formatCOP(facturas.reduce((s, f) => s + f.total, 0))}</td>
                <td colSpan="5"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {renderPaginacion()}

      {showDetalle && selected && (
        <Modal titulo={`Factura ${selected.numero}`} onClose={() => setShowDetalle(false)} ancho="max-w-3xl">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-3 rounded-lg">
              <div><span className="text-gray-500">Cliente:</span> {selected.cliente_nombre}</div>
              <div><span className="text-gray-500">NIT:</span> {selected.cliente_nit}</div>
              <div><span className="text-gray-500">Atendido por:</span> {selected.usuario_nombre}</div>
              <div><span className="text-gray-500">Medio de pago:</span> {MAPA_MEDIOS[selected.medio_pago] || selected.medio_pago}</div>
              <div><span className="text-gray-500">Estado:</span> {selected.estado.charAt(0).toUpperCase() + selected.estado.slice(1)}</div>
              <div><span className="text-gray-500">CUFE:</span> <span className="break-all">{selected.cufe}</span></div>
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
                    <td className="py-1.5">
                      {item.nombre_mostrar || item.producto_nombre}
                      {item.observacion && <div className="text-xs text-gray-400 italic">└ {item.observacion}</div>}
                    </td>
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
                <p className="text-lg font-bold font-mono text-blue">Total: {formatCOP(selected.total)}</p>
              </div>
            </div>

            {selected.estado === 'anulada' && selected.motivo_anulacion && (
              <div className="bg-yellow/10 p-3 rounded-lg text-sm">
                <span className="font-medium text-yellow">Motivo de anulación:</span> {selected.motivo_anulacion}
              </div>
            )}
          </div>
        </Modal>
      )}

      {showPreview && (
        <Modal titulo="Vista previa de factura" onClose={() => setShowPreview(false)} ancho="max-w-lg">
          <div className="flex flex-col items-center">
            <div className="w-full bg-white border border-border rounded-lg overflow-hidden">
              <iframe
                srcDoc={previewHtml.replace('<script>window.print();</script>', '')}
                className="w-full h-[500px]"
                title="Vista previa factura"
                style={{ fontFamily: 'monospace' }}
              />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowPreview(false)} className="btn-secondary">Cerrar</button>
              <button onClick={imprimirPreview} className="btn-primary flex items-center gap-2">
                <Printer size={16} /> Imprimir
              </button>
            </div>
          </div>
        </Modal>
      )}

      {eliminarModal && (
        <Modal titulo="Eliminar factura" onClose={() => setEliminarModal(null)} ancho="max-w-sm">
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              ¿Eliminar permanentemente la factura <strong>{eliminarModal.numero}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEliminarModal(null)} className="btn-secondary">Cancelar</button>
              <button onClick={() => eliminar(eliminarModal)} className="btn-danger">Eliminar</button>
            </div>
          </div>
        </Modal>
      )}

      {showMotivoModal && (
        <Modal titulo={accionMotivo === 'anular' ? 'Anular factura' : 'Anular y Copiar'} onClose={() => setShowMotivoModal(false)} ancho="max-w-sm">
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              {accionMotivo === 'anular'
                ? `Se anulará la factura ${motivoFactura?.numero} y se restaurará el stock.`
                : `Se anulará la factura ${motivoFactura?.numero} y se abrirá el POS con los mismos productos.`}
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de anulación</label>
              <input
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="input-field"
                placeholder="Ej: Cliente devolvió el pedido"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowMotivoModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={confirmarMotivo} disabled={!motivo.trim()} className="btn-primary">Confirmar</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
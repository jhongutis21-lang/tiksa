import { useState, useEffect } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import StockBadge from '../components/StockBadge';
import useAuth from '../hooks/useAuth';
import { formatCOP } from '../utils/colombia';

export default function Inventario() {
  const { tienePermiso } = useAuth();
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({ nombre: '', codigo_interno: '', categoria_id: 1, stock: 0, stock_minimo: 5, precio_1: '', precio_2: '', precio_3: '', precio_4: '', costo: '', iva: 19 });
  const [ajusteStock, setAjusteStock] = useState({ id: null, nombre: '', stockActual: 0, cantidad: 0, modo: 'agregar' });
  const [categorias, setCategorias] = useState([]);
  const [toast, setToast] = useState(null);
  const [errorForm, setErrorForm] = useState('');
  const [confirmarDesactivar, setConfirmarDesactivar] = useState(null);

  useEffect(() => {
    cargarCategorias();
  }, []);

  useEffect(() => {
    cargarProductos();
  }, [filtroCategoria, busqueda, pagina]);

  const cargarCategorias = async () => {
    try {
      const res = await api.get('/productos/categorias');
      setCategorias(res.data);
    } catch {
      setToast({ mensaje: 'Error al cargar categorías', tipo: 'error' });
    }
  };

  const cargarProductos = async () => {
    setCargando(true);
    try {
      const params = new URLSearchParams({ activo: 'true', _page: pagina, _limit: '25' });
      if (filtroCategoria) params.append('categoria', filtroCategoria);
      if (busqueda.length >= 2) params.append('busqueda', busqueda);
      const res = await api.get(`/productos?${params}`);
      if (res.data.data) {
        setProductos(res.data.data);
        setTotalPaginas(Math.ceil(res.data.total / res.data.limit));
      } else {
        setProductos(res.data);
        setTotalPaginas(1);
      }
    } catch {
      setToast({ mensaje: 'Error al cargar productos', tipo: 'error' });
    } finally {
      setCargando(false);
    }
  };

  const abrirNuevo = () => {
    setEditando(null);
    setErrorForm('');
    setForm({ nombre: '', codigo_interno: '', categoria_id: categorias[0]?.id || 1, stock: 0, stock_minimo: 5, precio_1: '', precio_2: '', precio_3: '', precio_4: '', costo: '', iva: 19 });
    setShowModal(true);
  };

  const abrirEditar = (p) => {
    setEditando(p);
    setErrorForm('');
    setForm({ nombre: p.nombre, codigo_interno: p.codigo_interno || '', categoria_id: p.categoria_id, stock: p.stock, stock_minimo: p.stock_minimo, precio_1: p.precio_1, precio_2: p.precio_2, precio_3: p.precio_3 ?? '', precio_4: p.precio_4 ?? '', costo: p.costo ?? '', iva: p.iva });
    setShowModal(true);
  };

  const validarForm = () => {
    if (!form.nombre.trim()) return 'El nombre del producto es requerido';
    if (!form.precio_1 || parseFloat(form.precio_1) <= 0) return 'Precio lista 1 debe ser mayor a 0';
    if (!form.precio_2 || parseFloat(form.precio_2) <= 0) return 'Precio lista 2 debe ser mayor a 0';
    return '';
  };

  const guardar = async () => {
    const error = validarForm();
    if (error) { setErrorForm(error); return; }
    setGuardando(true);
    try {
      if (editando) {
        await api.put(`/productos/${editando.id}`, form);
        setToast({ mensaje: 'Producto actualizado', tipo: 'success' });
      } else {
        await api.post('/productos', form);
        setToast({ mensaje: 'Producto creado', tipo: 'success' });
      }
      setShowModal(false);
      setPagina(1);
      cargarProductos();
    } catch (err) {
      setToast({ mensaje: err.response?.data?.error || 'Error al guardar', tipo: 'error' });
    } finally {
      setGuardando(false);
    }
  };

  const handleAjusteStock = async () => {
    if (ajusteStock.cantidad <= 0) return;
    const cantidad = ajusteStock.modo === 'agregar' ? ajusteStock.cantidad : -ajusteStock.cantidad;
    try {
      await api.patch(`/productos/${ajusteStock.id}/stock`, { cantidad });
      setToast({ mensaje: 'Stock ajustado', tipo: 'success' });
      setAjusteStock({ id: null, nombre: '', stockActual: 0, cantidad: 0, modo: 'agregar' });
      cargarProductos();
    } catch {
      setToast({ mensaje: 'Error al ajustar stock', tipo: 'error' });
    }
  };

  const desactivarProducto = async (p) => {
    try {
      await api.delete(`/productos/${p.id}`);
      setToast({ mensaje: 'Producto desactivado', tipo: 'success' });
      setConfirmarDesactivar(null);
      cargarProductos();
    } catch {
      setToast({ mensaje: 'Error al desactivar', tipo: 'error' });
    }
  };

  const calcularBase = (precio, iva) => {
    const p = parseFloat(precio) || 0;
    if (iva <= 0) return p;
    return Math.round((p / (1 + iva / 100)) * 100) / 100;
  };

  const handleSearch = (e) => {
    setBusqueda(e.target.value);
    setPagina(1);
  };

  return (
    <div className="p-6">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="text-xl font-bold text-gray-800">Inventario</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Buscar producto..."
            value={busqueda}
            onChange={handleSearch}
            className="input-field text-sm w-48"
          />
          <select value={filtroCategoria} onChange={(e) => { setFiltroCategoria(e.target.value); setPagina(1); }} className="input-field text-sm w-auto">
            <option value="">Todas las categorías</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          {tienePermiso('editar_inventario') && (
            <button onClick={abrirNuevo} className="btn-primary text-sm">
              + Nuevo producto
            </button>
          )}
        </div>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-border bg-gray-50">
              <th className="p-3">Código</th>
              <th className="p-3">Producto</th>
              <th className="p-3 hidden sm:table-cell">Categoría</th>
              <th className="p-3 text-center">Stock</th>
              <th className="p-3 text-right">Precio 1</th>
              <th className="p-3 text-right hidden lg:table-cell">Precio 2</th>
              <th className="p-3 text-right hidden xl:table-cell">Precio 3</th>
              <th className="p-3 text-right hidden xl:table-cell">Precio 4</th>
              <th className="p-3 text-right hidden lg:table-cell">Costo</th>
              <th className="p-3 text-right hidden lg:table-cell">Margen</th>
              <th className="p-3 text-right hidden lg:table-cell">Base IVA</th>
              <th className="p-3 text-center hidden md:table-cell">IVA</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={13} className="p-6 text-center text-gray-400">Cargando...</td></tr>
            ) : productos.length === 0 ? (
              <tr><td colSpan={13} className="p-6 text-center text-gray-400">No hay productos</td></tr>
            ) : (productos.map((p) => (
              <tr key={p.id} className="border-b border-border/50 hover:bg-gray-50">
                <td className="p-3 font-mono text-gray-400">{p.codigo_interno || '-'}</td>
                <td className="p-3 font-medium">{p.nombre}</td>
                <td className="p-3 text-gray-500 hidden sm:table-cell">{p.categoria_nombre}</td>
                <td className="p-3 text-center"><StockBadge stock={p.stock} minimo={p.stock_minimo} /></td>
                <td className="p-3 text-right font-mono">{formatCOP(p.precio_1)}</td>
                <td className="p-3 text-right font-mono hidden lg:table-cell">{p.precio_2 ? formatCOP(p.precio_2) : '-'}</td>
                <td className="p-3 text-right font-mono hidden xl:table-cell">{p.precio_3 ? formatCOP(p.precio_3) : '-'}</td>
                <td className="p-3 text-right font-mono hidden xl:table-cell">{p.precio_4 ? formatCOP(p.precio_4) : '-'}</td>
                <td className="p-3 text-right font-mono text-gray-500 hidden lg:table-cell">{p.costo ? formatCOP(p.costo) : '-'}</td>
                <td className={`p-3 text-right font-mono hidden lg:table-cell ${(parseFloat(p.precio_1) - parseFloat(p.costo || 0)) > 0 ? 'text-green' : 'text-red'}`}>
                  {p.costo ? formatCOP(parseFloat(p.precio_1) - parseFloat(p.costo)) : '-'}
                </td>
                <td className="p-3 text-right font-mono text-gray-500 hidden lg:table-cell">{formatCOP(calcularBase(p.precio_1, p.iva))}</td>
                <td className="p-3 text-center hidden md:table-cell">{p.iva === -1 ? 'Excluido' : p.iva === 0 ? '0%' : `${p.iva}%`}</td>
                <td className="p-3">
                  <div className="flex gap-1">
                    {tienePermiso('editar_inventario') && (
                      <button onClick={() => abrirEditar(p)} className="p-1.5 rounded hover:bg-primary-50 text-primary transition-colors" title="Editar">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                    )}
                    {tienePermiso('ajustar_stock') && (
                      <button onClick={() => setAjusteStock({ id: p.id, nombre: p.nombre, stockActual: p.stock, cantidad: 0, modo: 'agregar' })} className="p-1.5 rounded hover:bg-yellow-50 text-yellow-600 transition-colors" title="Ajustar stock">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                      </button>
                    )}
                    {tienePermiso('editar_inventario') && (
                      <button onClick={() => setConfirmarDesactivar(p)} className="p-1.5 rounded hover:bg-red-50 text-red transition-colors" title="Desactivar">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>

      {totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPagina(Math.max(1, pagina - 1))}
            disabled={pagina === 1}
            className="px-3 py-1.5 text-sm rounded border border-border hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          <span className="text-sm text-gray-500">
            {pagina} / {totalPaginas}
          </span>
          <button
            onClick={() => setPagina(Math.min(totalPaginas, pagina + 1))}
            disabled={pagina === totalPaginas}
            className="px-3 py-1.5 text-sm rounded border border-border hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Siguiente
          </button>
        </div>
      )}

      {showModal && (
        <Modal titulo={editando ? 'Editar producto' : 'Nuevo producto'} onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            {errorForm && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">{errorForm}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="input-field" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código interno</label>
                <input value={form.codigo_interno} onChange={(e) => setForm({ ...form, codigo_interno: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <select value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: parseInt(e.target.value) })} className="input-field">
                  {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio lista 1 (consumo)</label>
                <input type="number" value={form.precio_1} onChange={(e) => setForm({ ...form, precio_1: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio lista 2 (reventa)</label>
                <input type="number" value={form.precio_2} onChange={(e) => setForm({ ...form, precio_2: e.target.value })} className="input-field" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio lista 3 (trabajadores)</label>
                <input type="number" value={form.precio_3} onChange={(e) => setForm({ ...form, precio_3: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio lista 4 (misma empresa)</label>
                <input type="number" value={form.precio_4} onChange={(e) => setForm({ ...form, precio_4: e.target.value })} className="input-field" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Costo</label>
                <input type="number" value={form.costo} onChange={(e) => setForm({ ...form, costo: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Margen actual</label>
                <div className="input-field bg-gray-50 flex items-center h-10">
                  {(form.precio_1 ?? '') !== '' && (form.costo ?? '') !== '' ? (
                    <span className={`font-mono font-medium ${parseFloat(form.precio_1 || 0) > parseFloat(form.costo || 0) ? 'text-green' : 'text-red'}`}>
                      {formatCOP(parseFloat(form.precio_1 || 0) - parseFloat(form.costo || 0))}
                    </span>
                  ) : <span className="text-gray-400">—</span>}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{editando ? 'Stock actual' : 'Stock inicial'}</label>
                {editando ? (
                  <div className="input-field bg-gray-100 flex items-center h-10 text-gray-600 font-mono">{form.stock}</div>
                ) : (
                  <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })} className="input-field" />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock mínimo</label>
                <input type="number" value={form.stock_minimo} onChange={(e) => setForm({ ...form, stock_minimo: parseInt(e.target.value) || 5 })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IVA</label>
                <select value={form.iva} onChange={(e) => setForm({ ...form, iva: parseInt(e.target.value) })} className="input-field">
                  <option value={19}>19%</option>
                  <option value={5}>5%</option>
                  <option value={0}>0%</option>
                  <option value={-1}>Excluido</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={guardar} disabled={guardando} className="btn-primary disabled:opacity-50">
                {guardando ? 'Guardando...' : editando ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {ajusteStock.id && (
        <Modal titulo="Ajustar stock" onClose={() => setAjusteStock({ id: null, nombre: '', stockActual: 0, cantidad: 0, modo: 'agregar' })}>
          <div className="space-y-4">
            <div className="text-center">
              <p className="font-semibold text-gray-800">{ajusteStock.nombre}</p>
              <p className="text-sm text-gray-500">Stock actual: <span className="font-mono font-semibold text-gray-700">{ajusteStock.stockActual}</span></p>
            </div>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setAjusteStock({ ...ajusteStock, modo: 'agregar' })}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${ajusteStock.modo === 'agregar' ? 'bg-white text-green shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                + Agregar
              </button>
              <button
                onClick={() => setAjusteStock({ ...ajusteStock, modo: 'retirar' })}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${ajusteStock.modo === 'retirar' ? 'bg-white text-red shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                − Retirar
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cantidad a {ajusteStock.modo === 'agregar' ? 'agregar' : 'retirar'}
              </label>
              <input
                type="number"
                value={ajusteStock.cantidad || ''}
                onChange={(e) => setAjusteStock({ ...ajusteStock, cantidad: Math.max(0, parseInt(e.target.value) || 0) })}
                className="input-field text-center text-lg font-mono"
                min="0"
                autoFocus
              />
            </div>
            <div className="flex gap-1.5 justify-center">
              {[1, 5, 10, 50, 100].map((n) => (
                <button
                  key={n}
                  onClick={() => setAjusteStock({ ...ajusteStock, cantidad: (ajusteStock.cantidad || 0) + n })}
                  className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-gray-50 font-mono transition-colors"
                >
                  +{n}
                </button>
              ))}
            </div>
            {ajusteStock.cantidad > 0 && (
              <div className="text-center text-sm text-gray-500">
                Stock final:{' '}
                <span className={`font-mono font-semibold ${ajusteStock.modo === 'agregar' ? 'text-green' : 'text-red'}`}>
                  {ajusteStock.modo === 'agregar'
                    ? ajusteStock.stockActual + ajusteStock.cantidad
                    : ajusteStock.stockActual - ajusteStock.cantidad}
                </span>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setAjusteStock({ id: null, nombre: '', stockActual: 0, cantidad: 0, modo: 'agregar' })} className="btn-secondary">Cancelar</button>
              <button onClick={handleAjusteStock} disabled={ajusteStock.cantidad <= 0} className="btn-primary disabled:opacity-50">Ajustar</button>
            </div>
          </div>
        </Modal>
      )}

      {confirmarDesactivar && (
        <Modal titulo="Desactivar producto" onClose={() => setConfirmarDesactivar(null)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              ¿Estás seguro de desactivar <strong>{confirmarDesactivar.nombre}</strong>?
            </p>
            <p className="text-xs text-gray-400">El producto quedará oculto pero los datos históricos se conservan.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmarDesactivar(null)} className="btn-secondary">Cancelar</button>
              <button onClick={() => desactivarProducto(confirmarDesactivar)} className="btn-primary bg-red-600 hover:bg-red-700">Desactivar</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

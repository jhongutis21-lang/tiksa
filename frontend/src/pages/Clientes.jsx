import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import useAuth from '../hooks/useAuth';
import { formatCOP } from '../utils/colombia';

export default function Clientes() {
  const { tienePermiso } = useAuth();
  const [clientes, setClientes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nombre: '', nit: '', tipo_persona: 'Natural', regimen: 'Simplificado', lista_precio: 1, limite_credito: '', telefono: '', correo: '', direccion: '' });
  const [busqueda, setBusqueda] = useState('');
  const [toast, setToast] = useState(null);

  const cargar = async () => {
    try {
      const params = busqueda.length >= 2 ? `?busqueda=${encodeURIComponent(busqueda)}` : '';
      const res = await api.get(`/clientes${params}`);
      setClientes(res.data);
    } catch (err) {
      setToast({ mensaje: 'Error al cargar clientes', tipo: 'error' });
    }
  };

  useEffect(() => { cargar(); }, [busqueda]);

  const abrirNuevo = () => {
    setEditando(null);
    setForm({ nombre: '', nit: '', tipo_persona: 'Natural', regimen: 'Simplificado', lista_precio: 1, limite_credito: '', telefono: '', correo: '', direccion: '' });
    setShowModal(true);
  };

  const abrirEditar = (c) => {
    setEditando(c);
    setForm({ nombre: c.nombre, nit: c.nit, tipo_persona: c.tipo_persona, regimen: c.regimen, lista_precio: c.lista_precio, limite_credito: c.limite_credito || '', telefono: c.telefono || '', correo: c.correo || '', direccion: c.direccion || '' });
    setShowModal(true);
  };

  const guardar = async () => {
    try {
      if (editando) {
        await api.put(`/clientes/${editando.id}`, form);
        setToast({ mensaje: 'Cliente actualizado', tipo: 'success' });
      } else {
        await api.post('/clientes', form);
        setToast({ mensaje: 'Cliente creado', tipo: 'success' });
      }
      setShowModal(false);
      cargar();
    } catch (err) {
      setToast({ mensaje: err.response?.data?.error || 'Error al guardar', tipo: 'error' });
    }
  };

  const eliminar = async (c) => {
    if (!confirm(`¿Desactivar el cliente "${c.nombre}"?`)) return;
    try {
      await api.delete(`/clientes/${c.id}`);
      setToast({ mensaje: 'Cliente desactivado', tipo: 'success' });
      cargar();
    } catch (err) {
      setToast({ mensaje: err.response?.data?.error || 'Error al eliminar', tipo: 'error' });
    }
  };

  return (
    <div className="p-6">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="text-xl font-bold text-gray-800">Clientes</h2>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar cliente..."
            className="input-field text-sm w-64"
          />
          {tienePermiso('editar_clientes') && (
            <button onClick={abrirNuevo} className="btn-primary text-sm">+ Nuevo cliente</button>
          )}
        </div>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-border bg-gray-50">
              <th className="p-3">Nombre</th>
              <th className="p-3">NIT</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Régimen</th>
              <th className="p-3 text-center">Lista</th>
              <th className="p-3 text-right">Saldo</th>
              <th className="p-3 text-right">Límite</th>
              <th className="p-3">Teléfono</th>
              <th className="p-3 text-center w-24">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => (
              <tr key={c.id} className="border-b border-border/50 hover:bg-gray-50">
                <td className="p-3 font-medium">{c.nombre}</td>
                <td className="p-3 font-mono text-gray-500">{c.nit}</td>
                <td className="p-3">{c.tipo_persona}</td>
                <td className="p-3">{c.regimen}</td>
                <td className="p-3 text-center"><span className="badge-green">#{c.lista_precio}</span></td>
                <td className={`p-3 text-right font-mono font-medium ${c.saldo_pendiente > 0 ? 'text-red' : 'text-gray-400'}`}>
                  {c.saldo_pendiente > 0 ? formatCOP(c.saldo_pendiente) : '-'}
                </td>
                <td className="p-3 text-right font-mono text-gray-500">
                  {c.limite_credito > 0 ? formatCOP(c.limite_credito) : '-'}
                </td>
                <td className="p-3 text-gray-500">{c.telefono || '-'}</td>
                <td className="p-3">
                  <div className="flex items-center gap-1">
                    {tienePermiso('editar_clientes') && (
                      <button onClick={() => abrirEditar(c)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-primary text-xs font-medium" title="Editar">
                        Editar
                      </button>
                    )}
                    {tienePermiso('editar_clientes') && (
                      <button onClick={() => eliminar(c)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-red" title="Eliminar">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {clientes.length === 0 && (
              <tr>
                <td colSpan="9" className="text-center py-8 text-gray-400">
                  No hay clientes registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal titulo={editando ? 'Editar cliente' : 'Nuevo cliente'} onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">NIT/Cédula</label>
                <input value={form.nit} onChange={(e) => setForm({ ...form, nit: e.target.value })} className="input-field" />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo persona</label>
                <select value={form.tipo_persona} onChange={(e) => setForm({ ...form, tipo_persona: e.target.value })} className="input-field">
                  <option value="Natural">Natural</option>
                  <option value="Jurídica">Jurídica</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Régimen</label>
                <select value={form.regimen} onChange={(e) => setForm({ ...form, regimen: e.target.value })} className="input-field">
                  <option value="Simplificado">Simplificado</option>
                  <option value="Común">Común</option>
                  <option value="Gran contribuyente">Gran contribuyente</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lista precio</label>
                <select value={form.lista_precio} onChange={(e) => setForm({ ...form, lista_precio: parseInt(e.target.value) })} className="input-field">
                  <option value={1}>Lista 1 (Consumo)</option>
                  <option value={2}>Lista 2 (Reventa)</option>
                  <option value={3}>Lista 3 (Trabajadores)</option>
                  <option value={4}>Lista 4 (Misma empresa)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Límite crédito</label>
                <input type="number" value={form.limite_credito} onChange={(e) => setForm({ ...form, limite_credito: e.target.value })} className="input-field" placeholder="0 = sin crédito" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
                <input type="email" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} className="input-field" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
              <input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} className="input-field" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={guardar} className="btn-primary">{editando ? 'Actualizar' : 'Crear'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

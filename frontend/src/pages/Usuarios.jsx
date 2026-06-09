import { useState, useEffect } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';
import Toast from '../components/Toast';

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nombre: '', usuario: '', contrasena: '', rol_id: 3 });
  const [toast, setToast] = useState(null);
  const roles = [
    { id: 1, nombre: 'admin', label: 'Admin' },
    { id: 2, nombre: 'encargado', label: 'Encargado' },
    { id: 3, nombre: 'cajero', label: 'Cajero' },
    { id: 4, nombre: 'domicilios', label: 'Domicilios' },
  ];

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    try {
      const res = await api.get('/usuarios');
      setUsuarios(res.data);
    } catch (err) {
      setToast({ mensaje: 'Error al cargar usuarios', tipo: 'error' });
    }
  };

  const abrirNuevo = () => {
    setEditando(null);
    setForm({ nombre: '', usuario: '', contrasena: '', rol_id: 3 });
    setShowModal(true);
  };

  const abrirEditar = (u) => {
    setEditando(u);
    setForm({ nombre: u.nombre, usuario: u.usuario, contrasena: '', rol_id: u.rol_id });
    setShowModal(true);
  };

  const guardar = async () => {
    try {
      if (editando) {
        await api.put(`/usuarios/${editando.id}`, { nombre: form.nombre, usuario: form.usuario, rol_id: form.rol_id });
        if (form.contrasena) {
          await api.patch(`/usuarios/${editando.id}/contrasena`, { contrasena: form.contrasena });
        }
        setToast({ mensaje: 'Usuario actualizado', tipo: 'success' });
      } else {
        await api.post('/usuarios', form);
        setToast({ mensaje: 'Usuario creado', tipo: 'success' });
      }
      setShowModal(false);
      cargar();
    } catch (err) {
      setToast({ mensaje: err.response?.data?.error || 'Error al guardar', tipo: 'error' });
    }
  };

  const toggleEstado = async (id, activo) => {
    try {
      await api.patch(`/usuarios/${id}/estado`, { activo });
      setToast({ mensaje: `Usuario ${activo ? 'activado' : 'desactivado'}`, tipo: 'success' });
      cargar();
    } catch (err) {
      setToast({ mensaje: 'Error al cambiar estado', tipo: 'error' });
    }
  };

  return (
    <div className="p-6">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">Usuarios del sistema</h2>
        <button onClick={abrirNuevo} className="btn-primary text-sm">+ Nuevo usuario</button>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-border bg-gray-50">
              <th className="p-3">Nombre</th>
              <th className="p-3">Usuario</th>
              <th className="p-3">Rol</th>
              <th className="p-3 text-center">Activo</th>
              <th className="p-3">Creado</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className="border-b border-border/50 hover:bg-gray-50">
                <td className="p-3 font-medium">{u.nombre}</td>
                <td className="p-3 font-mono text-gray-500">{u.usuario}</td>
                <td className="p-3 capitalize">{u.rol}</td>
                <td className="p-3 text-center">
                  <span className={u.activo ? 'badge-green' : 'badge-red'}>
                    {u.activo ? 'Sí' : 'No'}
                  </span>
                </td>
                <td className="p-3 text-gray-400 text-xs">{new Date(u.creado_en).toLocaleDateString('es-CO')}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button onClick={() => abrirEditar(u)} className="text-primary hover:underline text-xs">Editar</button>
                    <button onClick={() => toggleEstado(u.id, !u.activo)} className={`hover:underline text-xs ${u.activo ? 'text-red' : 'text-green'}`}>
                      {u.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal titulo={editando ? 'Editar usuario' : 'Nuevo usuario'} onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="input-field" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                <input value={form.usuario} onChange={(e) => setForm({ ...form, usuario: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <select value={form.rol_id} onChange={(e) => setForm({ ...form, rol_id: parseInt(e.target.value) })} className="input-field">
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña {editando ? '(dejar vacío para no cambiar)' : ''}
              </label>
              <input type="password" value={form.contrasena} onChange={(e) => setForm({ ...form, contrasena: e.target.value })} className="input-field" />
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

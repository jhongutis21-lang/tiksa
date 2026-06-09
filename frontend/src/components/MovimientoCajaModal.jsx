import { useState } from 'react';
import Modal from './Modal';
import api from '../services/api';

export default function MovimientoCajaModal({ show, onClose, onSuccess }) {
  const [tipo, setTipo] = useState('ingreso');
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const handleGuardar = async () => {
    if (!concepto.trim() || !monto) return;
    setCargando(true);
    setError('');
    try {
      await api.post('/caja/movimiento', { tipo, concepto: concepto.trim(), monto: parseFloat(monto) });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar movimiento');
    } finally {
      setCargando(false);
    }
  };

  if (!show) return null;

  return (
    <Modal titulo="Registrar movimiento de caja" onClose={onClose} ancho="max-w-sm">
      <div className="space-y-4">
        {error && <p className="text-sm text-red bg-red/10 p-2 rounded">{error}</p>}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setTipo('ingreso')} className={`px-3 py-2 rounded-lg text-sm border transition-colors ${tipo === 'ingreso' ? 'border-green bg-green/10 text-green font-medium' : 'border-border hover:border-gray-300'}`}>Ingreso</button>
            <button onClick={() => setTipo('egreso')} className={`px-3 py-2 rounded-lg text-sm border transition-colors ${tipo === 'egreso' ? 'border-red bg-red/10 text-red font-medium' : 'border-border hover:border-gray-300'}`}>Egreso</button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Concepto</label>
          <input value={concepto} onChange={(e) => setConcepto(e.target.value)} className="input-field" placeholder="Ej: Pago proveedor, retiro personal..." autoFocus />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
          <input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} className="input-field" placeholder="0" />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={handleGuardar} disabled={cargando || !concepto.trim() || !monto} className={tipo === 'ingreso' ? 'btn-primary' : 'btn-danger'}>
            {cargando ? 'Guardando...' : tipo === 'ingreso' ? 'Registrar ingreso' : 'Registrar egreso'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

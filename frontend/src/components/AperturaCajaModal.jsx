import { useState } from 'react';
import Modal from './Modal';
import api from '../services/api';

export default function AperturaCajaModal({ show, onClose, onSuccess }) {
  const [monto, setMonto] = useState('');
  const [obs, setObs] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const handleAbrir = async () => {
    setCargando(true);
    setError('');
    try {
      await api.post('/caja/abrir', { monto_inicial: parseFloat(monto) || 0, observaciones: obs });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al abrir caja');
    } finally {
      setCargando(false);
    }
  };

  if (!show) return null;

  return (
    <Modal titulo="Abrir caja" onClose={onClose} ancho="max-w-sm">
      <div className="space-y-4">
        {error && <p className="text-sm text-red bg-red/10 p-2 rounded">{error}</p>}
        <p className="text-sm text-gray-500">Registra el monto inicial con el que abre la caja hoy.</p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Monto inicial</label>
          <input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} className="input-field" placeholder="0" autoFocus />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones (opcional)</label>
          <input value={obs} onChange={(e) => setObs(e.target.value)} className="input-field" placeholder="Ej: cambio de turno" />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={handleAbrir} disabled={cargando} className="btn-primary">{cargando ? 'Abriendo...' : 'Abrir caja'}</button>
        </div>
      </div>
    </Modal>
  );
}

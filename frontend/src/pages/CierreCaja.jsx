import { useState, useEffect } from 'react';
import { CircleDollarSign, ArrowUpCircle, ArrowDownCircle, Lock, Unlock, Landmark } from 'lucide-react';
import api from '../services/api';
import Toast from '../components/Toast';
import AperturaCajaModal from '../components/AperturaCajaModal';
import MovimientoCajaModal from '../components/MovimientoCajaModal';
import useAuth from '../hooks/useAuth';
import { hoyColombia, formatCOP, MEDIOS_PAGO } from '../utils/colombia';

export default function CierreCaja() {
  const { tienePermiso } = useAuth();
  const [resumen, setResumen] = useState(null);
  const [fecha, setFecha] = useState(hoyColombia());
  const [toast, setToast] = useState(null);
  const [showApertura, setShowApertura] = useState(false);
  const [showMovimiento, setShowMovimiento] = useState(false);
  const [showConsignacion, setShowConsignacion] = useState(false);
  const [montoConsignacion, setMontoConsignacion] = useState('');
  const [cerrando, setCerrando] = useState(false);

  useEffect(() => { cargar(); }, [fecha]);

  const cargar = async () => {
    try {
      const res = await api.get(`/caja/resumen?fecha=${fecha}`);
      setResumen(res.data);
    } catch {
      setToast({ mensaje: 'Error al cargar resumen', tipo: 'error' });
    }
  };

  const handleCerrar = async () => {
    if (!confirm('¿Registrar cierre de caja? Esta acción no se puede deshacer.')) return;
    setCerrando(true);
    try {
      await api.post('/caja/cerrar');
      setToast({ mensaje: 'Cierre de caja registrado', tipo: 'success' });
      cargar();
    } catch {
      setToast({ mensaje: 'Error al cerrar caja', tipo: 'error' });
    } finally {
      setCerrando(false);
    }
  };

  const handleConsignacion = async () => {
    const m = parseFloat(montoConsignacion);
    if (!m || m <= 0) return;
    try {
      await api.post('/caja/movimiento', { tipo: 'egreso', concepto: 'Consignación bancaria', monto: m });
      setToast({ mensaje: `Consignación por ${formatCOP(m)} registrada`, tipo: 'success' });
      setShowConsignacion(false);
      setMontoConsignacion('');
      cargar();
    } catch {
      setToast({ mensaje: 'Error al registrar consignación', tipo: 'error' });
    }
  };

  const hoy = hoyColombia();
  const esHoy = fecha === hoy;

  return (
    <div className="p-6">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <AperturaCajaModal show={showApertura} onClose={() => setShowApertura(false)} onSuccess={() => { setToast({ mensaje: 'Caja abierta exitosamente', tipo: 'success' }); cargar(); }} />
      <MovimientoCajaModal show={showMovimiento} onClose={() => setShowMovimiento(false)} onSuccess={() => { setToast({ mensaje: 'Movimiento registrado', tipo: 'success' }); cargar(); }} />

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-xl font-bold text-gray-800">Cierre de caja</h2>
        <div className="flex items-center gap-2">
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="input-field w-auto text-sm" />
          {esHoy && (
            <>
              {tienePermiso('abrir_caja') && (!resumen?.apertura || resumen?.apertura?.estado === 'cerrada') && (
                <button onClick={() => setShowApertura(true)} className="btn-primary text-sm flex items-center gap-1.5">
                  <Unlock size={16} /> Abrir caja
                </button>
              )}
              {tienePermiso('registrar_movimiento') && resumen?.apertura?.estado === 'abierta' && (
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowMovimiento(true)} className="btn-secondary text-sm flex items-center gap-1.5">
                    <CircleDollarSign size={16} /> Movimiento
                  </button>
                  <button onClick={() => setShowConsignacion(!showConsignacion)} className="btn-secondary text-sm flex items-center gap-1.5 border border-yellow/30 text-yellow hover:bg-yellow/5">
                    <Landmark size={16} /> Consignación
                  </button>
                </div>
              )}
              {tienePermiso('cerrar_caja') && resumen?.apertura?.estado === 'abierta' && (
                <button onClick={handleCerrar} disabled={cerrando} className="btn-danger text-sm flex items-center gap-1.5 disabled:opacity-50">
                  <Lock size={16} /> {cerrando ? 'Cerrando...' : 'Cerrar caja'}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {resumen && (
        <div className="space-y-6">
          {resumen.apertura && (
            <div className="card bg-primary/5 border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-primary">Caja abierta</p>
                  <p className="text-xs text-gray-500">
                    {new Date(resumen.apertura.fecha_apertura).toLocaleString('es-CO', { timeZone: 'America/Bogota' })} 
                    {resumen.apertura.monto_inicial > 0 && ` — Monto inicial: ${formatCOP(resumen.apertura.monto_inicial)}`}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full text-white font-medium ${resumen.apertura.estado === 'cerrada' ? 'bg-red' : 'bg-green'}`}>
                  {resumen.apertura.estado === 'cerrada' ? 'Cerrada' : 'Abierta'}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card">
              <p className="text-gray-500 text-sm mb-1">Ventas POS</p>
              <p className="text-2xl font-bold font-mono text-primary">{formatCOP(resumen.total_pos)}</p>
            </div>
            <div className="card">
              <p className="text-gray-500 text-sm mb-1">Ventas electrónicas</p>
              <p className="text-2xl font-bold font-mono text-primary">{formatCOP(resumen.total_pe)}</p>
            </div>
            <div className="card">
              <p className="text-gray-500 text-sm mb-1">Total gastos</p>
              <p className="text-2xl font-bold font-mono text-red">{formatCOP(resumen.total_gastos)}</p>
            </div>
            <div className="card border-green/30">
              <p className="text-gray-500 text-sm mb-1">Utilidad del día</p>
              <p className="text-2xl font-bold font-mono text-green">{formatCOP(resumen.utilidad)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card">
              <p className="text-gray-500 text-sm mb-1">Facturas emitidas</p>
              <p className="text-3xl font-bold">{resumen.total_facturas}</p>
            </div>
            <div className="card">
              <p className="text-gray-500 text-sm mb-1">Domicilios entregados</p>
              <p className="text-3xl font-bold text-green">{resumen.domicilios_entregados}</p>
            </div>
            <div className="card">
              <p className="text-gray-500 text-sm mb-1">Ventas totales</p>
              <p className="text-3xl font-bold font-mono">{formatCOP(resumen.total_ventas)}</p>
            </div>
          </div>

          {resumen.movimientos?.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <CircleDollarSign size={18} className="text-primary" />
                Movimientos de caja
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-border bg-gray-50">
                      <th className="pb-2">Hora</th>
                      <th className="pb-2">Tipo</th>
                      <th className="pb-2">Concepto</th>
                      <th className="pb-2 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.movimientos.map((m) => (
                      <tr key={m.id} className="border-b border-border/50">
                        <td className="py-1.5 text-xs text-gray-400 font-mono">
                          {new Date(m.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </td>
                        <td className="py-1.5">
                          {m.tipo === 'ingreso'
                            ? <span className="flex items-center gap-1 text-green"><ArrowUpCircle size={14} /> Ingreso</span>
                            : <span className="flex items-center gap-1 text-red"><ArrowDownCircle size={14} /> Egreso</span>
                          }
                        </td>
                        <td className="py-1.5">{m.concepto}</td>
                        <td className={`py-1.5 text-right font-mono font-medium ${m.tipo === 'ingreso' ? 'text-green' : 'text-red'}`}>
                          {m.tipo === 'ingreso' ? '+' : '-'}{formatCOP(m.monto)}
                        </td>
                      </tr>
                    ))}
                    <tr className="font-medium border-t-2 border-border">
                      <td colSpan="3" className="py-2 text-right">Total ingresos:</td>
                      <td className="py-2 text-right font-mono text-green">+{formatCOP(resumen.total_movimientos_ingresos)}</td>
                    </tr>
                    <tr className="font-medium">
                      <td colSpan="3" className="py-1 text-right">Total egresos:</td>
                      <td className="py-1 text-right font-mono text-red">-{formatCOP(resumen.total_movimientos_egresos)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-3">Desglose de IVA</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Subtotal sin IVA</p>
                <p className="text-xl font-bold font-mono">{formatCOP(resumen.subtotal)}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">IVA 19%</p>
                <p className="text-xl font-bold font-mono text-red">{formatCOP(resumen.total_iva_19)}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">IVA 5%</p>
                <p className="text-xl font-bold font-mono text-yellow">{formatCOP(resumen.total_iva_5)}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-3">Desglose por medio de pago</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {MEDIOS_PAGO.map((mp) => (
                <div key={mp.value} className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 capitalize">{mp.label}</p>
                  <p className="text-lg font-bold font-mono">{formatCOP(resumen.desglose_pagos?.[mp.value] || 0)}</p>
                </div>
              ))}
            </div>
          </div>

          {resumen?.apertura?.estado === 'abierta' && (
            <>
              {showConsignacion && (
                <div className="card border-yellow/30 bg-yellow/5">
                  <h3 className="font-semibold text-yellow mb-3 flex items-center gap-2"><Landmark size={18} /> Registrar consignación bancaria</h3>
                  <p className="text-sm text-gray-500 mb-3">Registra la salida de efectivo que el dueño retiró para consignar al banco.</p>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700">$</span>
                    <input type="number" value={montoConsignacion} onChange={(e) => setMontoConsignacion(e.target.value)} className="input-field flex-1" placeholder="0" autoFocus />
                    <button onClick={handleConsignacion} disabled={!montoConsignacion || parseFloat(montoConsignacion) <= 0} className="btn-primary text-sm bg-yellow hover:bg-yellow/90 text-white">
                      Registrar
                    </button>
                    <button onClick={() => { setShowConsignacion(false); setMontoConsignacion(''); }} className="btn-secondary text-sm">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              <div className="card border-primary/30">
              <h3 className="font-semibold text-gray-800 mb-3">Arqueo de caja</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Efectivo esperado (ventas)</p>
                  <p className="text-xl font-bold font-mono">{formatCOP(resumen.efectivo_esperado)}</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Efectivo real en caja</p>
                  <p className={`text-xl font-bold font-mono ${resumen.efectivo_en_caja >= resumen.efectivo_esperado ? 'text-green' : 'text-red'}`}>
                    {formatCOP(resumen.efectivo_en_caja)}
                  </p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Diferencia</p>
                  <p className={`text-xl font-bold font-mono ${(resumen.efectivo_en_caja - resumen.efectivo_esperado) >= 0 ? 'text-green' : 'text-red'}`}>
                    {formatCOP(resumen.efectivo_en_caja - resumen.efectivo_esperado)}
                  </p>
                </div>
              </div>
            </div>
            </>
          )}

          {resumen.productos_rojos?.length > 0 && (
            <div className="card border-red/30">
              <h3 className="font-semibold text-red mb-3">Productos en rojo para reabastecer</h3>
              <div className="space-y-2">
                {resumen.productos_rojos.map((p) => (
                  <div key={p.nombre} className="flex items-center justify-between text-sm">
                    <span>{p.nombre}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 text-xs">Mín: {p.stock_minimo}</span>
                      <span className="badge-red">{p.stock}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

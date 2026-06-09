import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, CreditCard, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../services/api';
import Toast from '../components/Toast';

import { hoyColombia, inicioMesColombia, formatCOP } from '../utils/colombia';

const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white shadow-lg border border-border rounded-lg px-3 py-2 text-sm">
      <p className="text-gray-500 mb-1">{label}</p>
      <p className="font-medium text-gray-800 font-mono">
        {formatCOP(payload[0].value)}
      </p>
    </div>
  );
}

export default function Reportes() {
  const [desde, setDesde] = useState(inicioMesColombia());
  const [hasta, setHasta] = useState(hoyColombia());
  const [ventasDiarias, setVentasDiarias] = useState(null);
  const [productos, setProductos] = useState(null);
  const [metodosPago, setMetodosPago] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [toast, setToast] = useState(null);

  const cargar = () => {
    setCargando(true);
    const params = `?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`;
    Promise.allSettled([
      api.get(`/reportes/ventas-diarias${params}`),
      api.get(`/reportes/productos-mas-vendidos${params}&limite=20`),
      api.get(`/reportes/por-metodo-pago${params}`),
    ]).then(([r1, r2, r3]) => {
      if (r1.status === 'fulfilled') setVentasDiarias(r1.value.data);
      if (r2.status === 'fulfilled') setProductos(r2.value.data);
      if (r3.status === 'fulfilled') setMetodosPago(r3.value.data);
      if (r1.status === 'rejected' && r2.status === 'rejected' && r3.status === 'rejected') {
        setToast({ mensaje: 'Error al cargar reportes', tipo: 'error' });
      }
    }).finally(() => setCargando(false));
  };

  useEffect(() => { cargar(); }, []);

  return (
    <div className="p-6 space-y-6">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><BarChart3 size={20} className="text-blue" /> Reportes de ventas</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">Desde</label>
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="input-field text-sm w-36" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">Hasta</label>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="input-field text-sm w-36" />
          </div>
          <button onClick={cargar} className="btn-primary text-sm" disabled={cargando}>
            {cargando ? 'Cargando...' : 'Filtrar'}
          </button>
        </div>
      </div>

      {ventasDiarias?.totales && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card">
            <p className="text-gray-500 text-sm mb-1"><DollarSign size={14} className="inline" /> Total ventas</p>
            <p className="text-2xl font-bold font-mono text-gray-800">{formatCOP(ventasDiarias.totales.total)}</p>
          </div>
          <div className="card">
            <p className="text-gray-500 text-sm mb-1"><TrendingUp size={14} className="inline" /> Utilidad</p>
            <p className={`text-2xl font-bold font-mono ${ventasDiarias.totales.utilidad >= 0 ? 'text-green' : 'text-red'}`}>
              {formatCOP(ventasDiarias.totales.utilidad)}
            </p>
          </div>
          <div className="card">
            <p className="text-gray-500 text-sm mb-1"><CreditCard size={14} className="inline" /> Facturas</p>
            <p className="text-2xl font-bold text-gray-800">{ventasDiarias.totales.facturas}</p>
          </div>
          <div className="card">
            <p className="text-gray-500 text-sm mb-1">IVA 19%</p>
            <p className="text-2xl font-bold font-mono text-gray-800">{formatCOP(ventasDiarias.totales.iva_19)}</p>
          </div>
        </div>
      )}

      {ventasDiarias?.data?.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-3">Ventas por día</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ventasDiarias.data.map(v => ({ label: v.dia ? dias[new Date(v.dia + 'T00:00:00').getUTCDay()] + ' ' + v.dia.slice(5) : 'Sin fecha', total: v.total || 0 }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} interval={0} angle={-20} textAnchor="end" height={40} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={(v) => '$' + (v / 1000).toFixed(0) + 'k'} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-border bg-gray-50">
                  <th className="pb-2">Día</th>
                  <th className="pb-2 text-right">Facturas</th>
                  <th className="pb-2 text-right">Subtotal</th>
                  <th className="pb-2 text-right">IVA 19%</th>
                  <th className="pb-2 text-right">IVA 5%</th>
                  <th className="pb-2 text-right">Desc.</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {ventasDiarias.data.map((v) => (
                  <tr key={v.dia} className="border-b border-border/30 hover:bg-gray-50">
                    <td className="py-1.5 font-medium">{v.dia}</td>
                    <td className="py-1.5 text-right font-mono">{v.facturas}</td>
                    <td className="py-1.5 text-right font-mono">{formatCOP(v.subtotal)}</td>
                    <td className="py-1.5 text-right font-mono">{formatCOP(v.iva_19)}</td>
                    <td className="py-1.5 text-right font-mono">{formatCOP(v.iva_5)}</td>
                    <td className="py-1.5 text-right font-mono text-red">{formatCOP(v.descuentos)}</td>
                    <td className="py-1.5 text-right font-mono font-semibold">{formatCOP(v.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {productos?.length > 0 && (
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-3">Productos más vendidos</h3>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-left text-gray-500 border-b border-border">
                    <th className="pb-2">#</th>
                    <th className="pb-2">Producto</th>
                    <th className="pb-2 text-right">Cant.</th>
                    <th className="pb-2 text-right">Total</th>
                    <th className="pb-2 text-right">Utilidad</th>
                  </tr>
                </thead>
                <tbody>
                  {productos.map((p, i) => (
                    <tr key={p.id} className="border-b border-border/30 hover:bg-gray-50">
                      <td className="py-1.5 text-gray-400 w-8">{i + 1}</td>
                      <td className="py-1.5 font-medium">{p.nombre}</td>
                      <td className="py-1.5 text-right font-mono">{Math.round(p.cantidad_vendida)}</td>
                      <td className="py-1.5 text-right font-mono">{formatCOP(p.total_vendido)}</td>
                      <td className={`py-1.5 text-right font-mono ${p.utilidad >= 0 ? 'text-green' : 'text-red'}`}>
                        {formatCOP(p.utilidad)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {metodosPago?.length > 0 && (
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-3">Ventas por método de pago</h3>
            <div className="space-y-3">
              {metodosPago.map((m) => {
                const maxTotal = Math.max(...metodosPago.map(x => x.total), 1);
                const pct = (m.total / (ventasDiarias?.totales?.total || 1)) * 100;
                return (
                  <div key={m.medio_pago}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium capitalize">{m.medio_pago}</span>
                      <div className="text-right">
                        <span className="font-mono font-semibold">{formatCOP(m.total)}</span>
                        <span className="text-gray-400 ml-2">({pct.toFixed(1)}%)</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${(m.total / maxTotal) * 100}%`, backgroundColor: '#2563eb' }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{m.facturas} facturas</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

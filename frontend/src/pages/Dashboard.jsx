import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Flame, CircleX, CircleCheck, TriangleAlert, FileText, CreditCard, TrendingUp, DollarSign, BarChart3, Activity, Truck, Landmark, ChevronDown, ChevronUp, ShoppingCart, Receipt, PiggyBank } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import useAuth from '../hooks/useAuth';
import api from '../services/api';
import Toast from '../components/Toast';
import { hoyColombia, ayerColombia, haceDiasColombia, inicioMesColombia, formatCOP } from '../utils/colombia';

const MAX_VISIBLE = 2;
const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const PAGO_COLORS = {
  efectivo: '#16a34a', debito: '#2563eb', credito: '#dc2626',
  transferencia: '#7c3aed', nequi: '#db2777', daviplata: '#d97706',
  consignacion: '#ea580c',
};

const CHART_COLORS = ['#2563eb', '#16a34a', '#7c3aed', '#d97706', '#dc2626', '#db2777', '#0d9488', '#ea580c'];

function CustomTooltip({ active, payload, label, formato }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white shadow-lg border border-border rounded-lg px-3 py-2 text-sm">
      <p className="text-gray-500 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-medium text-gray-800">
          {p.name}: {formato === 'cop' ? formatCOP(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

function EmptyPlaceholder({ icon: Icon, mensaje }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <Icon size={36} className="mb-2.5 text-gray-200" />
      <p className="text-sm text-gray-400">{mensaje}</p>
    </div>
  );
}

function SkeletonCard() {
  return <div className="card animate-pulse space-y-3"><div className="h-3 bg-gray-200 rounded w-24" /><div className="h-7 bg-gray-200 rounded w-32" /></div>;
}

function KpiCard({ icon: Icon, iconBg, label, value, trend, trendLabel, color }) {
  return (
    <div className="card border-l-4 hover:shadow-md transition-shadow" style={{ borderLeftColor: color }}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold font-mono text-gray-800">{value}</p>
          {trend != null && (
            <p className={`text-xs font-medium ${trend >= 0 ? 'text-green' : 'text-red'}`}>
              <span>{trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}%</span>
              {trendLabel && <span className="text-gray-400 font-normal ml-1">vs {trendLabel}</span>}
            </p>
          )}
        </div>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: iconBg }}>
          <Icon size={20} color={color} />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { usuario } = useAuth();
  const [resumen, setResumen] = useState(null);
  const [reportes, setReportes] = useState(null);
  const [ticketData, setTicketData] = useState(null);
  const [stockProyeccion, setStockProyeccion] = useState(null);
  const [horasPico, setHorasPico] = useState(null);
  const [domiciliosHoy, setDomiciliosHoy] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [fechaSel, setFechaSel] = useState('hoy');
  const [showAll, setShowAll] = useState({});

  useEffect(() => {
    setCargando(true);
    const params = {};
    if (fechaSel === 'hoy') {
      params.desde = hoyColombia(); params.hasta = hoyColombia();
    } else if (fechaSel === 'ayer') {
      params.desde = ayerColombia(); params.hasta = ayerColombia();
    } else if (fechaSel === 'semana') {
      params.desde = haceDiasColombia(6); params.hasta = hoyColombia();
    } else {
      params.desde = inicioMesColombia(); params.hasta = hoyColombia();
    }
    Promise.allSettled([
        api.get('/caja/resumen', { params: fechaSel === 'ayer' ? { fecha: ayerColombia() } : {} }),
        api.get('/reportes/dashboard'),
        api.get('/reportes/ticket-promedio', { params }),
        api.get('/reportes/stock-proyeccion'),
        api.get('/reportes/horas-pico', { params }),
        api.get('/reportes/domicilios-hoy'),
      ]).then(([r1, r2, r3, r4, r5, r6]) => {
        if (r1.status === 'fulfilled') setResumen(r1.value.data);
        if (r2.status === 'fulfilled') setReportes(r2.value.data);
        if (r3.status === 'fulfilled') setTicketData(r3.value.data);
        if (r4.status === 'fulfilled') setStockProyeccion(r4.value.data);
        if (r5.status === 'fulfilled') setHorasPico(r5.value.data);
        if (r6.status === 'fulfilled') setDomiciliosHoy(r6.value.data);
        if (r1.status === 'rejected' || r2.status === 'rejected') {
          setError('No se pudo cargar el dashboard');
        }
      }).finally(() => setCargando(false));
  }, [fechaSel]);

  const toggleSection = (key) => setShowAll(prev => ({ ...prev, [key]: !prev[key] }));

  if (cargando) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 bg-gray-200 rounded w-64 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-40 animate-pulse" />
          </div>
          <div className="h-8 bg-gray-200 rounded w-64 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
        <div className="card animate-pulse">
          <div className="h-72 bg-gray-100 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      </div>
    );
  }

  const hoyData = reportes?.hoy;
  const ventasSemana = (reportes?.ventas_semana || []).map(d => ({
    ...d, dia_corto: new Date(d.dia + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'short', timeZone: 'America/Bogota' })
  }));
  const desglose = resumen?.desglose_pagos;
  const donutData = desglose ? Object.entries(desglose).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value })) : [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {error && <Toast mensaje={error} tipo="error" onClose={() => setError(null)} />}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Bienvenido, {usuario?.nombre}</h2>
          <p className="text-gray-400 text-sm">Resumen del negocio</p>
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg text-sm">
          {[
            { key: 'hoy', label: 'Hoy' },
            { key: 'ayer', label: 'Ayer' },
            { key: 'semana', label: 'Semana' },
            { key: 'mes', label: 'Mes' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setFechaSel(key)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${fechaSel === key ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {!reportes?.apertura_caja && (
        <div className="flex items-center gap-2 p-3 bg-red/5 border border-red/20 rounded-lg text-sm text-red font-medium">
          <CircleX size={16} /> Caja no abierta hoy
          <Link to="/caja" className="ml-2 underline font-semibold">Abrir caja</Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={DollarSign} iconBg="#eff6ff" color="#2563eb"
          label="Ventas" value={formatCOP(resumen?.total_ventas ?? hoyData?.total ?? 0)}
          trend={hoyData?.vs_ayer?.total} trendLabel="ayer" />
        <KpiCard icon={TrendingUp} iconBg="#f0fdf4" color="#16a34a"
          label="Utilidad" value={formatCOP(hoyData?.utilidad ?? 0)}
          trend={hoyData?.utilidad_vs_ayer} trendLabel="ayer" />
        <KpiCard icon={Receipt} iconBg="#fef2f2" color="#dc2626"
          label="Facturas" value={resumen?.total_facturas ?? hoyData?.facturas ?? 0}
          trend={hoyData?.vs_ayer?.facturas} trendLabel="ayer" />
        <KpiCard icon={ShoppingCart} iconBg="#f5f3ff" color="#7c3aed"
          label="Ticket Promedio" value={formatCOP(ticketData?.promedio_general ?? 0)}
          trend={ticketData?.variacion} trendLabel="mes ant." />
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <BarChart3 size={18} className="text-primary" /> Ventas últimos 7 días
        </h3>
        {ventasSemana.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={ventasSemana} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="ventasGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="dia_corto" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => '$' + (v / 1000).toFixed(0) + 'k'} />
              <Tooltip content={<CustomTooltip formato="cop" />} />
              <Area type="monotone" dataKey="total" name="Ventas" stroke="#2563eb" strokeWidth={2} fill="url(#ventasGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyPlaceholder icon={BarChart3} mensaje="Factura para ver la tendencia de ventas" />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2 text-sm">
            <TrendingUp size={16} className="text-green" /> Progreso del día
          </h3>
          {reportes?.promedios?.diario > 0 && fechaSel === 'hoy' ? (
            <div className="space-y-2">
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((hoyData?.total ?? 0) / reportes.promedios.diario * 100, 100)}%` }} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-mono font-medium text-gray-800">{formatCOP(hoyData?.total ?? 0)}</span>
                <span className="text-gray-400 font-mono">{formatCOP(reportes.promedios.diario)}</span>
              </div>
              <p className="text-xs text-gray-400">Promedio diario (30 días) — {(Math.round((hoyData?.total ?? 0) / reportes.promedios.diario * 100))}% cumplido</p>
            </div>
          ) : (
            <EmptyPlaceholder icon={TrendingUp} mensaje="Factura más seguido para ver tu progreso" />
          )}
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2 text-sm">
            <Truck size={16} className="text-primary" /> Domicilios hoy
          </h3>
          {domiciliosHoy ? (
            <>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-yellow/5 rounded-lg py-2">
                  <p className="text-lg font-bold text-yellow">{domiciliosHoy.pendientes}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">Pend.</p>
                </div>
                <div className="bg-primary/5 rounded-lg py-2">
                  <p className="text-lg font-bold text-primary">{domiciliosHoy.camino}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">Camino</p>
                </div>
                <div className="bg-green/5 rounded-lg py-2">
                  <p className="text-lg font-bold text-green">{domiciliosHoy.entregados}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">Entreg.</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-sm">
                <span className="text-gray-500">Total: <strong className="text-gray-800">{domiciliosHoy.total}</strong></span>
                <span className="font-mono text-gray-800 font-medium">{formatCOP(domiciliosHoy.monto_total)}</span>
              </div>
            </>
          ) : (
            <EmptyPlaceholder icon={Truck} mensaje="No hay domicilios registrados hoy" />
          )}
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2 text-sm">
            <CreditCard size={16} className="text-red" /> Créditos pendientes
          </h3>
          {reportes?.creditos_pendientes?.cantidad > 0 ? (
            <>
              <p className="text-2xl font-bold font-mono text-red">{formatCOP(reportes.creditos_pendientes.total)}</p>
              <p className="text-sm text-gray-500 mt-1">{reportes.creditos_pendientes.cantidad} facturas</p>
              <Link to="/creditos" className="mt-3 inline-block text-xs text-primary font-medium hover:underline">Ir a Créditos →</Link>
            </>
          ) : (
            <EmptyPlaceholder icon={CreditCard} mensaje="No hay créditos pendientes" />
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Landmark size={18} className="text-primary" /> Métodos de pago
        </h3>
        {donutData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value"
                  animationBegin={0} animationDuration={800}>
                  {donutData.map((entry) => (
                    <Cell key={entry.name} fill={PAGO_COLORS[entry.name] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip formato="cop" />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {donutData.map(({ name, value }) => (
                <div key={name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: PAGO_COLORS[name] || '#94a3b8' }} />
                    <span className="capitalize text-gray-600">{name}</span>
                  </div>
                  <span className="font-mono font-medium text-gray-800">{formatCOP(value)}</span>
                </div>
              ))}
              {(resumen?.movimientos || []).filter(m => m.concepto === 'Consignación bancaria').length > 0 && (
                <div className="flex items-center gap-2 pt-2 mt-2 border-t border-border text-xs text-yellow">
                  <Landmark size={12} /> Consignación bancaria: {formatCOP(
                    resumen.movimientos.filter(m => m.concepto === 'Consignación bancaria').reduce((s, m) => s + m.monto, 0)
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <EmptyPlaceholder icon={Landmark} mensaje="Factura para ver el desglose de métodos de pago" />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2 text-sm">
            <BarChart3 size={16} className="text-purple-600" /> Días fuertes
          </h3>
          {reportes?.dias_fuertes?.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dias.map((nombre, i) => {
                  const found = reportes.dias_fuertes.find(d => d.dia_semana === i);
                  return { dia: nombre, promedio: found?.promedio || 0 };
                })} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="dia" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => '$' + (v / 1000).toFixed(0) + 'k'} />
                  <Tooltip content={<CustomTooltip formato="cop" />} />
                  <Bar dataKey="promedio" name="Promedio" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-gray-400 mt-2">Promedio por día (últimas 4 semanas)</p>
            </>
          ) : (
            <EmptyPlaceholder icon={BarChart3} mensaje="Factura más días para ver tus días fuertes" />
          )}
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2 text-sm">
            <Activity size={16} className="text-primary" /> Horas pico
          </h3>
          {horasPico?.horas?.some(h => h.transacciones > 0) ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={horasPico.horas.filter(h => h.transacciones > 0)} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip formato="number" />} />
                  <Bar dataKey="transacciones" name="Transacciones" fill="#2563eb" radius={[3, 3, 0, 0]}>
                    {horasPico.horas.filter(h => h.transacciones > 0).map((entry, i) => (
                      <Cell key={i} fill={entry.hora === horasPico.hora_pico ? '#2563eb' : '#93c5fd'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {horasPico.hora_pico !== null && (
                <p className="mt-2 text-xs text-primary font-medium">
                  Hora pico: {horasPico.horas.find(h => h.hora === horasPico.hora_pico)?.label} — {horasPico.transacciones_pico} transacciones
                </p>
              )}
            </>
          ) : (
            <EmptyPlaceholder icon={Activity} mensaje="Aún no hay datos de horas pico" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm"><Flame size={16} className="text-orange" /> Más vendidos</h3>
            {resumen?.top_productos?.length > MAX_VISIBLE && showAll.top && (
              <button onClick={() => toggleSection('top')} className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                Ver menos <ChevronUp size={14} />
              </button>
            )}
          </div>
          {resumen?.top_productos?.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-border bg-gray-50 text-xs uppercase tracking-wide">
                      <th className="pb-2 font-medium">#</th>
                      <th className="pb-2 font-medium">Producto</th>
                      <th className="pb-2 text-right font-medium">Vendido</th>
                      <th className="pb-2 text-center font-medium">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(showAll.top ? resumen.top_productos : resumen.top_productos.slice(0, MAX_VISIBLE)).map((p, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-gray-50/50">
                        <td className="py-2 text-gray-400 w-8">{i + 1}</td>
                        <td className="py-2 font-medium text-gray-800">{p.nombre}</td>
                        <td className="py-2 text-right font-mono text-gray-800">{formatCOP(p.total_vendido)}</td>
                        <td className="py-2 text-center">
                          {p.stock <= 0 ? <span className="text-red font-medium flex items-center justify-center gap-1 text-xs"><CircleX size={12} /> {p.stock}</span>
                            : p.stock <= p.stock_minimo ? <span className="text-yellow font-medium flex items-center justify-center gap-1 text-xs"><TriangleAlert size={12} /> {p.stock}</span>
                            : <span className="text-green font-medium flex items-center justify-center gap-1 text-xs"><CircleCheck size={12} /> {p.stock}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!showAll.top && resumen.top_productos.length > MAX_VISIBLE && (
                <button onClick={() => toggleSection('top')} className="mt-2 text-xs text-primary font-medium hover:underline flex items-center gap-1">
                  Ver {resumen.top_productos.length} <ChevronDown size={14} />
                </button>
              )}
            </>
          ) : (
            <EmptyPlaceholder icon={Flame} mensaje="Crea facturas para ver los más vendidos" />
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm"><FileText size={16} className="text-primary" /> Últimas facturas</h3>
            {resumen?.ultimas_facturas?.length > MAX_VISIBLE && showAll.fact && (
              <button onClick={() => toggleSection('fact')} className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                Ver menos <ChevronUp size={14} />
              </button>
            )}
          </div>
          {resumen?.ultimas_facturas?.length > 0 ? (
            <>
              <div className="space-y-1">
                {(showAll.fact ? resumen.ultimas_facturas : resumen.ultimas_facturas.slice(0, MAX_VISIBLE)).map((f) => (
                  <div key={f.id} className="flex items-center justify-between py-2 text-sm border-b border-border/30 last:border-0">
                    <span className="font-mono text-gray-400 w-20 text-xs">{f.numero}</span>
                    <span className="font-mono font-medium text-gray-800 w-24 text-right">{formatCOP(f.total)}</span>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full w-18 text-center capitalize ${f.medio_pago === 'efectivo' ? 'bg-green/10 text-green' : f.medio_pago === 'debito' ? 'bg-primary/10 text-primary' : f.medio_pago === 'credito' ? 'bg-red/10 text-red' : 'bg-purple/10 text-purple'}`}>
                      {f.medio_pago}
                    </span>
                    <span className="text-gray-500 flex-1 text-right truncate ml-2 text-xs">{f.cliente_nombre}</span>
                  </div>
                ))}
              </div>
              {!showAll.fact && resumen.ultimas_facturas.length > MAX_VISIBLE && (
                <button onClick={() => toggleSection('fact')} className="mt-2 text-xs text-primary font-medium hover:underline flex items-center gap-1">
                  Ver {resumen.ultimas_facturas.length} <ChevronDown size={14} />
                </button>
              )}
            </>
          ) : (
            <EmptyPlaceholder icon={FileText} mensaje="No hay facturas recientes" />
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2 text-sm"><TriangleAlert size={16} className="text-yellow" /> Stock con proyección</h3>
        {stockProyeccion?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-border bg-gray-50 text-xs uppercase tracking-wide">
                  <th className="pb-2 font-medium">Producto</th>
                  <th className="pb-2 font-medium">Estado</th>
                  <th className="pb-2 text-right font-medium">Stock</th>
                  <th className="pb-2 text-right font-medium">Vendido 7d</th>
                  <th className="pb-2 text-right font-medium">Ritmo/día</th>
                  <th className="pb-2 text-right font-medium">Se acaba en</th>
                </tr>
              </thead>
              <tbody>
                {stockProyeccion.map((p) => {
                  const ritmo = (p.vendido_7dias / 7).toFixed(1);
                  const critico = p.dias_restantes <= 3;
                  const alerta = p.dias_restantes <= 7 && p.dias_restantes > 3;
                  const agotado = p.stock <= 0;
                  const bajo = p.stock > 0 && p.stock <= p.stock_minimo;
                  return (
                    <tr key={p.id} className="border-b border-border/30 hover:bg-gray-50/50">
                      <td className="py-2 font-medium text-gray-800">{p.nombre}</td>
                      <td className="py-2">
                        {agotado ? <span className="badge-red">Agotado</span>
                          : bajo ? <span className="badge-yellow">Crítico</span>
                          : <span className="badge-green">Bien</span>}
                      </td>
                      <td className="py-2 text-right font-mono text-gray-800">{p.stock}</td>
                      <td className="py-2 text-right font-mono text-gray-800">{p.vendido_7dias}</td>
                      <td className="py-2 text-right font-mono text-gray-500">{ritmo}</td>
                      <td className="py-2 text-right">
                        <span className={`font-mono font-semibold text-xs px-2 py-0.5 rounded ${critico ? 'bg-red/10 text-red' : alerta ? 'bg-yellow/10 text-yellow' : 'text-green'}`}>
                          {p.dias_restantes <= 30 ? `${p.dias_restantes} días` : '+30 días'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyPlaceholder icon={TriangleAlert} mensaje="No hay productos con proyección de stock" />
        )}
      </div>

      {resumen?.productos_rojos?.length > 0 && (
        <div className="card border-l-4 border-red">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CircleX size={16} className="text-red" />
              <span className="font-medium text-red text-sm">{resumen.productos_rojos.length} producto(s) agotado(s)</span>
            </div>
            <Link to="/inventario" className="text-xs text-primary font-medium hover:underline">Ir a Inventario →</Link>
          </div>
        </div>
      )}
    </div>
  );
}

const db = require('../config/db');
const { CO, hoyColombia } = require('../config/timezone');

const colFecha = (n) => new Date(Date.now() + n).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

const dashboard = (req, res) => {
  try {
    const hoy = hoyColombia();
    const ayer = colFecha(-86400000);
    const semanaPasada = colFecha(-7 * 86400000);

    const ventasHoy = db.prepare(`
      SELECT COUNT(*) as facturas,
             COALESCE(SUM(total), 0) as total,
             COALESCE(SUM(subtotal), 0) as subtotal,
             COALESCE(SUM(iva_19), 0) as iva_19,
             COALESCE(SUM(iva_5), 0) as iva_5,
             COALESCE(SUM(descuento), 0) as descuentos
      FROM facturas
      WHERE DATE(fecha, '${CO}') = ? AND estado = 'activa'
    `).get(hoy);

    const utilidadHoy = db.prepare(`
      SELECT COALESCE(SUM(i.total - (i.cantidad * COALESCE(p.costo, 0) * COALESCE(pres.factor, 1))), 0) as utilidad
      FROM items_factura i
      JOIN facturas f ON i.factura_id = f.id
      JOIN productos p ON i.producto_id = p.id
      LEFT JOIN presentaciones pres ON i.presentacion_id = pres.id
      WHERE DATE(f.fecha, '${CO}') = ? AND f.estado = 'activa'
    `).get(hoy);

    const utilidadAyer = db.prepare(`
      SELECT COALESCE(SUM(i.total - (i.cantidad * COALESCE(p.costo, 0) * COALESCE(pres.factor, 1))), 0) as utilidad
      FROM items_factura i
      JOIN facturas f ON i.factura_id = f.id
      JOIN productos p ON i.producto_id = p.id
      LEFT JOIN presentaciones pres ON i.presentacion_id = pres.id
      WHERE DATE(f.fecha, '${CO}') = ? AND f.estado = 'activa'
    `).get(ayer);

    const gastosHoy = db.prepare(`
      SELECT COALESCE(SUM(monto), 0) as total_gastos
      FROM gastos WHERE DATE(fecha, '${CO}') = ?
    `).get(hoy);

    const creditosPendientes = db.prepare(`
      SELECT COUNT(*) as cantidad,
             COALESCE(SUM(saldo_pendiente), 0) as total_pendiente
      FROM creditos WHERE estado = 'activo'
    `).get();

    const apertura = db.prepare(`
      SELECT * FROM apertura_caja
      WHERE DATE(fecha_apertura, '${CO}') = ? ORDER BY id DESC LIMIT 1
    `).get(hoy);

    const ventasSemana = db.prepare(`
      SELECT DATE(fecha, '${CO}') as dia,
             COUNT(*) as facturas,
             COALESCE(SUM(total), 0) as total
      FROM facturas
      WHERE datetime(fecha) >= datetime('now', '${CO}', '-6 days') AND estado = 'activa'
      GROUP BY DATE(fecha, '${CO}')
      ORDER BY dia ASC
    `).all();

    const vAyer = db.prepare(`
      SELECT COUNT(*) as facturas, COALESCE(SUM(total), 0) as total
      FROM facturas WHERE DATE(fecha, '${CO}') = ? AND estado = 'activa'
    `).get(ayer);

    const vSemanaPasada = db.prepare(`
      SELECT COUNT(*) as facturas, COALESCE(SUM(total), 0) as total
      FROM facturas WHERE DATE(fecha, '${CO}') = ? AND estado = 'activa'
    `).get(semanaPasada);

    const promedio30d = db.prepare(`
      SELECT ROUND(AVG(diario)) as promedio
      FROM (
        SELECT SUM(total) as diario
        FROM facturas
        WHERE datetime(fecha) >= datetime('now', '${CO}', '-30 days') AND estado = 'activa'
        GROUP BY DATE(fecha, '${CO}')
      )
    `).get();

    const diasFuertes = db.prepare(`
      SELECT CAST(strftime('%w', fecha, '${CO}') AS INTEGER) as dia_semana,
             ROUND(AVG(total), 0) as promedio
      FROM facturas
      WHERE datetime(fecha) >= datetime('now', '${CO}', '-28 days') AND estado = 'activa'
      GROUP BY dia_semana
      ORDER BY dia_semana
    `).all();

    const totalesGlobales = db.prepare(`
      SELECT COUNT(*) as total_facturas,
             COALESCE(SUM(total), 0) as total_ventas
      FROM facturas WHERE estado = 'activa'
    `).get();

    const calcVar = (actual, anterior) => anterior > 0 ? Math.round(((actual - anterior) / anterior) * 10000) / 100 : 0;

    res.json({
      hoy: {
        facturas: ventasHoy.facturas,
        total: ventasHoy.total,
        subtotal: ventasHoy.subtotal,
        iva_19: ventasHoy.iva_19,
        iva_5: ventasHoy.iva_5,
        descuentos: ventasHoy.descuentos,
        utilidad: utilidadHoy.utilidad,
        gastos: gastosHoy.total_gastos,
        vs_ayer: { total: calcVar(ventasHoy.total, vAyer.total), facturas: calcVar(ventasHoy.facturas, vAyer.facturas) },
        vs_semana: { total: calcVar(ventasHoy.total, vSemanaPasada.total), facturas: calcVar(ventasHoy.facturas, vSemanaPasada.facturas) },
        utilidad_vs_ayer: calcVar(utilidadHoy.utilidad, utilidadAyer.utilidad),
      },
      creditos_pendientes: {
        cantidad: creditosPendientes.cantidad,
        total: creditosPendientes.total_pendiente,
      },
      apertura_caja: apertura || null,
      ventas_semana: ventasSemana,
      dias_fuertes: diasFuertes,
      promedios: {
        diario: promedio30d.promedio || 0,
      },
      totales: {
        facturas: totalesGlobales.total_facturas,
        ventas: totalesGlobales.total_ventas,
      },
    });
  } catch (err) {
    console.error('Error en dashboard:', err);
    res.status(500).json({ error: 'Error al cargar dashboard' });
  }
};

const ventasDiarias = (req, res) => {
  try {
    const { desde, hasta } = req.query;
    const d = desde || colFecha(-30 * 86400000);
    const h = hasta || hoyColombia();

    const rows = db.prepare(`
      SELECT DATE(fecha, '${CO}') as dia,
             COUNT(*) as facturas,
             COALESCE(SUM(subtotal), 0) as subtotal,
             COALESCE(SUM(iva_19), 0) as iva_19,
             COALESCE(SUM(iva_5), 0) as iva_5,
             COALESCE(SUM(descuento), 0) as descuentos,
             COALESCE(SUM(total), 0) as total
      FROM facturas
      WHERE DATE(fecha, '${CO}') BETWEEN ? AND ? AND estado = 'activa'
      GROUP BY DATE(fecha, '${CO}')
      ORDER BY dia ASC
    `).all(d, h);

    const totales = db.prepare(`
      SELECT COUNT(*) as facturas,
             COALESCE(SUM(subtotal), 0) as subtotal,
             COALESCE(SUM(iva_19), 0) as iva_19,
             COALESCE(SUM(iva_5), 0) as iva_5,
             COALESCE(SUM(descuento), 0) as descuentos,
             COALESCE(SUM(total), 0) as total,
             COALESCE(SUM((SELECT COALESCE(SUM(i2.total - (i2.cantidad * COALESCE(p2.costo, 0) * COALESCE(pres2.factor, 1))), 0)
                                      FROM items_factura i2
                                      JOIN productos p2 ON i2.producto_id = p2.id
                                      LEFT JOIN presentaciones pres2 ON i2.presentacion_id = pres2.id
                                      WHERE i2.factura_id = facturas.id)), 0) as utilidad
      FROM facturas
      WHERE DATE(fecha, '${CO}') BETWEEN ? AND ? AND estado = 'activa'
    `).get(d, h);

    res.json({ data: rows, totales });
  } catch (err) {
    console.error('Error en ventas-diarias:', err);
    res.status(500).json({ error: 'Error al cargar ventas diarias' });
  }
};

const productosMasVendidos = (req, res) => {
  try {
    const { desde, hasta, limite = 20 } = req.query;
    const d = desde || colFecha(-30 * 86400000);
    const h = hasta || hoyColombia();
    const lim = Math.min(100, Math.max(1, parseInt(limite) || 20));

    const rows = db.prepare(`
      SELECT p.id, p.nombre, p.codigo_interno, p.stock, p.stock_minimo,
             SUM(i.cantidad) as cantidad_vendida,
             SUM(i.total) as total_vendido,
             SUM(i.total - (i.cantidad * COALESCE(p.costo, 0) * COALESCE(pres.factor, 1))) as utilidad
      FROM items_factura i
      JOIN facturas f ON i.factura_id = f.id
      JOIN productos p ON i.producto_id = p.id
      LEFT JOIN presentaciones pres ON i.presentacion_id = pres.id
      WHERE DATE(f.fecha, '${CO}') BETWEEN ? AND ? AND f.estado = 'activa'
      GROUP BY i.producto_id
      ORDER BY cantidad_vendida DESC
      LIMIT ?
    `).all(d, h, lim);

    res.json(rows);
  } catch (err) {
    console.error('Error en productos-mas-vendidos:', err);
    res.status(500).json({ error: 'Error al cargar productos más vendidos' });
  }
};

const porMetodoPago = (req, res) => {
  try {
    const { desde, hasta } = req.query;
    const d = desde || colFecha(-30 * 86400000);
    const h = hasta || hoyColombia();

    const rows = db.prepare(`
      SELECT medio_pago,
             COUNT(*) as facturas,
             COALESCE(SUM(total), 0) as total
      FROM facturas
      WHERE DATE(fecha, '${CO}') BETWEEN ? AND ? AND estado = 'activa'
      GROUP BY medio_pago
      ORDER BY total DESC
    `).all(d, h);

    res.json(rows);
  } catch (err) {
    console.error('Error en por-metodo-pago:', err);
    res.status(500).json({ error: 'Error al cargar por método de pago' });
  }
};

const ticketPromedio = (req, res) => {
  try {
    const { desde, hasta } = req.query;
    const d = desde || colFecha(-30 * 86400000);
    const h = hasta || hoyColombia();

    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    const porDia = db.prepare(`
      SELECT CAST(strftime('%w', fecha) AS INTEGER) as dia_semana,
             COUNT(*) as facturas,
             COALESCE(SUM(total), 0) as total,
             ROUND(AVG(total), 0) as ticket_promedio
      FROM facturas
      WHERE DATE(fecha, '${CO}') BETWEEN ? AND ? AND estado = 'activa'
      GROUP BY dia_semana
      ORDER BY dia_semana
    `).all(d, h);

    const general = db.prepare(`
      SELECT COUNT(*) as facturas,
             COALESCE(SUM(total), 0) as total,
             ROUND(AVG(total), 0) as ticket_promedio
      FROM facturas
      WHERE DATE(fecha, '${CO}') BETWEEN ? AND ? AND estado = 'activa'
    `).get(d, h);

    const diffDays = Math.round((new Date(h) - new Date(d)) / 86400000) + 1;
    const prevEnd = new Date(new Date(d).getTime() - 86400000);
    const prevStart = new Date(prevEnd.getTime() - (diffDays - 1) * 86400000);
    const pd = prevStart.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
    const ph = prevEnd.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

    const anterior = db.prepare(`
      SELECT COALESCE(AVG(total), 0) as ticket_promedio
      FROM facturas
      WHERE DATE(fecha, '${CO}') BETWEEN ? AND ? AND estado = 'activa'
    `).get(pd, ph);

    const promAnt = Math.round(anterior.ticket_promedio);
    const promGen = general.ticket_promedio;
    const variacion = promAnt > 0 ? Math.round(((promGen - promAnt) / promAnt) * 100 * 100) / 100 : 0;

    const fill = dias.map((nombre, i) => {
      const found = porDia.find(d => d.dia_semana === i);
      return found ? { ...found, dia_nombre: nombre } : { dia_semana: i, dia_nombre: nombre, facturas: 0, total: 0, ticket_promedio: 0 };
    });

    res.json({
      por_dia: fill,
      promedio_general: promGen,
      promedio_anterior: promAnt,
      variacion,
    });
  } catch (err) {
    console.error('Error en ticket-promedio:', err);
    res.status(500).json({ error: 'Error al cargar ticket promedio' });
  }
};

const stockProyeccion = (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT p.id, p.nombre, p.codigo_interno, p.categoria_id,
             p.stock, p.stock_minimo, p.costo,
             COALESCE(SUM(i.cantidad), 0) as vendido_7dias,
             ROUND(p.stock * 1.0 / MAX(COALESCE(SUM(i.cantidad), 0) / 7.0, 0.01), 0) as dias_restantes
      FROM productos p
      LEFT JOIN items_factura i ON p.id = i.producto_id
      LEFT JOIN facturas f ON i.factura_id = f.id
        AND DATE(f.fecha, '${CO}') >= DATE('now', '${CO}', '-7 days')
        AND f.estado = 'activa'
      WHERE p.activo = 1
      GROUP BY p.id
      HAVING vendido_7dias > 0
      ORDER BY dias_restantes ASC
      LIMIT 15
    `).all();

    res.json(rows);
  } catch (err) {
    console.error('Error en stock-proyeccion:', err);
    res.status(500).json({ error: 'Error al cargar proyección de stock' });
  }
};

const horasPico = (req, res) => {
  try {
    const { desde, hasta } = req.query;
    const d = desde || colFecha(-30 * 86400000);
    const h = hasta || hoyColombia();

    const rows = db.prepare(`
      SELECT CAST(strftime('%H', datetime(fecha, '${CO}')) AS INTEGER) as hora,
             COUNT(*) as transacciones,
             COALESCE(SUM(total), 0) as total
      FROM facturas
      WHERE DATE(fecha, '${CO}') BETWEEN ? AND ? AND estado = 'activa'
      GROUP BY hora
      ORDER BY hora ASC
    `).all(d, h);

    const horaPico = rows.reduce((max, r) => r.transacciones > max.transacciones ? r : max, rows[0] || null);

    const horasCompletas = [];
    for (let i = 0; i <= 23; i++) {
      const found = rows.find(r => r.hora === i);
      horasCompletas.push({
        hora: i,
        label: i === 0 ? '12AM' : i < 12 ? i + 'AM' : i === 12 ? '12PM' : (i - 12) + 'PM',
        transacciones: found?.transacciones || 0,
        total: found?.total || 0,
      });
    }

    res.json({
      horas: horasCompletas,
      hora_pico: horaPico?.hora ?? null,
      transacciones_pico: horaPico?.transacciones || 0,
    });
  } catch (err) {
    console.error('Error en horas-pico:', err);
    res.status(500).json({ error: 'Error al cargar horas pico' });
  }
};

const domiciliosHoy = (req, res) => {
  try {
    const data = db.prepare(`
      SELECT
        COUNT(*) as total,
        COALESCE(SUM(CASE WHEN d.estado = 'pendiente' THEN 1 ELSE 0 END), 0) as pendientes,
        COALESCE(SUM(CASE WHEN d.estado = 'camino' THEN 1 ELSE 0 END), 0) as camino,
        COALESCE(SUM(CASE WHEN d.estado = 'entregado' THEN 1 ELSE 0 END), 0) as entregados,
        COALESCE(SUM(f.total), 0) as monto_total
      FROM domicilios d
      JOIN facturas f ON f.id = d.factura_id
      WHERE DATE(f.fecha, '${CO}') = DATE('now', '${CO}') AND f.estado = 'activa'
    `).get();
    res.json(data);
  } catch (err) {
    console.error('Error en domicilios-hoy:', err);
    res.status(500).json({ error: 'Error al cargar domicilios del día' });
  }
};

module.exports = { dashboard, ventasDiarias, productosMasVendidos, porMetodoPago, ticketPromedio, stockProyeccion, horasPico, domiciliosHoy };

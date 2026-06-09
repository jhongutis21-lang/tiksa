const db = require('../config/db');
const auditar = require('../utils/auditar');
const { CO, colombiaNow, hoyColombia } = require('../config/timezone');

const resumen = (req, res) => {
  try {
    const { fecha } = req.query;
    const fechaFiltro = fecha || hoyColombia();

    const ventas = db.prepare(`
      SELECT
        COUNT(CASE WHEN estado != 'eliminada' THEN 1 END) as total_facturas,
        COALESCE(SUM(CASE WHEN estado = 'activa' THEN total ELSE 0 END), 0) as total_ventas,
        COALESCE(SUM(CASE WHEN estado = 'activa' AND tipo = 'POS' THEN total ELSE 0 END), 0) as total_pos,
        COALESCE(SUM(CASE WHEN estado = 'activa' AND tipo = 'PE' THEN total ELSE 0 END), 0) as total_pe,
        COALESCE(SUM(CASE WHEN estado = 'activa' THEN subtotal ELSE 0 END), 0) as subtotal,
        COALESCE(SUM(CASE WHEN estado = 'activa' THEN iva_19 ELSE 0 END), 0) as total_iva_19,
        COALESCE(SUM(CASE WHEN estado = 'activa' THEN iva_5 ELSE 0 END), 0) as total_iva_5
      FROM facturas
      WHERE DATE(fecha, '${CO}') = ?
    `).get(fechaFiltro);

    const pagos = db.prepare(`
      SELECT medio_pago, COALESCE(SUM(total), 0) as total
      FROM facturas
      WHERE DATE(fecha, '${CO}') = ? AND estado = 'activa'
      GROUP BY medio_pago
    `).all(fechaFiltro);

    const domiciliosEntregados = db.prepare(`
      SELECT COUNT(*) as total
      FROM domicilios d JOIN facturas f ON d.factura_id = f.id
      WHERE DATE(f.fecha, '${CO}') = ? AND d.estado = 'entregado'
    `).get(fechaFiltro);

    const rojos = db.prepare(`
      SELECT p.nombre, p.stock, p.stock_minimo
      FROM productos p
      WHERE p.stock <= 0 AND p.activo = 1
      ORDER BY p.stock ASC
      LIMIT 50
    `).all();

    const topProductos = db.prepare(`
      SELECT p.nombre, p.stock, p.stock_minimo,
             SUM(i.cantidad) as cant_vendida,
             SUM(i.total) as total_vendido
      FROM items_factura i
      JOIN facturas f ON i.factura_id = f.id
      JOIN productos p ON i.producto_id = p.id
      WHERE DATE(f.fecha, '${CO}') = ? AND f.estado = 'activa'
      GROUP BY i.producto_id
      ORDER BY total_vendido DESC
      LIMIT 10
    `).all(fechaFiltro);

    const ultimasFacturas = db.prepare(`
      SELECT f.id, f.numero, f.total, f.medio_pago, f.estado,
             c.nombre as cliente_nombre
      FROM facturas f
      JOIN clientes c ON f.cliente_id = c.id
      WHERE DATE(f.fecha, '${CO}') = ? AND f.estado != 'eliminada'
      ORDER BY f.fecha DESC
      LIMIT 5
    `).all(fechaFiltro);

    const amarillos = db.prepare(`
      SELECT p.nombre, p.stock, p.stock_minimo,
             ROUND((p.stock * 1.0 / p.stock_minimo) * 100, 0) as porcentaje
      FROM productos p
      WHERE p.stock > 0 AND p.stock <= p.stock_minimo AND p.activo = 1
      ORDER BY porcentaje ASC
      LIMIT 20
    `).all();

    const gastosHoy = db.prepare(`
      SELECT COALESCE(SUM(monto), 0) as total_gastos
      FROM gastos WHERE DATE(fecha, '${CO}') = ?
    `).get(fechaFiltro);

    const apertura = db.prepare(`
      SELECT * FROM apertura_caja
      WHERE DATE(fecha_apertura, '${CO}') = ? ORDER BY id DESC LIMIT 1
    `).get(fechaFiltro);

    const movimientos = apertura ? db.prepare(`
      SELECT * FROM movimientos_caja WHERE apertura_id = ? ORDER BY fecha ASC
    `).all(apertura.id) : [];

    const totalMovimientos = movimientos.reduce((acc, m) => {
      if (m.tipo === 'ingreso') acc.ingresos += m.monto;
      else acc.egresos += m.monto;
      return acc;
    }, { ingresos: 0, egresos: 0 });

    const resumenPagos = {};
    for (const row of pagos) {
      resumenPagos[row.medio_pago] = row.total;
    }

    const consignaciones = movimientos
      .filter(m => m.tipo === 'egreso' && m.concepto === 'Consignación bancaria')
      .reduce((sum, m) => sum + m.monto, 0);
    const efectivoReal = (resumenPagos.efectivo || 0) + (apertura?.monto_inicial || 0) + totalMovimientos.ingresos - totalMovimientos.egresos;
    const efectivoEsperado = (resumenPagos.efectivo || 0) - consignaciones;

    res.json({
      total_facturas: ventas.total_facturas,
      total_ventas: ventas.total_ventas,
      total_pos: ventas.total_pos,
      total_pe: ventas.total_pe,
      subtotal: ventas.subtotal,
      total_iva_19: ventas.total_iva_19,
      total_iva_5: ventas.total_iva_5,
      desglose_pagos: resumenPagos,
      domicilios_entregados: domiciliosEntregados.total,
      productos_rojos: rojos,
      top_productos: topProductos,
      ultimas_facturas: ultimasFacturas,
      productos_amarillos: amarillos,
      total_gastos: gastosHoy.total_gastos,
      utilidad: ventas.total_ventas - gastosHoy.total_gastos,
      apertura,
      movimientos,
      total_movimientos_ingresos: totalMovimientos.ingresos,
      total_movimientos_egresos: totalMovimientos.egresos,
      efectivo_en_caja: efectivoReal,
      efectivo_esperado: efectivoEsperado
    });
  } catch (err) {
    console.error('Error al obtener resumen de caja:', err);
    res.status(500).json({ error: 'Error al obtener resumen de caja' });
  }
};

const abrir = (req, res) => {
  try {
    const { monto_inicial, observaciones } = req.body;
    const hoy = hoyColombia();

    const existente = db.prepare(`
      SELECT id FROM apertura_caja
      WHERE DATE(fecha_apertura, '${CO}') = ? AND estado = 'abierta' LIMIT 1
    `).get(hoy);

    if (existente) return res.status(400).json({ error: 'Ya hay una apertura de caja activa para hoy' });

    const info = db.prepare(`
      INSERT INTO apertura_caja (usuario_id, monto_inicial, observaciones)
      VALUES (?,?,?)
    `).run(req.usuario.id, monto_inicial || 0, observaciones || '');

    const row = db.prepare('SELECT * FROM apertura_caja WHERE id = ?').get(info.lastInsertRowid);
    req.usuario.ip = req.ip;
    auditar(req.usuario, 'caja_abierta', `Monto inicial: $${(monto_inicial || 0).toLocaleString('es-CO')}`);
    res.status(201).json(row);
  } catch (err) {
    console.error('Error al abrir caja:', err);
    res.status(500).json({ error: 'Error al abrir caja' });
  }
};

const cerrar = (req, res) => {
  try {
    const hoy = hoyColombia();
    const apertura = db.prepare(`
      SELECT id FROM apertura_caja
      WHERE DATE(fecha_apertura, '${CO}') = ? AND estado = 'abierta' ORDER BY id DESC LIMIT 1
    `).get(hoy);

    if (apertura) {
      db.prepare(`UPDATE apertura_caja SET estado = 'cerrada', fecha_cierre = datetime('now', '${CO}') WHERE id = ?`).run(apertura.id);
    }

    req.usuario.ip = req.ip;
    auditar(req.usuario, 'caja_cerrada', 'Cierre de caja registrado');
    res.json({ mensaje: 'Cierre de caja registrado' });
  } catch (err) {
    console.error('Error al cerrar caja:', err);
    res.status(500).json({ error: 'Error al cerrar caja' });
  }
};

const registrarMovimiento = (req, res) => {
  try {
    const { tipo, concepto, monto } = req.body;
    if (!tipo || !concepto || !monto) {
      return res.status(400).json({ error: 'Faltan datos: tipo, concepto, monto' });
    }
    if (!['ingreso', 'egreso'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo debe ser ingreso o egreso' });
    }

    const hoy = hoyColombia();
    const apertura = db.prepare(`
      SELECT id FROM apertura_caja
      WHERE DATE(fecha_apertura, '${CO}') = ? AND estado = 'abierta' ORDER BY id DESC LIMIT 1
    `).get(hoy);

    if (!apertura) return res.status(400).json({ error: 'No hay una caja abierta para hoy. Abre la caja primero.' });

    const info = db.prepare(`
      INSERT INTO movimientos_caja (apertura_id, tipo, concepto, monto, usuario_id)
      VALUES (?,?,?,?,?)
    `).run(apertura.id, tipo, concepto, monto, req.usuario.id);

    const row = db.prepare('SELECT * FROM movimientos_caja WHERE id = ?').get(info.lastInsertRowid);
    req.usuario.ip = req.ip;
    auditar(req.usuario, 'movimiento_caja', `${tipo}: ${concepto} - $${monto}`);
    res.status(201).json(row);
  } catch (err) {
    console.error('Error al registrar movimiento:', err);
    res.status(500).json({ error: 'Error al registrar movimiento' });
  }
};

module.exports = { resumen, abrir, cerrar, registrarMovimiento };

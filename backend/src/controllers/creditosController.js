const db = require('../config/db');
const auditar = require('../utils/auditar');

const listar = (req, res) => {
  try {
    const { cliente_id, estado, desde, hasta } = req.query;
    let sql = `
      SELECT c.*, cl.nombre as cliente_nombre, cl.nit as cliente_nit,
             f.numero as factura_numero
      FROM creditos c
      JOIN clientes cl ON c.cliente_id = cl.id
      LEFT JOIN facturas f ON c.factura_id = f.id
      WHERE 1=1
    `;
    const params = [];
    if (cliente_id) { sql += ' AND c.cliente_id = ?'; params.push(parseInt(cliente_id)); }
    if (estado) { sql += ' AND c.estado = ?'; params.push(estado); }
    if (desde) { sql += ' AND DATE(c.creado_en) >= ?'; params.push(desde); }
    if (hasta) { sql += ' AND DATE(c.creado_en) <= ?'; params.push(hasta); }
    sql += ' ORDER BY c.creado_en DESC';
    const rows = db.prepare(sql).all(...params);
    res.json(rows);
  } catch (err) {
    console.error('Error al listar créditos:', err);
    res.status(500).json({ error: 'Error al listar créditos' });
  }
};

const obtener = (req, res) => {
  try {
    const credito = db.prepare(`
      SELECT c.*, cl.nombre as cliente_nombre, cl.nit as cliente_nit,
             cl.telefono as cliente_telefono, f.numero as factura_numero
      FROM creditos c
      JOIN clientes cl ON c.cliente_id = cl.id
      LEFT JOIN facturas f ON c.factura_id = f.id
      WHERE c.id = ?
    `).get(req.params.id);
    if (!credito) return res.status(404).json({ error: 'Crédito no encontrado' });

    const abonos = db.prepare(`
      SELECT a.*, u.nombre as usuario_nombre
      FROM abonos a
      JOIN usuarios u ON a.usuario_id = u.id
      WHERE a.credito_id = ?
      ORDER BY a.fecha DESC
    `).all(req.params.id);

    res.json({ ...credito, abonos });
  } catch (err) {
    console.error('Error al obtener crédito:', err);
    res.status(500).json({ error: 'Error al obtener crédito' });
  }
};

const crear = (req, res) => {
  try {
    const { factura_id, cliente_id, total, fecha_vencimiento } = req.body;
    if (!factura_id || !cliente_id || !total) {
      return res.status(400).json({ error: 'Faltan datos: factura_id, cliente_id, total' });
    }

    const info = db.prepare(`
      INSERT INTO creditos (factura_id, cliente_id, total, saldo_pendiente, fecha_vencimiento)
      VALUES (?,?,?,?,?)
    `).run(factura_id, cliente_id, total, total, fecha_vencimiento || null);

    const row = db.prepare('SELECT * FROM creditos WHERE id = ?').get(info.lastInsertRowid);
    req.usuario.ip = req.ip;
    auditar(req.usuario, 'credito_creado', `Factura #${factura_id} - $${total} a crédito`);
    res.status(201).json(row);
  } catch (err) {
    console.error('Error al crear crédito:', err);
    res.status(500).json({ error: 'Error al crear crédito' });
  }
};

const abonar = (req, res) => {
  try {
    const { monto, medio_pago, observaciones } = req.body;
    const credito = db.prepare('SELECT * FROM creditos WHERE id = ?').get(req.params.id);
    if (!credito) return res.status(404).json({ error: 'Crédito no encontrado' });
    if (credito.estado !== 'activo') return res.status(400).json({ error: 'El crédito ya está pagado o anulado' });
    if (monto <= 0) return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
    if (monto > credito.saldo_pendiente) return res.status(400).json({ error: 'El monto supera el saldo pendiente' });

    const abonarTransaccion = db.transaction(() => {
      db.prepare(`
        INSERT INTO abonos (credito_id, monto, medio_pago, usuario_id, observaciones)
        VALUES (?,?,?,?,?)
      `).run(req.params.id, monto, medio_pago || 'efectivo', req.usuario.id, observaciones || '');

      const nuevoSaldo = credito.saldo_pendiente - monto;
      const nuevoEstado = nuevoSaldo <= 0 ? 'pagado' : 'activo';
      db.prepare('UPDATE creditos SET saldo_pendiente = ?, estado = ? WHERE id = ?').run(nuevoSaldo, nuevoEstado, req.params.id);
    });

    abonarTransaccion();
    const updated = db.prepare('SELECT * FROM creditos WHERE id = ?').get(req.params.id);
    req.usuario.ip = req.ip;
    auditar(req.usuario, 'abono_registrado', `Crédito #${credito.id} - $${monto} - Saldo: $${updated.saldo_pendiente}`);
    res.json(updated);
  } catch (err) {
    console.error('Error al registrar abono:', err);
    res.status(500).json({ error: 'Error al registrar abono' });
  }
};

const resumenCliente = (req, res) => {
  try {
    const creditos = db.prepare(`
      SELECT c.*, f.numero as factura_numero
      FROM creditos c
      LEFT JOIN facturas f ON c.factura_id = f.id
      WHERE c.cliente_id = ? AND c.estado = 'activo'
      ORDER BY c.creado_en DESC
    `).all(req.params.clienteId);

    const totalPendiente = creditos.reduce((sum, c) => sum + c.saldo_pendiente, 0);
    res.json({ creditos, total_pendiente: totalPendiente });
  } catch (err) {
    console.error('Error al obtener resumen del cliente:', err);
    res.status(500).json({ error: 'Error al obtener resumen' });
  }
};

const totales = (req, res) => {
  try {
    const row = db.prepare(`
      SELECT
        COUNT(*) as total_creditos,
        COALESCE(SUM(CASE WHEN estado = 'activo' THEN saldo_pendiente ELSE 0 END), 0) as total_pendiente,
        COALESCE(SUM(CASE WHEN estado = 'pagado' THEN total ELSE 0 END), 0) as total_cobrado
      FROM creditos
    `).get();
    res.json(row);
  } catch (err) {
    console.error('Error al obtener totales:', err);
    res.status(500).json({ error: 'Error al obtener totales' });
  }
};

module.exports = { listar, obtener, crear, abonar, resumenCliente, totales };

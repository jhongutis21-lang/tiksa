const db = require('../config/db');
const auditar = require('../utils/auditar');

const crear = (req, res) => {
  try {
    const { factura_original_id, motivo, items_salen, items_entran, diferencia } = req.body;

    if (!factura_original_id) {
      return res.status(400).json({ error: 'Factura original requerida' });
    }

    const cambioTransaccion = db.transaction(() => {
      const cambioInfo = db.prepare(
        'INSERT INTO cambios (factura_original_id, usuario_id, motivo, diferencia) VALUES (?,?,?,?)'
      ).run(factura_original_id, req.usuario.id, motivo, diferencia || 0);

      const cambioId = cambioInfo.lastInsertRowid;

      const insertItem = db.prepare(
        'INSERT INTO items_cambio (cambio_id, tipo, producto_id, cantidad, precio) VALUES (?,?,?,?,?)'
      );

      const restoreStock = db.prepare('UPDATE productos SET stock = stock + ? WHERE id = ?');
      const deductStock = db.prepare('UPDATE productos SET stock = stock - ? WHERE id = ?');
      const getFactor = db.prepare('SELECT factor FROM presentaciones WHERE id = ?');

      for (const item of items_salen || []) {
        const factor = item.presentacion_id
          ? (getFactor.get(item.presentacion_id)?.factor || 1)
          : 1;
        insertItem.run(cambioId, 'sale', item.producto_id, item.cantidad, item.precio);
        restoreStock.run(item.cantidad * factor, item.producto_id);
      }

      for (const item of items_entran || []) {
        insertItem.run(cambioId, 'entra', item.producto_id, item.cantidad, item.precio);
        const factor = item.presentacion_id
          ? (getFactor.get(item.presentacion_id)?.factor || 1)
          : 1;
        deductStock.run(item.cantidad * factor, item.producto_id);
      }

      return db.prepare('SELECT * FROM cambios WHERE id = ?').get(cambioId);
    });

    const result = cambioTransaccion();
    const facturaOrig = db.prepare('SELECT numero FROM facturas WHERE id = ?').get(factura_original_id);
    req.usuario.ip = req.ip;
    auditar(req.usuario, 'cambio_procesado', `Factura ${facturaOrig?.numero} - Diferencia: $${(diferencia || 0).toLocaleString('es-CO')}`);
    res.status(201).json(result);
  } catch (err) {
    console.error('Error al crear cambio:', err);
    res.status(500).json({ error: 'Error al procesar cambio' });
  }
};

const listar = (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const p = Math.max(1, parseInt(page));
    const l = Math.min(200, Math.max(1, parseInt(limit)));
    const offset = (p - 1) * l;

    const total = db.prepare('SELECT COUNT(*) as count FROM cambios').get().count;
    const rows = db.prepare(`
      SELECT c.*, f.numero as factura_numero, u.nombre as usuario_nombre
      FROM cambios c
      LEFT JOIN facturas f ON c.factura_original_id = f.id
      LEFT JOIN usuarios u ON c.usuario_id = u.id
      ORDER BY c.fecha DESC LIMIT ? OFFSET ?
    `).all(l, offset);
    res.json({ data: rows, total, pagina: p, paginas: Math.ceil(total / l) });
  } catch (err) {
    console.error('Error al listar cambios:', err);
    res.status(500).json({ error: 'Error al listar cambios' });
  }
};

module.exports = { crear, listar };

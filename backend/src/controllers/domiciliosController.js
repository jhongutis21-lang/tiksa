const db = require('../config/db');
const auditar = require('../utils/auditar');
const { CO } = require('../config/timezone');

const listar = (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT d.*, f.numero as factura_numero, f.total, f.cliente_id, c.nombre as cliente_nombre,
             f.dom_nombre, f.dom_telefono, f.dom_direccion, f.dom_referencia
      FROM domicilios d
      JOIN facturas f ON d.factura_id = f.id
      JOIN clientes c ON f.cliente_id = c.id
      ORDER BY d.fecha_salida IS NULL DESC, d.fecha_salida DESC, d.id DESC
    `).all();
    res.json(rows);
  } catch (err) {
    console.error('Error al listar domicilios:', err);
    res.status(500).json({ error: 'Error al listar domicilios' });
  }
};

const actualizarEstado = (req, res) => {
  try {
    const { estado } = req.body;
    let sql = 'UPDATE domicilios SET estado = ?';
    const params = [estado, req.params.id];

    if (estado === 'camino') {
      sql += `, fecha_salida = datetime('now', '${CO}')`;
    } else if (estado === 'entregado') {
      sql += `, fecha_entrega = datetime('now', '${CO}')`;
    }

    sql += ' WHERE id = ?';
    const info = db.prepare(sql).run(...params);
    if (info.changes === 0) return res.status(404).json({ error: 'Domicilio no encontrado' });
    const row = db.prepare('SELECT d.*, f.numero as factura_numero FROM domicilios d JOIN facturas f ON d.factura_id = f.id WHERE d.id = ?').get(req.params.id);
    req.usuario.ip = req.ip;
    auditar(req.usuario, 'domicilio_estado', `Domicilio #${row.id} (Factura ${row.factura_numero}) → ${estado}`);
    res.json(row);
  } catch (err) {
    console.error('Error al actualizar estado domicilio:', err);
    res.status(500).json({ error: 'Error al actualizar estado' });
  }
};

const hoy = (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT d.*, f.numero as factura_numero, f.total, c.nombre as cliente_nombre,
             f.dom_nombre, f.dom_telefono, f.dom_direccion, f.dom_referencia
      FROM domicilios d
      JOIN facturas f ON d.factura_id = f.id
      JOIN clientes c ON f.cliente_id = c.id
      WHERE DATE(f.fecha, '${CO}') = DATE('now', '${CO}')
      ORDER BY d.estado = 'pendiente' DESC, d.fecha_salida DESC
    `).all();
    res.json(rows);
  } catch (err) {
    console.error('Error al obtener domicilios de hoy:', err);
    res.status(500).json({ error: 'Error al obtener domicilios' });
  }
};

const eliminar = (req, res) => {
  try {
    const row = db.prepare('SELECT d.*, f.numero as factura_numero FROM domicilios d JOIN facturas f ON d.factura_id = f.id WHERE d.id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Domicilio no encontrado' });
    db.prepare('DELETE FROM domicilios WHERE id = ?').run(req.params.id);
    req.usuario.ip = req.ip;
    auditar(req.usuario, 'domicilio_eliminado', `Domicilio #${row.id} (Factura ${row.factura_numero})`);
    res.json({ mensaje: 'Domicilio eliminado' });
  } catch (err) {
    console.error('Error al eliminar domicilio:', err);
    res.status(500).json({ error: 'Error al eliminar domicilio' });
  }
};

const historial = (req, res) => {
  try {
    const { desde, hasta, estado, busqueda, page = 1, limit = 50 } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 50));

    const conditions = [];
    const params = [];

    if (desde) {
      conditions.push("DATE(f.fecha) >= DATE(?)");
      params.push(desde);
    }
    if (hasta) {
      conditions.push("DATE(f.fecha) <= DATE(?)");
      params.push(hasta);
    }
    if (estado && estado !== 'todos') {
      conditions.push("d.estado = ?");
      params.push(estado);
    }
    if (busqueda) {
      conditions.push("(f.numero LIKE ? OR c.nombre LIKE ?)");
      const term = `%${busqueda}%`;
      params.push(term, term);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const baseSQL = `
      FROM domicilios d
      JOIN facturas f ON d.factura_id = f.id
      JOIN clientes c ON f.cliente_id = c.id
      ${whereClause}
    `;

    const total = db.prepare(`SELECT COUNT(*) as total ${baseSQL}`).get(...params).total;
    const totalPages = Math.ceil(total / limitNum);
    const offset = (pageNum - 1) * limitNum;

    const rows = db.prepare(`
      SELECT d.*, f.numero as factura_numero, f.total, f.cliente_id, c.nombre as cliente_nombre,
             f.dom_nombre, f.dom_telefono, f.dom_direccion, f.dom_referencia
      ${baseSQL}
      ORDER BY d.fecha_salida IS NULL DESC, d.fecha_salida DESC, d.id DESC
      LIMIT ? OFFSET ?
    `).all(...params, limitNum, offset);

    res.json({ data: rows, total, page: pageNum, limit: limitNum, totalPages });
  } catch (err) {
    console.error('Error al obtener historial de domicilios:', err);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
};

module.exports = { listar, actualizarEstado, hoy, eliminar, historial };

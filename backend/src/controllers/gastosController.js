const db = require('../config/db');
const auditar = require('../utils/auditar');
const { isPositiveNumber, isValidString } = require('../utils/validate');

const listar = (req, res) => {
  try {
    const { desde, hasta, categoria_id } = req.query;
    let sql = `
      SELECT g.*, c.nombre as categoria_nombre, u.nombre as usuario_nombre
      FROM gastos g
      JOIN categorias_gasto c ON g.categoria_id = c.id
      JOIN usuarios u ON g.usuario_id = u.id
      WHERE 1=1
    `;
    const params = [];
    if (desde) { sql += ' AND DATE(g.fecha) >= ?'; params.push(desde); }
    if (hasta) { sql += ' AND DATE(g.fecha) <= ?'; params.push(hasta); }
    if (categoria_id) { sql += ' AND g.categoria_id = ?'; params.push(parseInt(categoria_id)); }
    sql += ' ORDER BY g.fecha DESC';
    const rows = db.prepare(sql).all(...params);
    res.json(rows);
  } catch (err) {
    console.error('Error al listar gastos:', err);
    res.status(500).json({ error: 'Error al listar gastos' });
  }
};

const crear = (req, res) => {
  try {
    const { categoria_id, descripcion, monto, forma_pago } = req.body;

    if (!isValidString(descripcion)) return res.status(400).json({ error: 'La descripción es requerida' });
    if (!isPositiveNumber(monto)) return res.status(400).json({ error: 'El monto debe ser un número positivo' });
    if (!categoria_id || !Number.isInteger(categoria_id)) return res.status(400).json({ error: 'Categoría inválida' });

    const cat = db.prepare('SELECT id FROM categorias_gasto WHERE id = ?').get(categoria_id);
    if (!cat) return res.status(400).json({ error: 'La categoría no existe' });

    if (forma_pago && !['efectivo', 'debito', 'credito', 'transferencia', 'daviplata', 'nequi'].includes(forma_pago)) {
      return res.status(400).json({ error: 'Forma de pago inválida' });
    }

    const info = db.prepare(`
      INSERT INTO gastos (categoria_id, descripcion, monto, forma_pago, usuario_id)
      VALUES (?,?,?,?,?)
    `).run(categoria_id, descripcion, monto, forma_pago || 'efectivo', req.usuario.id);
    const row = db.prepare('SELECT g.*, c.nombre as categoria_nombre FROM gastos g JOIN categorias_gasto c ON g.categoria_id = c.id WHERE g.id = ?').get(info.lastInsertRowid);
    req.usuario.ip = req.ip;
    auditar(req.usuario, 'gasto_creado', `${row.descripcion} - $${row.monto}`);
    res.status(201).json(row);
  } catch (err) {
    console.error('Error al crear gasto:', err);
    res.status(500).json({ error: 'Error al crear gasto' });
  }
};

const eliminar = (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM gastos WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Gasto no encontrado' });
    db.prepare('DELETE FROM gastos WHERE id = ?').run(req.params.id);
    req.usuario.ip = req.ip;
    auditar(req.usuario, 'gasto_eliminado', `${row.descripcion} - $${row.monto}`);
    res.json({ mensaje: 'Gasto eliminado' });
  } catch (err) {
    console.error('Error al eliminar gasto:', err);
    res.status(500).json({ error: 'Error al eliminar gasto' });
  }
};

const listarCategorias = (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM categorias_gasto ORDER BY nombre').all();
    res.json(rows);
  } catch (err) {
    console.error('Error al listar categorías de gasto:', err);
    res.status(500).json({ error: 'Error al listar categorías' });
  }
};

const totales = (req, res) => {
  try {
    const { desde, hasta } = req.query;
    let sql = 'SELECT COALESCE(SUM(monto), 0) as total FROM gastos WHERE 1=1';
    const params = [];
    if (desde) { sql += ' AND DATE(fecha) >= ?'; params.push(desde); }
    if (hasta) { sql += ' AND DATE(fecha) <= ?'; params.push(hasta); }
    const row = db.prepare(sql).get(...params);
    res.json(row);
  } catch (err) {
    console.error('Error al obtener total de gastos:', err);
    res.status(500).json({ error: 'Error al obtener total de gastos' });
  }
};

module.exports = { listar, crear, eliminar, listarCategorias, totales };

const db = require('../config/db');
const { CO } = require('../config/timezone');

const alertas = (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT a.*, p.nombre as producto_nombre, u.nombre as usuario_nombre
      FROM alertas_stock a
      JOIN productos p ON a.producto_id = p.id
      JOIN usuarios u ON a.usuario_id = u.id
      WHERE a.resuelta = 0
      ORDER BY a.fecha DESC
    `).all();
    res.json(rows);
  } catch (err) {
    console.error('Error al obtener alertas:', err);
    res.status(500).json({ error: 'Error al obtener alertas' });
  }
};

const resolver = (req, res) => {
  try {
    const { nota } = req.body;
    db.prepare('UPDATE alertas_stock SET resuelta=1, nota=? WHERE id=?').run(nota, req.params.id);
    res.json({ mensaje: 'Alerta resuelta' });
  } catch (err) {
    console.error('Error al resolver alerta:', err);
    res.status(500).json({ error: 'Error al resolver alerta' });
  }
};

const reporteDiario = (req, res) => {
  try {
    const productosRojos = db.prepare(`
      SELECT p.*, c.nombre as categoria_nombre
      FROM productos p JOIN categorias c ON p.categoria_id = c.id
      WHERE p.stock <= 0 AND p.activo = 1
      ORDER BY p.stock ASC
    `).all();

    const productosMinimos = db.prepare(`
      SELECT p.*, c.nombre as categoria_nombre
      FROM productos p JOIN categorias c ON p.categoria_id = c.id
      WHERE p.stock > 0 AND p.stock <= p.stock_minimo AND p.activo = 1
      ORDER BY p.stock ASC
    `).all();

    const alertasHoy = db.prepare(`
      SELECT COUNT(*) as total FROM alertas_stock WHERE DATE(fecha, '${CO}') = DATE('now', '${CO}')
    `).get();

    res.json({
      productos_rojos: productosRojos,
      productos_minimos: productosMinimos,
      alertas_hoy: alertasHoy.total
    });
  } catch (err) {
    console.error('Error al generar reporte diario:', err);
    res.status(500).json({ error: 'Error al generar reporte' });
  }
};

module.exports = { alertas, resolver, reporteDiario };

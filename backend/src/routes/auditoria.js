const { Router } = require('express');
const router = Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const { soloRoles } = require('../middleware/roles');

router.get('/', auth, soloRoles('admin'), (req, res) => {
  try {
    const { accion, usuario, desde, hasta } = req.query;
    let sql = `
      SELECT a.*
      FROM auditoria a
      WHERE 1=1
    `;
    const params = [];

    if (accion) {
      sql += ' AND a.accion = ?';
      params.push(accion);
    }
    if (usuario) {
      sql += ' AND a.usuario_nombre LIKE ?';
      params.push(`%${usuario}%`);
    }
    if (desde) {
      sql += ' AND a.fecha >= ?';
      params.push(desde);
    }
    if (hasta) {
      sql += ' AND a.fecha <= ?';
      params.push(hasta);
    }

    sql += ' ORDER BY a.fecha DESC LIMIT 500';
    const rows = db.prepare(sql).all(...params);
    res.json(rows);
  } catch (err) {
    console.error('Error al obtener auditoría:', err);
    res.status(500).json({ error: 'Error al obtener auditoría' });
  }
});

router.get('/acciones', auth, soloRoles('admin'), (req, res) => {
  try {
    const rows = db.prepare('SELECT DISTINCT accion FROM auditoria ORDER BY accion').all();
    res.json(rows.map(r => r.accion));
  } catch (err) {
    console.error('Error al obtener acciones:', err);
    res.status(500).json({ error: 'Error al obtener acciones' });
  }
});

router.delete('/limpiar', auth, soloRoles('admin'), (req, res) => {
  try {
    const dias = parseInt(req.query.dias) || 90;
    const info = db.prepare(
      `DELETE FROM auditoria WHERE fecha < datetime('now', '-' || ? || ' days')`
    ).run(dias);
    res.json({ mensaje: `${info.changes} registros anteriores a ${dias} días eliminados` });
  } catch (err) {
    console.error('Error al limpiar auditoría:', err);
    res.status(500).json({ error: 'Error al limpiar auditoría' });
  }
});

module.exports = router;

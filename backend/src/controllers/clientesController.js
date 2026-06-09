const db = require('../config/db');
const auditar = require('../utils/auditar');
const { isValidString } = require('../utils/validate');

const listar = (req, res) => {
  try {
    const { busqueda } = req.query;
    let sql = `
      SELECT c.*,
             COALESCE((SELECT SUM(saldo_pendiente) FROM creditos WHERE cliente_id = c.id AND estado = 'activo'), 0) as saldo_pendiente
      FROM clientes c
      WHERE c.activo = 1
    `;
    const params = [];
    if (busqueda && busqueda.length >= 2) {
      sql += ' AND (c.nombre LIKE ? OR c.nit LIKE ?)';
      params.push(`%${busqueda}%`, `%${busqueda}%`);
    }
    sql += ' ORDER BY c.nombre';
    const rows = db.prepare(sql).all(...params);
    res.json(rows);
  } catch (err) {
    console.error('Error al listar clientes:', err);
    res.status(500).json({ error: 'Error al listar clientes' });
  }
};

const obtener = (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(row);
  } catch (err) {
    console.error('Error al obtener cliente:', err);
    res.status(500).json({ error: 'Error al obtener cliente' });
  }
};

const crear = (req, res) => {
  try {
    const { nombre, nit, tipo_persona, regimen, lista_precio, limite_credito, telefono, correo, direccion } = req.body;
    if (!isValidString(nombre)) return res.status(400).json({ error: 'El nombre del cliente es requerido' });
    if (!isValidString(nit)) return res.status(400).json({ error: 'El NIT es requerido' });
    const info = db.prepare(
      'INSERT INTO clientes (nombre, nit, tipo_persona, regimen, lista_precio, limite_credito, telefono, correo, direccion) VALUES (?,?,?,?,?,?,?,?,?)'
    ).run(nombre.trim(), nit.trim(), tipo_persona || 'Natural', regimen || 'Simplificado', lista_precio || 1, limite_credito || 0, telefono, correo, direccion);
    const row = db.prepare('SELECT * FROM clientes WHERE id = ?').get(info.lastInsertRowid);
    req.usuario.ip = req.ip;
    auditar(req.usuario, 'cliente_creado', `${row.nombre} - ${row.nit}`);
    res.status(201).json(row);
  } catch (err) {
    if (err.message?.includes('UNIQUE')) return res.status(400).json({ error: 'El NIT ya existe' });
    console.error('Error al crear cliente:', err);
    res.status(500).json({ error: 'Error al crear cliente' });
  }
};

const actualizar = (req, res) => {
  try {
    const { nombre, nit, tipo_persona, regimen, lista_precio, limite_credito, telefono, correo, direccion } = req.body;
    if (!isValidString(nombre)) return res.status(400).json({ error: 'El nombre del cliente es requerido' });
    if (!isValidString(nit)) return res.status(400).json({ error: 'El NIT es requerido' });
    const info = db.prepare(
      'UPDATE clientes SET nombre=?, nit=?, tipo_persona=?, regimen=?, lista_precio=?, limite_credito=?, telefono=?, correo=?, direccion=? WHERE id=?'
    ).run(nombre.trim(), nit.trim(), tipo_persona, regimen, lista_precio, limite_credito || 0, telefono, correo, direccion, req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
    const row = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id);
    res.json(row);
  } catch (err) {
    if (err.message?.includes('UNIQUE')) return res.status(400).json({ error: 'El NIT ya existe' });
    console.error('Error al actualizar cliente:', err);
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
};

const eliminar = (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Cliente no encontrado' });
    db.prepare('UPDATE clientes SET activo = 0 WHERE id = ?').run(req.params.id);
    req.usuario.ip = req.ip;
    auditar(req.usuario, 'cliente_eliminado', `${row.nombre} - ${row.nit}`);
    res.json({ mensaje: 'Cliente desactivado' });
  } catch (err) {
    console.error('Error al eliminar cliente:', err);
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
};

module.exports = { listar, obtener, crear, actualizar, eliminar };

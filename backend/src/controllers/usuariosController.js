const bcrypt = require('bcryptjs');
const db = require('../config/db');
const auditar = require('../utils/auditar');
const { isValidPassword, isValidString } = require('../utils/validate');

const listar = (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT u.id, u.nombre, u.usuario, u.rol_id, r.nombre as rol, u.activo, u.creado_en
      FROM usuarios u JOIN roles r ON u.rol_id = r.id
      ORDER BY u.nombre
    `).all();
    res.json(rows);
  } catch (err) {
    console.error('Error al listar usuarios:', err);
    res.status(500).json({ error: 'Error al listar usuarios' });
  }
};

const crear = async (req, res) => {
  try {
    const { nombre, usuario, contrasena, rol_id } = req.body;
    if (!isValidString(nombre)) return res.status(400).json({ error: 'Nombre requerido' });
    if (!isValidString(usuario)) return res.status(400).json({ error: 'Usuario requerido' });
    if (!isValidPassword(contrasena)) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    const hash = await bcrypt.hash(contrasena, 10);
    const info = db.prepare(
      'INSERT INTO usuarios (nombre, usuario, contrasena, rol_id) VALUES (?,?,?,?)'
    ).run(nombre, usuario, hash, rol_id);
    const row = db.prepare('SELECT id, nombre, usuario, rol_id, activo, creado_en FROM usuarios WHERE id = ?').get(info.lastInsertRowid);
    req.usuario.ip = req.ip;
    auditar(req.usuario, 'usuario_creado', `${row.nombre} (${row.usuario})`);
    res.status(201).json(row);
  } catch (err) {
    if (err.message?.includes('UNIQUE')) return res.status(400).json({ error: 'El usuario ya existe' });
    console.error('Error al crear usuario:', err);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
};

const actualizar = (req, res) => {
  try {
    const { nombre, usuario, rol_id } = req.body;
    const info = db.prepare(
      'UPDATE usuarios SET nombre=?, usuario=?, rol_id=? WHERE id=?'
    ).run(nombre, usuario, rol_id, req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    const row = db.prepare('SELECT id, nombre, usuario, rol_id, activo FROM usuarios WHERE id = ?').get(req.params.id);
    res.json(row);
  } catch (err) {
    if (err.message?.includes('UNIQUE')) return res.status(400).json({ error: 'El usuario ya existe' });
    console.error('Error al actualizar usuario:', err);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
};

const cambiarContrasena = async (req, res) => {
  try {
    const { contrasena } = req.body;
    if (!isValidPassword(contrasena)) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    const hash = await bcrypt.hash(contrasena, 10);
    db.prepare('UPDATE usuarios SET contrasena=? WHERE id=?').run(hash, req.params.id);
    req.usuario.ip = req.ip;
    auditar(req.usuario, 'contrasena_cambiada', `Usuario #${req.params.id}`);
    res.json({ mensaje: 'Contraseña actualizada' });
  } catch (err) {
    console.error('Error al cambiar contraseña:', err);
    res.status(500).json({ error: 'Error al cambiar contraseña' });
  }
};

const cambiarEstado = (req, res) => {
  try {
    const { activo } = req.body;
    if (parseInt(req.params.id) === req.usuario.id && !activo) {
      return res.status(400).json({ error: 'No puedes desactivarte a ti mismo' });
    }
    const info = db.prepare('UPDATE usuarios SET activo=? WHERE id=?').run(activo ? 1 : 0, req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    const row = db.prepare('SELECT id, nombre, usuario, activo FROM usuarios WHERE id = ?').get(req.params.id);
    req.usuario.ip = req.ip;
    const estado = row.activo ? 'activado' : 'desactivado';
    auditar(req.usuario, `usuario_${estado}`, `${row.nombre} (${row.usuario})`);
    res.json(row);
  } catch (err) {
    console.error('Error al cambiar estado:', err);
    res.status(500).json({ error: 'Error al cambiar estado' });
  }
};

module.exports = { listar, crear, actualizar, cambiarContrasena, cambiarEstado };

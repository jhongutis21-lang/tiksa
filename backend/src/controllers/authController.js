const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const auditar = require('../utils/auditar');

const login = async (req, res) => {
  try {
    const { usuario, contrasena } = req.body;
    if (!usuario || !contrasena) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }

    const user = db.prepare(`
      SELECT u.id, u.nombre, u.usuario, u.contrasena, u.rol_id, r.nombre as rol
      FROM usuarios u JOIN roles r ON u.rol_id = r.id
      WHERE u.usuario = ? AND u.activo = 1
    `).get(usuario);

    if (!user) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const valida = await bcrypt.compare(contrasena, user.contrasena);
    if (!valida) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const token = jwt.sign(
      { id: user.id, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    auditar({ id: user.id, nombre: user.nombre, ip: req.ip }, 'login_exitoso', '');

    res.json({
      token,
      usuario: {
        id: user.id,
        nombre: user.nombre,
        usuario: user.usuario,
        rol: user.rol,
        rol_id: user.rol_id
      }
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const me = (req, res) => {
  res.json({ usuario: req.usuario });
};

const logout = (req, res) => {
  res.json({ mensaje: 'Sesión cerrada' });
};

module.exports = { login, me, logout };

const jwt = require('jsonwebtoken');
const db = require('../config/db');

const DEFAULT_SECRETS = ['tiksa_jwt_secret_change_this_in_production_2026', 'change_this_secret'];
if (DEFAULT_SECRETS.includes(process.env.JWT_SECRET)) {
  console.warn('\x1b[33m⚠️  ADVERTENCIA: Estás usando el JWT_SECRET por defecto. Cámbialo en .env antes de producción.\x1b[0m');
}

const auth = (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token requerido' });
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = db.prepare(`
      SELECT u.id, u.nombre, u.usuario, u.rol_id, r.nombre as rol
      FROM usuarios u JOIN roles r ON u.rol_id = r.id
      WHERE u.id = ? AND u.activo = 1
    `).get(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado o inactivo' });
    }

    req.usuario = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    return res.status(401).json({ error: 'Token inválido' });
  }
};

module.exports = auth;

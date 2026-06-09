const db = require('../config/db');

function auditar(usuario, accion, detalle) {
  try {
    db.prepare(
      'INSERT INTO auditoria (usuario_id, usuario_nombre, accion, detalle, ip) VALUES (?,?,?,?,?)'
    ).run(
      usuario.id,
      usuario.nombre,
      accion,
      detalle || null,
      usuario.ip || null
    );
  } catch (err) {
    console.error('Error al auditar:', err);
  }
}

module.exports = auditar;

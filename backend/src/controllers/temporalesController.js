const db = require('../config/db');

const safeParse = (str) => {
  try { return JSON.parse(str); } catch { return {}; }
};

exports.listar = (req, res) => {
  try {
    const temporales = db.prepare(
      'SELECT id, usuario_id, datos, creado_en, actualizado_en FROM temporales WHERE usuario_id = ? ORDER BY actualizado_en DESC'
    ).all(req.usuario.id);

    const parsed = temporales.map(t => ({ ...t, datos: safeParse(t.datos) }));
    res.json(parsed);
  } catch (err) {
    console.error('Error al listar temporales:', err);
    res.status(500).json({ error: 'Error al listar temporales' });
  }
};

exports.guardar = (req, res) => {
  try {
    const { datos } = req.body;

    if (!datos) {
      return res.status(400).json({ error: 'Datos requeridos' });
    }

    const existing = db.prepare(
      'SELECT id FROM temporales WHERE usuario_id = ? ORDER BY actualizado_en DESC'
    ).get(req.usuario.id);

    if (existing) {
      db.prepare("UPDATE temporales SET datos = ?, actualizado_en = datetime('now') WHERE id = ?")
        .run(JSON.stringify(datos), existing.id);

      db.prepare("DELETE FROM temporales WHERE usuario_id = ? AND id != ?")
        .run(req.usuario.id, existing.id);

      const t = db.prepare('SELECT id, usuario_id, datos, creado_en, actualizado_en FROM temporales WHERE id = ?').get(existing.id);
      return res.json({ ...t, datos: safeParse(t.datos) });
    }

    const result = db.prepare('INSERT INTO temporales (usuario_id, datos) VALUES (?, ?)')
      .run(req.usuario.id, JSON.stringify(datos));
    const t = db.prepare('SELECT id, usuario_id, datos, creado_en, actualizado_en FROM temporales WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ ...t, datos: safeParse(t.datos) });
  } catch (err) {
    console.error('Error al guardar temporal:', err);
    res.status(500).json({ error: 'Error al guardar temporal' });
  }
};

exports.obtener = (req, res) => {
  try {
    const t = db.prepare('SELECT id, usuario_id, datos, creado_en, actualizado_en FROM temporales WHERE id = ? AND usuario_id = ?')
      .get(req.params.id, req.usuario.id);

    if (!t) return res.status(404).json({ error: 'Temporal no encontrado' });

    res.json({ ...t, datos: safeParse(t.datos) });
  } catch (err) {
    console.error('Error al obtener temporal:', err);
    res.status(500).json({ error: 'Error al obtener temporal' });
  }
};

exports.eliminar = (req, res) => {
  try {
    const result = db.prepare('DELETE FROM temporales WHERE id = ? AND usuario_id = ?')
      .run(req.params.id, req.usuario.id);

    if (result.changes === 0) return res.status(404).json({ error: 'Temporal no encontrado' });

    res.json({ mensaje: 'Temporal eliminado' });
  } catch (err) {
    console.error('Error al eliminar temporal:', err);
    res.status(500).json({ error: 'Error al eliminar temporal' });
  }
};

exports.limpiarViejos = (req, res) => {
  try {
    const result = db.prepare(
      "DELETE FROM temporales WHERE actualizado_en < datetime('now', '-7 days')"
    ).run();
    res.json({ mensaje: `Temporales antiguos eliminados: ${result.changes}` });
  } catch (err) {
    console.error('Error al limpiar temporales:', err);
    res.status(500).json({ error: 'Error al limpiar temporales' });
  }
};

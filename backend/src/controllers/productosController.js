const db = require('../config/db');
const auditar = require('../utils/auditar');
const { isValidPrice, isPositiveNumber, isNonNegativeNumber, isValidString } = require('../utils/validate');

const listarCategorias = (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM categorias ORDER BY nombre').all();
    res.json(rows);
  } catch (err) {
    console.error('Error al listar categorías:', err);
    res.status(500).json({ error: 'Error al listar categorías' });
  }
};

const listar = (req, res) => {
  try {
    const { categoria, activo, busqueda, _page, _limit } = req.query;
    let sql = `
      SELECT p.*, c.nombre as categoria_nombre
      FROM productos p JOIN categorias c ON p.categoria_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (categoria) {
      sql += ' AND c.id = ?';
      params.push(parseInt(categoria));
    }
    if (activo !== undefined) {
      sql += ' AND p.activo = ?';
      params.push(activo === 'true' ? 1 : 0);
    }
    if (busqueda && busqueda.length >= 2) {
      sql += ' AND (p.nombre LIKE ? OR p.codigo_interno LIKE ?)';
      params.push(`%${busqueda}%`, `%${busqueda}%`);
    }

    sql += ' ORDER BY p.nombre';

    if (_page) {
      const page = Math.max(1, parseInt(_page));
      const limit = Math.min(100, Math.max(1, parseInt(_limit) || 25));
      const countSql = sql.replace(/SELECT p\.\*.*FROM/, 'SELECT COUNT(*) as total FROM');
      const { total } = db.prepare(countSql).get(...params);
      const offset = (page - 1) * limit;
      const rows = db.prepare(sql + ' LIMIT ? OFFSET ?').all(...params, limit, offset);
      return res.json({ data: rows, total, page, limit });
    }

    const rows = db.prepare(sql).all(...params);
    res.json(rows);
  } catch (err) {
    console.error('Error al listar productos:', err);
    res.status(500).json({ error: 'Error al listar productos' });
  }
};

const obtener = (req, res) => {
  try {
    const row = db.prepare(`
      SELECT p.*, c.nombre as categoria_nombre
      FROM productos p JOIN categorias c ON p.categoria_id = c.id
      WHERE p.id = ?
    `).get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(row);
  } catch (err) {
    console.error('Error al obtener producto:', err);
    res.status(500).json({ error: 'Error al obtener producto' });
  }
};

const crear = (req, res) => {
  try {
    const { nombre, codigo_interno, categoria_id, stock, stock_minimo, precio_1, precio_2, precio_3, precio_4, costo, iva } = req.body;

    if (!isValidString(nombre)) return res.status(400).json({ error: 'El nombre del producto es requerido' });
    if (!isValidPrice(precio_1)) return res.status(400).json({ error: 'Precio 1 inválido' });
    if (!isValidPrice(precio_2)) return res.status(400).json({ error: 'Precio 2 inválido' });

    const existeNombre = db.prepare('SELECT id FROM productos WHERE nombre = ? AND activo = 1').get(nombre);
    if (existeNombre) return res.status(400).json({ error: 'Ya existe un producto activo con ese nombre' });

    if (codigo_interno) {
      const existeCod = db.prepare('SELECT id FROM productos WHERE codigo_interno = ? AND activo = 1').get(codigo_interno);
      if (existeCod) return res.status(400).json({ error: 'Ya existe un producto con ese código interno' });
    }

    const info = db.prepare(`
      INSERT INTO productos (nombre, codigo_interno, categoria_id, stock, stock_minimo, precio_1, precio_2, precio_3, precio_4, costo, iva)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)
    `).run(nombre, codigo_interno, categoria_id, stock || 0, stock_minimo || 5, precio_1, precio_2, precio_3 || 0, precio_4 || 0, costo || 0, iva || 19);

    const row = db.prepare('SELECT * FROM productos WHERE id = ?').get(info.lastInsertRowid);
    req.usuario.ip = req.ip;
    auditar(req.usuario, 'producto_creado', `${row.nombre} - $${row.precio_1}`);
    res.status(201).json(row);
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Ya existe un producto con ese nombre o código interno' });
    }
    console.error('Error al crear producto:', err);
    res.status(500).json({ error: 'Error al crear producto' });
  }
};

const actualizar = (req, res) => {
  try {
    const { nombre, codigo_interno, categoria_id, stock_minimo, precio_1, precio_2, precio_3, precio_4, costo, iva } = req.body;

    if (!isValidString(nombre)) return res.status(400).json({ error: 'El nombre es requerido' });
    if (!isValidPrice(precio_1)) return res.status(400).json({ error: 'Precio 1 inválido' });
    if (!isValidPrice(precio_2)) return res.status(400).json({ error: 'Precio 2 inválido' });

    const existeNombre = db.prepare('SELECT id FROM productos WHERE nombre = ? AND activo = 1 AND id != ?').get(nombre, req.params.id);
    if (existeNombre) return res.status(400).json({ error: 'Ya existe otro producto activo con ese nombre' });

    if (codigo_interno) {
      const existeCod = db.prepare('SELECT id FROM productos WHERE codigo_interno = ? AND activo = 1 AND id != ?').get(codigo_interno, req.params.id);
      if (existeCod) return res.status(400).json({ error: 'Ya existe otro producto con ese código interno' });
    }

    const info = db.prepare(
      'UPDATE productos SET nombre=?, codigo_interno=?, categoria_id=?, stock_minimo=?, precio_1=?, precio_2=?, precio_3=?, precio_4=?, costo=?, iva=? WHERE id=?'
    ).run(nombre, codigo_interno, categoria_id, stock_minimo, precio_1, precio_2, precio_3 || 0, precio_4 || 0, costo || 0, iva, req.params.id);

    if (info.changes === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    const row = db.prepare('SELECT * FROM productos WHERE id = ?').get(req.params.id);
    res.json(row);
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Ya existe un producto con ese nombre o código interno' });
    }
    console.error('Error al actualizar producto:', err);
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
};

const ajustarStock = (req, res) => {
  try {
    const { cantidad } = req.body;
    if (typeof cantidad !== 'number' || !isFinite(cantidad)) {
      return res.status(400).json({ error: 'Cantidad inválida' });
    }
    const info = db.prepare('UPDATE productos SET stock = stock + ? WHERE id = ?').run(cantidad, req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    const row = db.prepare('SELECT * FROM productos WHERE id = ?').get(req.params.id);
    req.usuario.ip = req.ip;
    auditar(req.usuario, 'stock_ajustado', `${row.nombre}: ${cantidad > 0 ? '+' : ''}${cantidad} (Stock actual: ${row.stock})`);
    res.json(row);
  } catch (err) {
    console.error('Error al ajustar stock:', err);
    res.status(500).json({ error: 'Error al ajustar stock' });
  }
};

const eliminar = (req, res) => {
  try {
    db.prepare('UPDATE productos SET activo = 0 WHERE id = ?').run(req.params.id);
    res.json({ mensaje: 'Producto desactivado' });
  } catch (err) {
    console.error('Error al eliminar producto:', err);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
};

const listarPresentaciones = (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT p.*, pr.nombre as producto_nombre
      FROM presentaciones p
      JOIN productos pr ON p.producto_id = pr.id
      WHERE p.producto_id = ?
      ORDER BY p.factor ASC
    `).all(req.params.productoId);
    res.json(rows);
  } catch (err) {
    console.error('Error al listar presentaciones:', err);
    res.status(500).json({ error: 'Error al listar presentaciones' });
  }
};

const crearPresentacion = (req, res) => {
  try {
    const { nombre, factor, precio_1, precio_2, precio_3, precio_4, codigo_barras } = req.body;

    if (!isValidString(nombre)) return res.status(400).json({ error: 'El nombre de la presentación es requerido' });
    if (!isPositiveNumber(factor)) return res.status(400).json({ error: 'El factor debe ser un número positivo' });
    if (!isValidPrice(precio_1)) return res.status(400).json({ error: 'Precio 1 inválido' });
    if (precio_2 !== undefined && precio_2 !== null && !isValidPrice(precio_2)) return res.status(400).json({ error: 'Precio 2 inválido' });
    if (precio_3 !== undefined && precio_3 !== null && !isValidPrice(precio_3)) return res.status(400).json({ error: 'Precio 3 inválido' });
    if (precio_4 !== undefined && precio_4 !== null && !isValidPrice(precio_4)) return res.status(400).json({ error: 'Precio 4 inválido' });

    const prod = db.prepare('SELECT id FROM productos WHERE id = ?').get(req.params.productoId);
    if (!prod) return res.status(404).json({ error: 'Producto no encontrado' });

    const info = db.prepare(`
      INSERT INTO presentaciones (producto_id, nombre, factor, precio_1, precio_2, precio_3, precio_4, codigo_barras)
      VALUES (?,?,?,?,?,?,?,?)
    `).run(req.params.productoId, nombre, factor, precio_1, precio_2 || null, precio_3 || null, precio_4 || null, codigo_barras || null);

    const row = db.prepare('SELECT * FROM presentaciones WHERE id = ?').get(info.lastInsertRowid);
    req.usuario.ip = req.ip;
    auditar(req.usuario, 'presentacion_creada', `${row.nombre} - Producto #${req.params.productoId}`);
    res.status(201).json(row);
  } catch (err) {
    console.error('Error al crear presentación:', err);
    res.status(500).json({ error: 'Error al crear presentación' });
  }
};

const actualizarPresentacion = (req, res) => {
  try {
    const { nombre, factor, precio_1, precio_2, precio_3, precio_4, codigo_barras, activo } = req.body;

    if (!isValidString(nombre)) return res.status(400).json({ error: 'El nombre de la presentación es requerido' });
    if (!isPositiveNumber(factor)) return res.status(400).json({ error: 'El factor debe ser un número positivo' });
    if (!isValidPrice(precio_1)) return res.status(400).json({ error: 'Precio 1 inválido' });
    if (precio_2 !== undefined && precio_2 !== null && !isValidPrice(precio_2)) return res.status(400).json({ error: 'Precio 2 inválido' });
    if (precio_3 !== undefined && precio_3 !== null && !isValidPrice(precio_3)) return res.status(400).json({ error: 'Precio 3 inválido' });
    if (precio_4 !== undefined && precio_4 !== null && !isValidPrice(precio_4)) return res.status(400).json({ error: 'Precio 4 inválido' });

    const info = db.prepare(`
      UPDATE presentaciones SET nombre=?, factor=?, precio_1=?, precio_2=?, precio_3=?, precio_4=?, codigo_barras=?, activo=?
      WHERE id=?
    `).run(nombre, factor, precio_1, precio_2 || null, precio_3 || null, precio_4 || null, codigo_barras || null, activo ?? 1, req.params.id);

    if (info.changes === 0) return res.status(404).json({ error: 'Presentación no encontrada' });
    const row = db.prepare('SELECT * FROM presentaciones WHERE id = ?').get(req.params.id);
    req.usuario.ip = req.ip;
    auditar(req.usuario, 'presentacion_actualizada', `${row.nombre}`);
    res.json(row);
  } catch (err) {
    console.error('Error al actualizar presentación:', err);
    res.status(500).json({ error: 'Error al actualizar presentación' });
  }
};

const eliminarPresentacion = (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM presentaciones WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Presentación no encontrada' });
    db.prepare('DELETE FROM presentaciones WHERE id = ?').run(req.params.id);
    req.usuario.ip = req.ip;
    auditar(req.usuario, 'presentacion_eliminada', `${row.nombre}`);
    res.json({ mensaje: 'Presentación eliminada' });
  } catch (err) {
    console.error('Error al eliminar presentación:', err);
    res.status(500).json({ error: 'Error al eliminar presentación' });
  }
};

const buscarPorCodigo = (req, res) => {
  try {
    const { codigo } = req.query;
    if (!codigo) return res.status(400).json({ error: 'Código requerido' });

    const presentacion = db.prepare(`
      SELECT p.*, pr.nombre as producto_nombre, pr.iva, pr.stock, pr.activo as producto_activo
      FROM presentaciones p
      JOIN productos pr ON p.producto_id = pr.id
      WHERE p.codigo_barras = ? AND p.activo = 1 AND pr.activo = 1
    `).get(codigo);

    if (!presentacion) {
      const producto = db.prepare(`
        SELECT * FROM productos WHERE codigo_interno = ? AND activo = 1
      `).get(codigo);
      if (producto) return res.json({ tipo: 'producto', data: producto });
      return res.status(404).json({ error: 'Código no encontrado' });
    }

    res.json({ tipo: 'presentacion', data: presentacion });
  } catch (err) {
    console.error('Error al buscar por código:', err);
    res.status(500).json({ error: 'Error al buscar código' });
  }
};

module.exports = { listarCategorias, listar, obtener, crear, actualizar, ajustarStock, eliminar, listarPresentaciones, crearPresentacion, actualizarPresentacion, eliminarPresentacion, buscarPorCodigo };

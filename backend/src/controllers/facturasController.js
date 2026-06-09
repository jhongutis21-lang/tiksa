const db = require('../config/db');
const auditar = require('../utils/auditar');
const { CO } = require('../config/timezone');
const { isPositiveNumber } = require('../utils/validate');

const listar = (req, res) => {
  try {
    const usuario = req.usuario;
    const { page = 1, limit = 50, desde, hasta, medio_pago, usuario_id, busqueda, orden, estado, cliente_id } = req.query;
    const pagina = Math.max(1, parseInt(page));
    const limite = Math.min(200, Math.max(1, parseInt(limit)));
    const offset = (pagina - 1) * limite;

    let where = "WHERE f.estado != 'eliminada'";
    const params = [];

    if (usuario.rol === 'cajero' || usuario.rol === 'domicilios') {
      where += ' AND f.usuario_id = ?';
      params.push(usuario.id);
    }

    if (desde) {
      where += ` AND DATE(f.fecha, '${CO}') >= ?`;
      params.push(desde);
    }
    if (hasta) {
      where += ` AND DATE(f.fecha, '${CO}') <= ?`;
      params.push(hasta);
    }
    if (medio_pago) {
      where += ' AND f.medio_pago = ?';
      params.push(medio_pago);
    }
    if (usuario_id && (usuario.rol === 'admin' || usuario.rol === 'encargado')) {
      where += ' AND f.usuario_id = ?';
      params.push(parseInt(usuario_id));
    }
    if (busqueda && busqueda.length >= 2) {
      where += ' AND (f.numero LIKE ? OR c.nombre LIKE ? OR u.nombre LIKE ?)';
      const q = `%${busqueda}%`;
      params.push(q, q, q);
    }
    if (estado) {
      where += ' AND f.estado = ?';
      params.push(estado);
    }
    if (cliente_id) {
      where += ' AND f.cliente_id = ?';
      params.push(parseInt(cliente_id));
    }

    const countRow = db.prepare(`
      SELECT COUNT(*) as total
      FROM facturas f
      JOIN clientes c ON f.cliente_id = c.id
      JOIN usuarios u ON f.usuario_id = u.id
      ${where}
    `).get(...params);
    const total = countRow.total;
    const paginas = Math.ceil(total / limite);

    const rows = db.prepare(`
      SELECT f.*, c.nombre as cliente_nombre, u.nombre as usuario_nombre,
             (SELECT i.observacion FROM items_factura i WHERE i.factura_id = f.id AND i.observacion != '' LIMIT 1) as primera_obs
      FROM facturas f
      JOIN clientes c ON f.cliente_id = c.id
      JOIN usuarios u ON f.usuario_id = u.id
      ${where}
      ORDER BY f.fecha ${orden === 'asc' ? 'ASC' : 'DESC'}
      LIMIT ? OFFSET ?
    `).all(...params, limite, offset);

    res.json({ data: rows, total, paginas, pagina });
  } catch (err) {
    console.error('Error al listar facturas:', err);
    res.status(500).json({ error: 'Error al listar facturas' });
  }
};

const obtener = (req, res) => {
  try {
    const factura = db.prepare(`
      SELECT f.*, c.nombre as cliente_nombre, c.nit as cliente_nit, c.tipo_persona, c.regimen,
             c.lista_precio, u.nombre as usuario_nombre
      FROM facturas f
      JOIN clientes c ON f.cliente_id = c.id
      JOIN usuarios u ON f.usuario_id = u.id
      WHERE f.id = ?
    `).get(req.params.id);

    if (!factura) return res.status(404).json({ error: 'Factura no encontrada' });

    const items = db.prepare(`
      SELECT i.*, p.nombre as producto_nombre, p.codigo_interno, p.stock
      FROM items_factura i JOIN productos p ON i.producto_id = p.id
      WHERE i.factura_id = ?
    `).all(req.params.id);

    const itemsConPres = items.map(i => ({
      ...i,
      nombre_mostrar: i.presentacion_nombre || i.producto_nombre
    }));

    res.json({ ...factura, items: itemsConPres });
  } catch (err) {
    console.error('Error al obtener factura:', err);
    res.status(500).json({ error: 'Error al obtener factura' });
  }
};

const crear = (req, res) => {
  try {
    const {
      tipo, cliente_id, items, medio_pago, observaciones,
      es_domicilio, dom_nombre, dom_telefono, dom_direccion, dom_referencia
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Debe incluir al menos un producto' });
    }

    const crearTransaccion = db.transaction(() => {
      const maxId = db.prepare('SELECT COALESCE(MAX(id), 0) + 1 as next FROM facturas').get();
      const nextId = maxId.next;
      const numero = `POS-${String(nextId).padStart(6, '0')}`;

      let subtotalSinIva = 0;
      let totalIva19 = 0;
      let totalIva5 = 0;
      let totalDescuentos = 0;
      let totalFactura = 0;
      const itemsCalculados = [];
      const alertas = [];

      for (const item of items) {
        const precio = item.precio_unitario;
        const cantidad = item.cantidad;
        if (!isFinite(cantidad) || cantidad <= 0) {
          throw new Error('Cantidad inválida en uno de los productos');
        }

        const prodStock = db.prepare('SELECT stock, nombre FROM productos WHERE id = ?').get(item.producto_id);
        const factor = item.presentacion_id ? db.prepare('SELECT factor FROM presentaciones WHERE id = ?').get(item.presentacion_id)?.factor || 1 : 1;
        if (!prodStock || (prodStock.stock < cantidad * factor && !item.omitir_stock)) {
          throw new Error(`Stock insuficiente para ${prodStock?.nombre || 'producto'}. Disponible: ${prodStock?.stock || 0}`);
        }

        const descPorcentaje = item.descuento_porcentaje || 0;
        const descMonto = Math.round(precio * cantidad * (descPorcentaje / 100) * 100) / 100;
        const totalItem = precio * cantidad - descMonto;

        let base, ivaMonto;
        if (item.iva > 0) {
          base = Math.round((totalItem / (1 + item.iva / 100)) * 100) / 100;
          ivaMonto = Math.round((totalItem - base) * 100) / 100;
        } else {
          base = totalItem;
          ivaMonto = 0;
        }

        subtotalSinIva += base;
        totalDescuentos += descMonto;
        totalFactura += totalItem;

        if (item.iva === 19) totalIva19 += ivaMonto;
        if (item.iva === 5) totalIva5 += ivaMonto;

        itemsCalculados.push({
          producto_id: item.producto_id,
          cantidad,
          precio_unitario: precio,
          base_sin_iva: base,
          iva_porcentaje: item.iva,
          iva_monto: ivaMonto,
          descuento_porcentaje: descPorcentaje,
          descuento_monto: descMonto,
          total: totalItem,
          observacion: item.observacion || '',
          presentacion_id: item.presentacion_id || null,
          presentacion_nombre: item.presentacion_nombre || null
        });
      }

      subtotalSinIva = Math.round(subtotalSinIva * 100) / 100;
      totalIva19 = Math.round(totalIva19 * 100) / 100;
      totalIva5 = Math.round(totalIva5 * 100) / 100;
      totalDescuentos = Math.round(totalDescuentos * 100) / 100;
      totalFactura = Math.round(totalFactura * 100) / 100;

      const cufe = `FAE-${numero}`;

      const factInfo = db.prepare(`
        INSERT INTO facturas (numero, tipo, cliente_id, usuario_id, subtotal, iva_19, iva_5, descuento, total, medio_pago, observaciones, es_domicilio, dom_nombre, dom_telefono, dom_direccion, dom_referencia, cufe)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(numero, tipo || 'POS', cliente_id, req.usuario.id, subtotalSinIva, totalIva19, totalIva5, totalDescuentos, totalFactura, medio_pago, observaciones, es_domicilio ? 1 : 0, dom_nombre, dom_telefono, dom_direccion, dom_referencia, cufe);

      const facturaId = factInfo.lastInsertRowid;

      const insertItem = db.prepare(`
        INSERT INTO items_factura (factura_id, producto_id, cantidad, precio_unitario, base_sin_iva, iva_porcentaje, iva_monto, descuento_porcentaje, descuento_monto, total, observacion, presentacion_id, presentacion_nombre)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
      `);

      const updateStock = db.prepare('UPDATE productos SET stock = stock - ? WHERE id = ?');
      const checkStock = db.prepare('SELECT stock, stock_minimo, nombre FROM productos WHERE id = ?');
      const insertAlerta = db.prepare('INSERT INTO alertas_stock (producto_id, stock_al_momento, usuario_id, factura_id) VALUES (?,?,?,?)');

      for (const ic of itemsCalculados) {
        insertItem.run(facturaId, ic.producto_id, ic.cantidad, ic.precio_unitario, ic.base_sin_iva, ic.iva_porcentaje, ic.iva_monto, ic.descuento_porcentaje, ic.descuento_monto, ic.total, ic.observacion, ic.presentacion_id, ic.presentacion_nombre);
        const factor = ic.presentacion_id ? db.prepare('SELECT factor FROM presentaciones WHERE id = ?').get(ic.presentacion_id)?.factor || 1 : 1;
        updateStock.run(ic.cantidad * factor, ic.producto_id);

        const prod = checkStock.get(ic.producto_id);
        if (prod.stock <= 0) {
          insertAlerta.run(ic.producto_id, prod.stock, req.usuario.id, facturaId);
          alertas.push({ producto: prod.nombre, stock: prod.stock });
        }
      }

      if (es_domicilio) {
        db.prepare('INSERT INTO domicilios (factura_id, estado) VALUES (?, ?)').run(facturaId, 'pendiente');
      }

      if (medio_pago === 'credito' || medio_pago === 'Credito' || medio_pago === 'CREDITO') {
        const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(cliente_id);
        const saldoActual = db.prepare('SELECT COALESCE(SUM(saldo_pendiente), 0) as total FROM creditos WHERE cliente_id = ? AND estado = ?').get(cliente_id, 'activo');
        if (cliente && cliente.limite_credito > 0 && (saldoActual.total + totalFactura) > cliente.limite_credito) {
          throw new Error(`El cliente excede su límite de crédito ($${cliente.limite_credito.toLocaleString('es-CO')})`);
        }
        db.prepare('INSERT INTO creditos (factura_id, cliente_id, total, saldo_pendiente) VALUES (?,?,?,?)').run(facturaId, cliente_id, totalFactura, totalFactura);
      }

      const factura = db.prepare('SELECT * FROM facturas WHERE id = ?').get(facturaId);
      const itemsFinal = db.prepare(`
        SELECT i.*, p.nombre as producto_nombre, p.stock FROM items_factura i JOIN productos p ON i.producto_id = p.id WHERE i.factura_id = ?
      `).all(facturaId).map(i => ({
        ...i,
        nombre_mostrar: i.presentacion_nombre || i.producto_nombre
      }));

      return { ...factura, items: itemsFinal, alertas };
    });

    const result = crearTransaccion();
    req.usuario.ip = req.ip;
    auditar(req.usuario, 'factura_creada', `Factura ${result.numero} - $${result.total.toLocaleString('es-CO')}`);
    res.status(201).json(result);
  } catch (err) {
    console.error('Error al crear factura:', err);
    if (err.message && err.message.startsWith('El cliente')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Error al crear factura' });
  }
};

const anular = (req, res) => {
  try {
    const { motivo } = req.body;
    const factura = db.prepare('SELECT * FROM facturas WHERE id = ?').get(req.params.id);
    if (!factura) return res.status(404).json({ error: 'Factura no encontrada' });
    if (factura.estado !== 'activa') return res.status(400).json({ error: 'La factura ya fue anulada o eliminada' });

    const anularTransaccion = db.transaction(() => {
      db.prepare("UPDATE facturas SET estado='anulada', motivo_anulacion=? WHERE id=?").run(motivo, req.params.id);

      const items = db.prepare('SELECT * FROM items_factura WHERE factura_id = ?').all(req.params.id);
      const restoreStock = db.prepare('UPDATE productos SET stock = stock + ? WHERE id = ?');
      const getFactor = db.prepare('SELECT factor FROM presentaciones WHERE id = ?');
      for (const item of items) {
        const factor = item.presentacion_id ? (getFactor.get(item.presentacion_id)?.factor || 1) : 1;
        restoreStock.run(item.cantidad * factor, item.producto_id);
      }

      const credito = db.prepare('SELECT * FROM creditos WHERE factura_id = ? AND estado = ?').get(req.params.id, 'activo');
      if (credito) {
        db.prepare("UPDATE creditos SET estado = 'anulado', saldo_pendiente = 0 WHERE id = ?").run(credito.id);
      }
    });

    anularTransaccion();
    const result = db.prepare('SELECT * FROM facturas WHERE id = ?').get(req.params.id);
    req.usuario.ip = req.ip;
    auditar(req.usuario, 'factura_anulada', `Factura ${result.numero} - Motivo: ${motivo}`);
    res.json(result);
  } catch (err) {
    console.error('Error al anular factura:', err);
    res.status(500).json({ error: 'Error al anular factura' });
  }
};

const eliminar = (req, res) => {
  try {
    const factura = db.prepare('SELECT * FROM facturas WHERE id = ?').get(req.params.id);
    if (!factura) return res.status(404).json({ error: 'Factura no encontrada' });

    const eliminarTransaccion = db.transaction(() => {
      if (factura.estado === 'activa') {
        const items = db.prepare('SELECT * FROM items_factura WHERE factura_id = ?').all(req.params.id);
        const restoreStock = db.prepare('UPDATE productos SET stock = stock + ? WHERE id = ?');
        const getFactor = db.prepare('SELECT factor FROM presentaciones WHERE id = ?');
        for (const item of items) {
          const factor = item.presentacion_id ? (getFactor.get(item.presentacion_id)?.factor || 1) : 1;
          restoreStock.run(item.cantidad * factor, item.producto_id);
        }
      }

      const credito = db.prepare('SELECT * FROM creditos WHERE factura_id = ? AND estado = ?').get(req.params.id, 'activo');
      if (credito) {
        db.prepare("UPDATE creditos SET estado = 'anulado', saldo_pendiente = 0 WHERE id = ?").run(credito.id);
      }

      db.prepare("UPDATE facturas SET estado='eliminada' WHERE id=?").run(req.params.id);
    });

    eliminarTransaccion();
    req.usuario.ip = req.ip;
    auditar(req.usuario, 'factura_eliminada', `Factura ${factura.numero}`);
    res.json({ mensaje: 'Factura eliminada' });
  } catch (err) {
    console.error('Error al eliminar factura:', err);
    res.status(500).json({ error: 'Error al eliminar factura' });
  }
};

const pdf = (req, res) => {
  try {
    const factura = db.prepare(`
      SELECT f.*, c.nombre as cliente_nombre, c.nit as cliente_nit, c.tipo_persona, c.regimen,
             u.nombre as usuario_nombre
      FROM facturas f
      JOIN clientes c ON f.cliente_id = c.id
      JOIN usuarios u ON f.usuario_id = u.id
      WHERE f.id = ?
    `).get(req.params.id);

    if (!factura) return res.status(404).json({ error: 'Factura no encontrada' });

    const items = db.prepare(`
      SELECT i.*, p.nombre as producto_nombre FROM items_factura i JOIN productos p ON i.producto_id = p.id WHERE i.factura_id = ?
    `).all(req.params.id);

    res.json({ factura, items });
  } catch (err) {
    console.error('Error al generar PDF:', err);
    res.status(500).json({ error: 'Error al generar PDF' });
  }
};

const devolver = (req, res) => {
  res.status(410).json({ error: 'Este endpoint fue reemplazado. Usa POST /api/notas-credito para crear una Nota Crédito.' });
};

const exportar = (req, res) => {
  try {
    const usuario = req.usuario;
    const { desde, hasta, medio_pago, usuario_id, estado, cliente_id } = req.query;

    let where = "WHERE f.estado != 'eliminada'";
    const params = [];

    if (usuario.rol === 'cajero' || usuario.rol === 'domicilios') {
      where += ' AND f.usuario_id = ?';
      params.push(usuario.id);
    }
    if (desde) {
      where += ' AND DATE(f.fecha) >= ?';
      params.push(desde);
    }
    if (hasta) {
      where += ' AND DATE(f.fecha) <= ?';
      params.push(hasta);
    }
    if (medio_pago) {
      where += ' AND f.medio_pago = ?';
      params.push(medio_pago);
    }
    if (usuario_id && (usuario.rol === 'admin' || usuario.rol === 'encargado')) {
      where += ' AND f.usuario_id = ?';
      params.push(parseInt(usuario_id));
    }
    if (estado) {
      where += ' AND f.estado = ?';
      params.push(estado);
    }
    if (cliente_id) {
      where += ' AND f.cliente_id = ?';
      params.push(parseInt(cliente_id));
    }

    const rows = db.prepare(`
      SELECT f.numero, f.fecha, c.nombre as cliente, c.nit, u.nombre as atendido_por,
             f.subtotal, f.iva_19, f.iva_5, f.descuento, f.total, f.medio_pago, f.estado
      FROM facturas f
      JOIN clientes c ON f.cliente_id = c.id
      JOIN usuarios u ON f.usuario_id = u.id
      ${where}
      ORDER BY f.fecha DESC
    `).all(...params);

    const escCsv = (v) => {
      const s = String(v == null ? '' : v);
      if (/^[=+\-@]/.test(s) || /["\n\r,]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const header = 'Numero,Fecha,Cliente,NIT,Atendido,Subtotal,IVA19,IVA5,Descuento,Total,MedioPago,Estado';
    const csv = rows.map((r) =>
      [r.numero, r.fecha, escCsv(r.cliente), escCsv(r.nit), r.atendido_por, r.subtotal, r.iva_19, r.iva_5, r.descuento, r.total, r.medio_pago, r.estado].join(',')
    ).join('\n');

    const bom = '\uFEFF';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="historial_${desde || 'todo'}_${hasta || 'todo'}.csv"`);
    res.send(bom + header + '\n' + csv);
  } catch (err) {
    console.error('Error al exportar:', err);
    res.status(500).json({ error: 'Error al exportar' });
  }
};

module.exports = { listar, obtener, crear, anular, eliminar, pdf, devolver, exportar };

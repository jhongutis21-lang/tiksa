const db = require('../config/db');
const auditar = require('../utils/auditar');

exports.crear = (req, res) => {
  try {
    const { factura_id, items, motivo, medio_pago_devolucion } = req.body;

    if (!factura_id) return res.status(400).json({ error: 'ID de factura requerido' });
    if (!items || items.length === 0) return res.status(400).json({ error: 'Debe incluir al menos un producto' });
    if (!motivo || !motivo.trim()) return res.status(400).json({ error: 'El motivo es obligatorio' });

    const factura = db.prepare('SELECT * FROM facturas WHERE id = ?').get(factura_id);
    if (!factura) return res.status(404).json({ error: 'Factura no encontrada' });
    if (factura.estado === 'anulada' || factura.estado === 'eliminada') {
      return res.status(400).json({ error: 'No se puede crear Nota Crédito sobre una factura anulada o eliminada' });
    }
    if (factura.estado === 'devuelta_total') {
      return res.status(400).json({ error: 'Esta factura ya fue devuelta totalmente' });
    }

    const itemsOriginales = db.prepare('SELECT * FROM items_factura WHERE factura_id = ?').all(factura_id);

    const crearTransaccion = db.transaction(() => {
      const maxId = db.prepare('SELECT COALESCE(MAX(id), 0) + 1 as next FROM notas_credito').get();
      const numero = `NC-${String(maxId.next).padStart(6, '0')}`;

      let subtotal = 0;
      let totalIva19 = 0;
      let totalIva5 = 0;
      let totalDescuentos = 0;
      let totalNC = 0;
      const itemsCalculados = [];

      for (const item of items) {
        const original = itemsOriginales.find(
          (oi) => oi.producto_id === item.producto_id && (oi.presentacion_id || null) === (item.presentacion_id || null)
        );
        if (!original) {
          throw new Error(`Producto ID ${item.producto_id} no encontrado en la factura original`);
        }
        if (item.cantidad > original.cantidad) {
          throw new Error(`No puedes devolver más de ${original.cantidad} del producto`);
        }

        const precio = original.precio_unitario;
        const descPorcentaje = original.descuento_porcentaje || 0;
        const descMonto = Math.round(precio * item.cantidad * (descPorcentaje / 100) * 100) / 100;
        const totalItem = Math.round((precio * item.cantidad - descMonto) * 100) / 100;
        const itemIva = original.iva_porcentaje || item.iva || 0;

        let base, ivaMonto;
        if (itemIva > 0) {
          base = Math.round((totalItem / (1 + itemIva / 100)) * 100) / 100;
          ivaMonto = Math.round((totalItem - base) * 100) / 100;
        } else {
          base = totalItem;
          ivaMonto = 0;
        }

        subtotal += base;
        totalDescuentos += descMonto;
        totalNC += totalItem;
        if (itemIva === 19) totalIva19 += ivaMonto;
        if (itemIva === 5) totalIva5 += ivaMonto;

        itemsCalculados.push({
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          precio_unitario: precio,
          iva_porcentaje: itemIva,
          iva_monto: ivaMonto,
          total: totalItem,
          presentacion_id: original.presentacion_id || null,
          presentacion_nombre: original.presentacion_nombre || null,
        });
      }

      subtotal = Math.round(subtotal * 100) / 100;
      totalIva19 = Math.round(totalIva19 * 100) / 100;
      totalIva5 = Math.round(totalIva5 * 100) / 100;
      totalDescuentos = Math.round(totalDescuentos * 100) / 100;
      totalNC = Math.round(totalNC * 100) / 100;

      const totalVendido = itemsOriginales.reduce((s, i) => {
        const descM = Math.round(i.precio_unitario * i.cantidad * ((i.descuento_porcentaje || 0) / 100) * 100) / 100;
        return s + Math.round((i.precio_unitario * i.cantidad - descM) * 100) / 100;
      }, 0);

      const tipo = Math.abs(totalNC - totalVendido) < 0.01 ? 'total' : 'parcial';

      const info = db.prepare(`
        INSERT INTO notas_credito (numero, factura_id, usuario_id, tipo, motivo, subtotal, iva_19, iva_5, descuento, total, medio_pago_devolucion)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)
      `).run(numero, factura_id, req.usuario.id, tipo, motivo.trim(), subtotal, totalIva19, totalIva5, totalDescuentos, totalNC, medio_pago_devolucion || 'efectivo');

      const ncId = info.lastInsertRowid;

      const insertItem = db.prepare(`
        INSERT INTO items_nota_credito (nota_credito_id, producto_id, cantidad, precio_unitario, iva_porcentaje, iva_monto, total, presentacion_id, presentacion_nombre)
        VALUES (?,?,?,?,?,?,?,?,?)
      `);

      const restoreStock = db.prepare('UPDATE productos SET stock = stock + ? WHERE id = ?');

      for (const ic of itemsCalculados) {
        insertItem.run(ncId, ic.producto_id, ic.cantidad, ic.precio_unitario, ic.iva_porcentaje, ic.iva_monto, ic.total, ic.presentacion_id, ic.presentacion_nombre);
        const factor = ic.presentacion_id
          ? db.prepare('SELECT factor FROM presentaciones WHERE id = ?').get(ic.presentacion_id)?.factor || 1
          : 1;
        restoreStock.run(ic.cantidad * factor, ic.producto_id);
      }

      db.prepare("UPDATE facturas SET estado = ? WHERE id = ?").run(tipo === 'total' ? 'devuelta_total' : 'devuelta_parcial', factura_id);

      const nc = db.prepare(`
        SELECT nc.*, u.nombre as usuario_nombre, f.numero as factura_numero, f.total as factura_total
        FROM notas_credito nc
        JOIN usuarios u ON nc.usuario_id = u.id
        JOIN facturas f ON nc.factura_id = f.id
        WHERE nc.id = ?
      `).get(ncId);

      const itemsNC = db.prepare(`
        SELECT inc.*, p.nombre as producto_nombre
        FROM items_nota_credito inc
        JOIN productos p ON inc.producto_id = p.id
        WHERE inc.nota_credito_id = ?
      `).all(ncId);

      return { ...nc, items: itemsNC };
    });

    const result = crearTransaccion();
    req.usuario.ip = req.ip;
    auditar(req.usuario, 'nota_credito_creada', `Nota Crédito ${result.numero} - Factura ${result.factura_numero} - $${result.total.toLocaleString('es-CO')} - Motivo: ${motivo}`);
    res.status(201).json(result);
  } catch (err) {
    console.error('Error al crear Nota Crédito:', err);
    if (err.message && (err.message.startsWith('Producto') || err.message.startsWith('No puedes'))) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Error al crear Nota Crédito' });
  }
};

exports.listar = (req, res) => {
  try {
    const { page = 1, limit = 50, desde, hasta } = req.query;
    const pagina = Math.max(1, parseInt(page));
    const limite = Math.min(200, Math.max(1, parseInt(limit)));
    const offset = (pagina - 1) * limite;

    let where = 'WHERE 1=1';
    const params = [];

    if (req.usuario.rol === 'cajero') {
      where += ' AND nc.usuario_id = ?';
      params.push(req.usuario.id);
    }
    if (desde) {
      where += ' AND DATE(nc.creado_en) >= ?';
      params.push(desde);
    }
    if (hasta) {
      where += ' AND DATE(nc.creado_en) <= ?';
      params.push(hasta);
    }

    const countRow = db.prepare(`
      SELECT COUNT(*) as total FROM notas_credito nc ${where}
    `).get(...params);
    const total = countRow.total;
    const paginas = Math.ceil(total / limite);

    const rows = db.prepare(`
      SELECT nc.*, u.nombre as usuario_nombre, f.numero as factura_numero
      FROM notas_credito nc
      JOIN usuarios u ON nc.usuario_id = u.id
      JOIN facturas f ON nc.factura_id = f.id
      ${where}
      ORDER BY nc.creado_en DESC
      LIMIT ? OFFSET ?
    `).all(...params, limite, offset);

    res.json({ data: rows, total, paginas, pagina });
  } catch (err) {
    console.error('Error al listar Notas Crédito:', err);
    res.status(500).json({ error: 'Error al listar Notas Crédito' });
  }
};

exports.obtener = (req, res) => {
  try {
    const nc = db.prepare(`
      SELECT nc.*, u.nombre as usuario_nombre, f.numero as factura_numero,
             c.nombre as cliente_nombre, c.nit as cliente_nit
      FROM notas_credito nc
      JOIN usuarios u ON nc.usuario_id = u.id
      JOIN facturas f ON nc.factura_id = f.id
      JOIN clientes c ON f.cliente_id = c.id
      WHERE nc.id = ?
    `).get(req.params.id);

    if (!nc) return res.status(404).json({ error: 'Nota Crédito no encontrada' });

    const items = db.prepare(`
      SELECT inc.*, p.nombre as producto_nombre
      FROM items_nota_credito inc
      JOIN productos p ON inc.producto_id = p.id
      WHERE inc.nota_credito_id = ?
    `).all(req.params.id);

    res.json({ ...nc, items });
  } catch (err) {
    console.error('Error al obtener Nota Crédito:', err);
    res.status(500).json({ error: 'Error al obtener Nota Crédito' });
  }
};

exports.anular = (req, res) => {
  try {
    const { motivo } = req.body;
    const nc = db.prepare('SELECT * FROM notas_credito WHERE id = ?').get(req.params.id);
    if (!nc) return res.status(404).json({ error: 'Nota Crédito no encontrada' });
    if (nc.estado !== 'activa') return res.status(400).json({ error: 'La Nota Crédito ya fue anulada' });

    const anularTransaccion = db.transaction(() => {
      db.prepare("UPDATE notas_credito SET estado='anulada', anulada_en=datetime('now'), motivo_anulacion=? WHERE id=?")
        .run(motivo || '', req.params.id);

      const items = db.prepare('SELECT * FROM items_nota_credito WHERE nota_credito_id = ?').all(req.params.id);
      const deductStock = db.prepare('UPDATE productos SET stock = stock - ? WHERE id = ?');
      for (const item of items) {
        const factor = item.presentacion_id
          ? db.prepare('SELECT factor FROM presentaciones WHERE id = ?').get(item.presentacion_id)?.factor || 1
          : 1;
        deductStock.run(item.cantidad * factor, item.producto_id);
      }

      const factura = db.prepare('SELECT * FROM facturas WHERE id = ?').get(nc.factura_id);
      if (factura.estado === 'devuelta_total') {
        db.prepare("UPDATE facturas SET estado='activa' WHERE id=?").run(nc.factura_id);
      } else if (factura.estado === 'devuelta_parcial') {
        const otrasActivas = db.prepare(
          "SELECT COUNT(*) as count FROM notas_credito WHERE factura_id = ? AND estado = 'activa' AND id != ?"
        ).get(nc.factura_id, req.params.id);
        if (otrasActivas.count === 0) {
          db.prepare("UPDATE facturas SET estado='activa' WHERE id=?").run(nc.factura_id);
        }
      }
    });

    anularTransaccion();
    req.usuario.ip = req.ip;
    auditar(req.usuario, 'nota_credito_anulada', `Nota Crédito ${nc.numero} anulada - Motivo: ${motivo}`);
    res.json({ mensaje: 'Nota Crédito anulada' });
  } catch (err) {
    console.error('Error al anular Nota Crédito:', err);
    res.status(500).json({ error: 'Error al anular Nota Crédito' });
  }
};

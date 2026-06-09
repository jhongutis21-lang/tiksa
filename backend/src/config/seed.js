const db = require('./db');
const bcrypt = require('bcryptjs');

async function seed() {
  const hash = await bcrypt.hash('tiksa2026', 10);

  const insertRol = db.prepare('INSERT OR IGNORE INTO roles (nombre) VALUES (?)');
  insertRol.run('admin');
  insertRol.run('encargado');
  insertRol.run('cajero');
  insertRol.run('domicilios');

  const insertUsuario = db.prepare('INSERT OR IGNORE INTO usuarios (nombre, usuario, contrasena, rol_id) VALUES (?,?,?,?)');
  insertUsuario.run('Luis Admin','luis',hash,1);
  insertUsuario.run('José Encargado','jose',hash,2);
  insertUsuario.run('Jhonatan Cajero','jhonatan',hash,3);
  insertUsuario.run('Marcus Cajero','marcus',hash,3);
  insertUsuario.run('Kevin Domicilios','kevin',hash,4);
  insertUsuario.run('Axel Repartidor','axel',hash,4);

  const insertCategoria = db.prepare('INSERT OR IGNORE INTO categorias (nombre) VALUES (?)');
  insertCategoria.run('Bebidas');
  insertCategoria.run('Dulces');
  insertCategoria.run('Cigarrillos');
  insertCategoria.run('Snacks');
  insertCategoria.run('Panadería');
  insertCategoria.run('Aseo');
  insertCategoria.run('Licores');

  const productos = [
    ['POSTOBON 2.5 LT', 11, 5000, 4500, 3500, 5000, 4000, 19, 'Bebidas'],
    ['STARLITE X10 MEDIO', 18, 4908, 4400, 3500, 4908, 4000, 19, 'Dulces'],
    ['TIC TAC SURTIDO DPX12', 45, 2400, 2100, 1800, 2400, 1800, 19, 'Dulces'],
    ['HALLS MENTA X12', 22, 1500, 1300, 1000, 1500, 1100, 19, 'Dulces'],
    ['MARLBORO ROJO x10', 18, 15000, 13500, 12000, 15000, 12000, 0, 'Cigarrillos'],
    ['AGUA CRISTAL 600ML', 40, 2000, 1800, 1500, 2000, 1400, -1, 'Bebidas'],
    ['PAN TAJADO BIMBO', 8, 7500, 6800, 6000, 7500, 5500, 5, 'Panadería'],
    ['JUMBO MANI 90G', 30, 6800, 6100, 5500, 6800, 5000, 19, 'Snacks'],
  ];

  const insertProducto = db.prepare(`
    INSERT OR IGNORE INTO productos (nombre, stock, stock_minimo, precio_1, precio_2, precio_3, precio_4, costo, iva, categoria_id)
    VALUES (?, ?, 5, ?, ?, ?, ?, ?, ?, (SELECT id FROM categorias WHERE nombre = ?))
  `);
  for (const [nombre, stock, p1, p2, p3, p4, costo, iva, cat] of productos) {
    insertProducto.run(nombre, stock, p1, p2, p3, p4, costo, iva, cat);
  }

  const insertCatGasto = db.prepare('INSERT OR IGNORE INTO categorias_gasto (nombre) VALUES (?)');
  insertCatGasto.run('Arriendo');
  insertCatGasto.run('Servicios públicos');
  insertCatGasto.run('Nómina');
  insertCatGasto.run('Transporte');
  insertCatGasto.run('Mercadeo');
  insertCatGasto.run('Mantenimiento');
  insertCatGasto.run('Papelería');
  insertCatGasto.run('Seguros');
  insertCatGasto.run('Otros');

  db.prepare("INSERT OR IGNORE INTO clientes (nombre, nit, tipo_persona, regimen, lista_precio) VALUES ('Consumidor Final', '222222222', 'Natural', 'Simplificado', 1)").run();

  console.log('Base de datos inicializada correctamente en data/tiksa.db');
  process.exit(0);
}

seed();

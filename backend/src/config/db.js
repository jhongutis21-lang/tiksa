const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../data/tiksa.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    usuario TEXT UNIQUE NOT NULL,
    contrasena TEXT NOT NULL,
    rol_id INTEGER REFERENCES roles(id),
    activo INTEGER DEFAULT 1,
    creado_en TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL
  );

  -- Deduplicate categorías and enforce uniqueness
  CREATE INDEX IF NOT EXISTS idx_categorias_nombre_temp ON categorias(nombre);
  UPDATE productos SET categoria_id = (
    SELECT MIN(c2.id) FROM categorias c2
    WHERE c2.nombre = (SELECT c3.nombre FROM categorias c3 WHERE c3.id = categoria_id)
  ) WHERE categoria_id NOT IN (SELECT MIN(id) FROM categorias GROUP BY nombre);
  DELETE FROM categorias WHERE id NOT IN (SELECT MIN(id) FROM categorias GROUP BY nombre);
  DROP INDEX IF EXISTS idx_categorias_nombre_temp;
  CREATE UNIQUE INDEX IF NOT EXISTS idx_categorias_nombre ON categorias(nombre);

  CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    codigo_interno TEXT UNIQUE,
    categoria_id INTEGER REFERENCES categorias(id),
    stock INTEGER DEFAULT 0,
    stock_minimo INTEGER DEFAULT 5,
    precio_1 REAL NOT NULL,
    precio_2 REAL NOT NULL,
    precio_3 REAL DEFAULT 0,
    precio_4 REAL DEFAULT 0,
    costo REAL DEFAULT 0,
    iva INTEGER DEFAULT 19,
    activo INTEGER DEFAULT 1,
    creado_en TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    nit TEXT UNIQUE NOT NULL,
    tipo_persona TEXT DEFAULT 'Natural',
    regimen TEXT DEFAULT 'Simplificado',
    lista_precio INTEGER DEFAULT 1,
    limite_credito REAL DEFAULT 0,
    telefono TEXT,
    correo TEXT,
    direccion TEXT,
    activo INTEGER DEFAULT 1,
    creado_en TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS facturas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero TEXT UNIQUE NOT NULL,
    tipo TEXT NOT NULL,
    cliente_id INTEGER REFERENCES clientes(id),
    usuario_id INTEGER REFERENCES usuarios(id),
    fecha TEXT DEFAULT (datetime('now')),
    subtotal REAL NOT NULL,
    iva_19 REAL DEFAULT 0,
    iva_5 REAL DEFAULT 0,
    descuento REAL DEFAULT 0,
    total REAL NOT NULL,
    medio_pago TEXT NOT NULL,
    estado TEXT DEFAULT 'activa',
    observaciones TEXT,
    es_domicilio INTEGER DEFAULT 0,
    dom_nombre TEXT,
    dom_telefono TEXT,
    dom_direccion TEXT,
    dom_referencia TEXT,
    motivo_anulacion TEXT,
    cufe TEXT
  );

  CREATE TABLE IF NOT EXISTS items_factura (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    factura_id INTEGER REFERENCES facturas(id) ON DELETE CASCADE,
    producto_id INTEGER REFERENCES productos(id),
    cantidad INTEGER NOT NULL,
    precio_unitario REAL NOT NULL,
    base_sin_iva REAL NOT NULL,
    iva_porcentaje INTEGER DEFAULT 19,
    iva_monto REAL DEFAULT 0,
    descuento_porcentaje REAL DEFAULT 0,
    descuento_monto REAL DEFAULT 0,
    total REAL NOT NULL,
    observacion TEXT,
    presentacion_id INTEGER REFERENCES presentaciones(id),
    presentacion_nombre TEXT
  );

  CREATE TABLE IF NOT EXISTS alertas_stock (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    producto_id INTEGER REFERENCES productos(id),
    stock_al_momento INTEGER NOT NULL,
    usuario_id INTEGER REFERENCES usuarios(id),
    factura_id INTEGER REFERENCES facturas(id),
    fecha TEXT DEFAULT (datetime('now')),
    resuelta INTEGER DEFAULT 0,
    nota TEXT
  );

  CREATE TABLE IF NOT EXISTS domicilios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    factura_id INTEGER REFERENCES facturas(id),
    estado TEXT DEFAULT 'pendiente',
    fecha_salida TEXT,
    fecha_entrega TEXT
  );

  CREATE TABLE IF NOT EXISTS cambios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    factura_original_id INTEGER REFERENCES facturas(id),
    usuario_id INTEGER REFERENCES usuarios(id),
    fecha TEXT DEFAULT (datetime('now')),
    motivo TEXT,
    diferencia REAL DEFAULT 0,
    estado TEXT DEFAULT 'procesado'
  );

  CREATE TABLE IF NOT EXISTS items_cambio (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cambio_id INTEGER REFERENCES cambios(id),
    tipo TEXT NOT NULL,
    producto_id INTEGER REFERENCES productos(id),
    cantidad INTEGER NOT NULL,
    precio REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS presentaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    producto_id INTEGER REFERENCES productos(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    factor REAL NOT NULL DEFAULT 1.0,
    precio_1 REAL NOT NULL,
    precio_2 REAL,
    precio_3 REAL,
    precio_4 REAL,
    codigo_barras TEXT,
    activo INTEGER DEFAULT 1
  );

  CREATE INDEX IF NOT EXISTS idx_presentaciones_producto ON presentaciones(producto_id);
  CREATE INDEX IF NOT EXISTS idx_presentaciones_codigo ON presentaciones(codigo_barras);

  CREATE INDEX IF NOT EXISTS idx_facturas_fecha_estado ON facturas(fecha, estado);
  CREATE INDEX IF NOT EXISTS idx_facturas_cliente_estado ON facturas(cliente_id, estado);
  CREATE INDEX IF NOT EXISTS idx_facturas_usuario_estado ON facturas(usuario_id, estado);

  CREATE INDEX IF NOT EXISTS idx_items_factura_factura ON items_factura(factura_id);
  CREATE INDEX IF NOT EXISTS idx_items_factura_producto ON items_factura(producto_id);

  CREATE INDEX IF NOT EXISTS idx_creditos_cliente_estado ON creditos(cliente_id, estado);
  CREATE INDEX IF NOT EXISTS idx_creditos_factura_estado ON creditos(factura_id, estado);

  CREATE INDEX IF NOT EXISTS idx_abonos_credito ON abonos(credito_id);
  CREATE INDEX IF NOT EXISTS idx_domicilios_factura_estado ON domicilios(factura_id, estado);
  CREATE INDEX IF NOT EXISTS idx_gastos_fecha ON gastos(fecha);
  CREATE INDEX IF NOT EXISTS idx_gastos_categoria ON gastos(categoria_id);

  CREATE INDEX IF NOT EXISTS idx_apertura_caja_fecha_estado ON apertura_caja(fecha_apertura, estado);
  CREATE INDEX IF NOT EXISTS idx_movimientos_caja_apertura ON movimientos_caja(apertura_id);
  CREATE INDEX IF NOT EXISTS idx_notas_credito_factura ON notas_credito(factura_id);
  CREATE INDEX IF NOT EXISTS idx_items_nota_credito_nota ON items_nota_credito(nota_credito_id);

  CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria(fecha);
  CREATE INDEX IF NOT EXISTS idx_auditoria_accion ON auditoria(accion);
  CREATE INDEX IF NOT EXISTS idx_productos_categoria_activo ON productos(categoria_id, activo);

  CREATE TABLE IF NOT EXISTS auditoria (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER REFERENCES usuarios(id),
    usuario_nombre TEXT NOT NULL,
    accion TEXT NOT NULL,
    detalle TEXT,
    ip TEXT,
    fecha TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS apertura_caja (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER REFERENCES usuarios(id),
    monto_inicial REAL NOT NULL DEFAULT 0,
    fecha_apertura TEXT DEFAULT (datetime('now')),
    fecha_cierre TEXT,
    estado TEXT DEFAULT 'abierta',
    observaciones TEXT
  );

  CREATE TABLE IF NOT EXISTS movimientos_caja (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    apertura_id INTEGER REFERENCES apertura_caja(id),
    tipo TEXT NOT NULL CHECK(tipo IN ('ingreso','egreso')),
    concepto TEXT NOT NULL,
    monto REAL NOT NULL,
    usuario_id INTEGER REFERENCES usuarios(id),
    fecha TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS categorias_gasto (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS gastos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    categoria_id INTEGER REFERENCES categorias_gasto(id),
    descripcion TEXT NOT NULL,
    monto REAL NOT NULL,
    forma_pago TEXT DEFAULT 'efectivo',
    usuario_id INTEGER REFERENCES usuarios(id),
    fecha TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS creditos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    factura_id INTEGER REFERENCES facturas(id),
    cliente_id INTEGER REFERENCES clientes(id),
    total REAL NOT NULL,
    saldo_pendiente REAL NOT NULL,
    estado TEXT DEFAULT 'activo',
    fecha_vencimiento TEXT,
    creado_en TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS abonos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    credito_id INTEGER REFERENCES creditos(id),
    monto REAL NOT NULL,
    medio_pago TEXT DEFAULT 'efectivo',
    usuario_id INTEGER REFERENCES usuarios(id),
    fecha TEXT DEFAULT (datetime('now')),
    observaciones TEXT
  );

  CREATE TABLE IF NOT EXISTS temporales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    datos TEXT NOT NULL,
    creado_en TEXT DEFAULT (datetime('now')),
    actualizado_en TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notas_credito (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero TEXT UNIQUE NOT NULL,
    factura_id INTEGER NOT NULL REFERENCES facturas(id),
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    tipo TEXT NOT NULL DEFAULT 'parcial',
    motivo TEXT NOT NULL,
    subtotal REAL NOT NULL,
    iva_19 REAL DEFAULT 0,
    iva_5 REAL DEFAULT 0,
    descuento REAL DEFAULT 0,
    total REAL NOT NULL,
    medio_pago_devolucion TEXT DEFAULT 'efectivo',
    estado TEXT DEFAULT 'activa',
    creado_en TEXT DEFAULT (datetime('now')),
    anulada_en TEXT,
    motivo_anulacion TEXT
  );

  CREATE TABLE IF NOT EXISTS items_nota_credito (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nota_credito_id INTEGER NOT NULL REFERENCES notas_credito(id) ON DELETE CASCADE,
    producto_id INTEGER REFERENCES productos(id),
    cantidad INTEGER NOT NULL,
    precio_unitario REAL NOT NULL,
    iva_porcentaje INTEGER DEFAULT 19,
    iva_monto REAL DEFAULT 0,
    total REAL NOT NULL,
    presentacion_id INTEGER REFERENCES presentaciones(id),
    presentacion_nombre TEXT
  );
`);

module.exports = db;

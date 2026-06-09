const PERMISOS = {
  admin: [
    'ver_dashboard', 'crear_factura', 'ver_historial_todos',
    'editar_factura_pos', 'anular_factura', 'eliminar_factura',
    'ver_inventario', 'editar_inventario', 'ajustar_stock',
    'ver_clientes', 'editar_clientes',
    'ver_caja', 'cerrar_caja', 'abrir_caja', 'registrar_movimiento',
    'ver_reportes', 'resolver_alertas',
    'ver_domicilios', 'actualizar_domicilio',
    'ver_usuarios', 'crear_usuario', 'editar_usuario',
    'ver_auditoria',
    'ver_gastos', 'editar_gastos',
    'ver_creditos', 'crear_credito', 'registrar_abono'
  ],
  encargado: [
    'ver_dashboard', 'crear_factura', 'ver_historial_todos',
    'editar_factura_pos', 'anular_factura',
    'ver_inventario', 'ajustar_stock',
    'ver_clientes', 'editar_clientes',
    'ver_reportes', 'resolver_alertas',
    'ver_domicilios', 'actualizar_domicilio',
    'abrir_caja', 'registrar_movimiento',
    'ver_gastos',
    'ver_creditos', 'registrar_abono'
  ],
  cajero: [
    'crear_factura', 'ver_historial_propio',
    'registrar_movimiento'
  ],
  domicilios: [
    'crear_factura', 'ver_historial_propio',
    'ver_domicilios', 'actualizar_domicilio'
  ]
};

const tienePermiso = (permiso) => {
  return (req, res, next) => {
    const rol = req.usuario.rol;
    if (!rol || !PERMISOS[rol]) {
      return res.status(403).json({ error: 'Rol no válido' });
    }
    if (!PERMISOS[rol].includes(permiso)) {
      return res.status(403).json({ error: 'No tienes permiso para esta acción' });
    }
    next();
  };
};

const soloRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'No tienes permiso para esta acción' });
    }
    next();
  };
};

module.exports = { tienePermiso, soloRoles, PERMISOS };

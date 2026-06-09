const router = require('express').Router();
const auth = require('../middleware/auth');
const { tienePermiso } = require('../middleware/roles');
const { dashboard, ventasDiarias, productosMasVendidos, porMetodoPago, ticketPromedio, stockProyeccion, horasPico, domiciliosHoy } = require('../controllers/reportesController');

router.get('/dashboard', auth, tienePermiso('ver_dashboard'), dashboard);
router.get('/ventas-diarias', auth, tienePermiso('ver_reportes'), ventasDiarias);
router.get('/productos-mas-vendidos', auth, tienePermiso('ver_reportes'), productosMasVendidos);
router.get('/por-metodo-pago', auth, tienePermiso('ver_reportes'), porMetodoPago);
router.get('/ticket-promedio', auth, tienePermiso('ver_dashboard'), ticketPromedio);
router.get('/stock-proyeccion', auth, tienePermiso('ver_dashboard'), stockProyeccion);
router.get('/horas-pico', auth, tienePermiso('ver_dashboard'), horasPico);
router.get('/domicilios-hoy', auth, tienePermiso('ver_dashboard'), domiciliosHoy);

module.exports = router;

const { Router } = require('express');
const router = Router();
const cajaController = require('../controllers/cajaController');
const auth = require('../middleware/auth');
const { tienePermiso } = require('../middleware/roles');

router.get('/resumen', auth, tienePermiso('ver_caja'), cajaController.resumen);
router.post('/abrir', auth, tienePermiso('abrir_caja'), cajaController.abrir);
router.post('/cerrar', auth, tienePermiso('cerrar_caja'), cajaController.cerrar);
router.post('/movimiento', auth, tienePermiso('registrar_movimiento'), cajaController.registrarMovimiento);

module.exports = router;

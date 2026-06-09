const { Router } = require('express');
const router = Router();
const creditosController = require('../controllers/creditosController');
const auth = require('../middleware/auth');
const { tienePermiso } = require('../middleware/roles');

router.get('/', auth, tienePermiso('ver_creditos'), creditosController.listar);
router.get('/totales', auth, tienePermiso('ver_creditos'), creditosController.totales);
router.get('/cliente/:clienteId', auth, tienePermiso('ver_creditos'), creditosController.resumenCliente);
router.get('/:id', auth, tienePermiso('ver_creditos'), creditosController.obtener);
router.post('/', auth, tienePermiso('crear_credito'), creditosController.crear);
router.post('/:id/abonar', auth, tienePermiso('registrar_abono'), creditosController.abonar);

module.exports = router;

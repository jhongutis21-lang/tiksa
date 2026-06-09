const { Router } = require('express');
const router = Router();
const gastosController = require('../controllers/gastosController');
const auth = require('../middleware/auth');
const { tienePermiso } = require('../middleware/roles');

router.get('/', auth, tienePermiso('ver_gastos'), gastosController.listar);
router.post('/', auth, tienePermiso('editar_gastos'), gastosController.crear);
router.delete('/:id', auth, tienePermiso('editar_gastos'), gastosController.eliminar);
router.get('/categorias', auth, tienePermiso('ver_gastos'), gastosController.listarCategorias);
router.get('/totales', auth, tienePermiso('ver_gastos'), gastosController.totales);

module.exports = router;

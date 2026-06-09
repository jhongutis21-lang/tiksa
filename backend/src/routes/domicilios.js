const { Router } = require('express');
const router = Router();
const domiciliosController = require('../controllers/domiciliosController');
const auth = require('../middleware/auth');
const { tienePermiso, soloRoles } = require('../middleware/roles');

router.get('/', auth, tienePermiso('ver_domicilios'), domiciliosController.listar);
router.get('/historial', auth, tienePermiso('ver_domicilios'), domiciliosController.historial);
router.patch('/:id/estado', auth, tienePermiso('actualizar_domicilio'), domiciliosController.actualizarEstado);
router.get('/hoy', auth, tienePermiso('ver_domicilios'), domiciliosController.hoy);
router.delete('/:id', auth, soloRoles('admin'), domiciliosController.eliminar);

module.exports = router;

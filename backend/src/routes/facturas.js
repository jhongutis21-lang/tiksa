const { Router } = require('express');
const router = Router();
const facturasController = require('../controllers/facturasController');
const auth = require('../middleware/auth');
const { tienePermiso, soloRoles } = require('../middleware/roles');

router.get('/', auth, tienePermiso('ver_historial_todos'), facturasController.listar);
router.get('/exportar', auth, tienePermiso('ver_historial_todos'), facturasController.exportar);
router.get('/:id', auth, facturasController.obtener);
router.post('/', auth, tienePermiso('crear_factura'), facturasController.crear);
router.patch('/:id/anular', auth, tienePermiso('anular_factura'), facturasController.anular);
router.delete('/:id', auth, soloRoles('admin'), facturasController.eliminar);
router.get('/:id/pdf', auth, facturasController.pdf);

module.exports = router;

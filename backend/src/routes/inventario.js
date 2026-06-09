const { Router } = require('express');
const router = Router();
const inventarioController = require('../controllers/inventarioController');
const auth = require('../middleware/auth');
const { tienePermiso } = require('../middleware/roles');

router.get('/alertas', auth, tienePermiso('ver_inventario'), inventarioController.alertas);
router.patch('/alertas/:id/resolver', auth, tienePermiso('resolver_alertas'), inventarioController.resolver);
router.get('/reporte-diario', auth, tienePermiso('ver_reportes'), inventarioController.reporteDiario);

module.exports = router;

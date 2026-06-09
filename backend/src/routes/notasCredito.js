const { Router } = require('express');
const router = Router();
const notasCreditoController = require('../controllers/notasCreditoController');
const auth = require('../middleware/auth');
const { tienePermiso } = require('../middleware/roles');

router.post('/', auth, tienePermiso('crear_factura'), notasCreditoController.crear);
router.get('/', auth, notasCreditoController.listar);
router.get('/:id', auth, notasCreditoController.obtener);
router.patch('/:id/anular', auth, tienePermiso('anular_factura'), notasCreditoController.anular);

module.exports = router;

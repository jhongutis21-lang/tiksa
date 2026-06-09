const { Router } = require('express');
const router = Router();
const clientesController = require('../controllers/clientesController');
const auth = require('../middleware/auth');
const { tienePermiso } = require('../middleware/roles');

router.get('/', auth, tienePermiso('ver_clientes'), clientesController.listar);
router.get('/:id', auth, tienePermiso('ver_clientes'), clientesController.obtener);
router.post('/', auth, tienePermiso('editar_clientes'), clientesController.crear);
router.put('/:id', auth, tienePermiso('editar_clientes'), clientesController.actualizar);
router.delete('/:id', auth, tienePermiso('editar_clientes'), clientesController.eliminar);

module.exports = router;

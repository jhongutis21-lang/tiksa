const { Router } = require('express');
const router = Router();
const temporalesController = require('../controllers/temporalesController');
const auth = require('../middleware/auth');

router.get('/', auth, temporalesController.listar);
router.post('/', auth, temporalesController.guardar);
router.get('/:id', auth, temporalesController.obtener);
router.delete('/:id', auth, temporalesController.eliminar);
router.post('/limpiar', auth, temporalesController.limpiarViejos);

module.exports = router;

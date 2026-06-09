const { Router } = require('express');
const router = Router();
const cambiosController = require('../controllers/cambiosController');
const auth = require('../middleware/auth');
const { tienePermiso } = require('../middleware/roles');

router.post('/', auth, tienePermiso('procesar_cambios'), cambiosController.crear);
router.get('/', auth, tienePermiso('procesar_cambios'), cambiosController.listar);

module.exports = router;

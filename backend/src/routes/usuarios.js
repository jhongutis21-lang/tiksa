const { Router } = require('express');
const router = Router();
const rateLimit = require('express-rate-limit');
const usuariosController = require('../controllers/usuariosController');
const auth = require('../middleware/auth');
const { tienePermiso } = require('../middleware/roles');

const usuarioLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Demasiadas solicitudes. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/', auth, tienePermiso('ver_usuarios'), usuariosController.listar);
router.post('/', auth, usuarioLimiter, tienePermiso('crear_usuario'), usuariosController.crear);
router.put('/:id', auth, tienePermiso('editar_usuario'), usuariosController.actualizar);
router.patch('/:id/contrasena', auth, usuarioLimiter, tienePermiso('editar_usuario'), usuariosController.cambiarContrasena);
router.patch('/:id/estado', auth, tienePermiso('editar_usuario'), usuariosController.cambiarEstado);

module.exports = router;

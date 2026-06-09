const { Router } = require('express');
const router = Router();
const productosController = require('../controllers/productosController');
const auth = require('../middleware/auth');
const { tienePermiso, soloRoles } = require('../middleware/roles');

router.get('/categorias', auth, tienePermiso('ver_inventario'), productosController.listarCategorias);
router.get('/', auth, tienePermiso('ver_inventario'), productosController.listar);
router.get('/buscar-codigo', auth, tienePermiso('crear_factura'), productosController.buscarPorCodigo);
router.get('/:id', auth, tienePermiso('ver_inventario'), productosController.obtener);
router.post('/', auth, soloRoles('admin'), productosController.crear);
router.put('/:id', auth, soloRoles('admin'), productosController.actualizar);
router.patch('/:id/stock', auth, tienePermiso('ajustar_stock'), productosController.ajustarStock);
router.delete('/:id', auth, soloRoles('admin'), productosController.eliminar);

router.get('/:productoId/presentaciones', auth, tienePermiso('ver_inventario'), productosController.listarPresentaciones);
router.post('/:productoId/presentaciones', auth, soloRoles('admin'), productosController.crearPresentacion);
router.put('/presentaciones/:id', auth, soloRoles('admin'), productosController.actualizarPresentacion);
router.delete('/presentaciones/:id', auth, soloRoles('admin'), productosController.eliminarPresentacion);

module.exports = router;

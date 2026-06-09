require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const productosRoutes = require('./routes/productos');
const clientesRoutes = require('./routes/clientes');
const facturasRoutes = require('./routes/facturas');
const inventarioRoutes = require('./routes/inventario');
const domiciliosRoutes = require('./routes/domicilios');
const usuariosRoutes = require('./routes/usuarios');
const cajaRoutes = require('./routes/caja');
const cambiosRoutes = require('./routes/cambios');
const auditoriaRoutes = require('./routes/auditoria');
const gastosRoutes = require('./routes/gastos');
const creditosRoutes = require('./routes/creditos');
const temporalesRoutes = require('./routes/temporales');
const notasCreditoRoutes = require('./routes/notasCredito');
const reportesRoutes = require('./routes/reportes');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/facturas', facturasRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/domicilios', domiciliosRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/caja', cajaRoutes);
app.use('/api/cambios', cambiosRoutes);
app.use('/api/auditoria', auditoriaRoutes);
app.use('/api/gastos', gastosRoutes);
app.use('/api/creditos', creditosRoutes);
app.use('/api/temporales', temporalesRoutes);
app.use('/api/notas-credito', notasCreditoRoutes);
app.use('/api/reportes', reportesRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', proyecto: 'tiksa' });
});

app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`tiksa API corriendo en puerto ${PORT}`);
});

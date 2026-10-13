const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const authRoutes = require('./modules/auth/auth.routes');
const rutasRoutes = require('./modules/rutas/rutas.routes');
const registrosRoutes = require('./modules/registros/registros.routes');
const planillasRoutes = require('./modules/planillas/planillas.routes');
const errorHandler = require('./middlewares/error.middleware');

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

app.get('/', (req, res) => {
  res.send('Servidor funcionando');
});

// Rutas versionadas de la API
app.use('/api/v1', authRoutes);
app.use('/api/v1', rutasRoutes);
app.use('/api/v1', registrosRoutes);
app.use('/api/v1', planillasRoutes);

// Manejador central de errores
app.use(errorHandler);

module.exports = app;
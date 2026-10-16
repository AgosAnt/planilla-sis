import express from 'express';
import authRoutes from './modules/auth/auth.routes.js';
import registrosRoutes from './modules/registros/registros.routes.js';
import rutasRoutes from './modules/rutas/rutas.routes.js';
import planillasRoutes from './modules/planillas/planillas.routes.js';
import eventosRoutes from './modules/eventos/eventos.routes.js'; // <- Importar eventos
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();

app.use(express.json());

// Rutas específicas primero
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/registros-tiempo', registrosRoutes);
app.use('/api/v1/rutas', rutasRoutes);
app.use('/api/v1/planillas', planillasRoutes);
app.use('/api/v1/eventos', eventosRoutes); // <- Registrar ruta de eventos

// Ruta base/general al final
app.use('/api/v1', authRoutes); // Para endpoint GET /api/v1/me

// Middleware global de manejo de errores
app.use(errorHandler);

export default app;
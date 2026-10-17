import express from 'express';
import authRoutes from './modules/auth/auth.routes.js';
import registrosRoutes from './modules/registros/registros.routes.js';
import rutasRoutes from './modules/rutas/rutas.routes.js';
import planillasRoutes from './modules/planillas/planillas.routes.js';
import eventosDescansoRoutes from './modules/eventos_descanso/eventos_descanso.routes.js';
import eventosRutaRoutes from './modules/eventos_ruta/eventos_ruta.routes.js';
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();

// Lote de eventos del móvil: hasta 256 KB (contrato E-7). Va antes del parser global (100 KB).
// El ":" va escapado para que Express no lo tome como parámetro de ruta.
app.use('/api/v1/eventos\\:batch', express.json({ limit: '256kb' }));
app.use(express.json());

// Rutas específicas primero
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/registros-tiempo/:id/descansos', eventosDescansoRoutes);
app.use('/api/v1/registros-tiempo', registrosRoutes);
app.use('/api/v1/rutas', rutasRoutes);
app.use('/api/v1/planillas', planillasRoutes);
app.use('/api/v1/eventos\\:batch', eventosRutaRoutes);

// Ruta base/general al final
app.use('/api/v1', authRoutes); // Para endpoint GET /api/v1/me

// Middleware global de manejo de errores
app.use(errorHandler);

export default app;

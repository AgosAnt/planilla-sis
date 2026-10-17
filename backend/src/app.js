import express from 'express';
import cors from 'cors';
import authRoutes from './modules/auth/auth.routes.js';
import registrosRoutes from './modules/registros/registros.routes.js';
import rutasRoutes from './modules/rutas/rutas.routes.js';
import planillasRoutes from './modules/planillas/planillas.routes.js';
import eventosDescansoRoutes from './modules/eventos_descanso/eventos_descanso.routes.js';
import eventosRutaRoutes from './modules/eventos_ruta/eventos_ruta.routes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { cabecerasSeguridad, origenesPermitidos } from './middlewares/seguridad.js';

const app = express();

// Seguridad (F.2): sin cabecera X-Powered-By y con cabeceras de seguridad en toda respuesta
app.disable('x-powered-by');
app.use(cabecerasSeguridad);

// CORS con lista blanca y credenciales (cookies) solo para los orígenes de CORS_ORIGINS
const origenes = origenesPermitidos();
if (origenes.length > 0) {
  app.use(cors({
    origin: origenes,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'Idempotency-Key', 'X-Client-Type'],
  }));
}

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

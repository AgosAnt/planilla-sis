import express from 'express';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes, { perfilRouter } from './modules/auth/auth.routes.js';
import registrosRoutes from './modules/registros/registros.routes.js';
import rutasRoutes from './modules/rutas/rutas.routes.js';
import planillasRoutes from './modules/planillas/planillas.routes.js';
import eventosDescansoRoutes from './modules/eventos_descanso/eventos_descanso.routes.js';
import eventosRutaRoutes from './modules/eventos_ruta/eventos_ruta.routes.js';
import usuariosRoutes from './modules/usuarios/usuarios.routes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { cabecerasSeguridad, cabecerasWeb, origenesPermitidos } from './middlewares/seguridad.js';

// Web (prototipo en planilla-sis/web). Mismo origen que la API: la cookie de sesión funciona sin CORS.
const WEB_DIR = fileURLToPath(new URL('../../web', import.meta.url));

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

app.use(cookieParser());

// Lote de eventos del móvil: hasta 256 KB (contrato E-7). Va antes del parser global (100 KB).
// El ":" va escapado para que Express no lo tome como parámetro de ruta.
app.use('/api/v1/eventos\\:batch', express.json({ limit: '256kb' }));
app.use(express.json());

// Rutas específicas primero
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/me', perfilRouter);
app.use('/api/v1/admin/usuarios', usuariosRoutes);
app.use('/api/v1/registros-tiempo/:id/descansos', eventosDescansoRoutes);
app.use('/api/v1/registros-tiempo', registrosRoutes);
app.use('/api/v1/rutas', rutasRoutes);
app.use('/api/v1/planillas', planillasRoutes);
app.use('/api/v1/eventos\\:batch', eventosRutaRoutes);

// Ruta de API inexistente: 404 en problem+json, no la página HTML por defecto de Express
app.use('/api', (req, res) => {
  res.status(404).type('application/problem+json').json({
    type: 'about:blank',
    title: 'No encontrado',
    status: 404,
    detail: 'La ruta de la API no existe.',
    code: 'RUTA_NO_ENCONTRADA',
    instance: req.originalUrl,
  });
});

// Archivos de la web y fallback a index.html para los deep links de la History API (B.3)
if (existsSync(WEB_DIR)) {
  app.use(cabecerasWeb);
  app.use(express.static(WEB_DIR));
  app.get('*', (req, res) => res.sendFile('index.html', { root: WEB_DIR }));
}

// Middleware global de manejo de errores
app.use(errorHandler);

export default app;

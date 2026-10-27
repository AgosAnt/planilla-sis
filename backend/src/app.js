import express from 'express';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes, { perfilRouter } from './modules/auth/auth.routes.js';
import auditoriaRoutes from './modules/auditoria/auditoria.routes.js';
import registrosRoutes from './modules/registros/registros.routes.js';
import rutasRoutes from './modules/rutas/rutas.routes.js';
import planillasRoutes, { miCalculoRouter } from './modules/planillas/planillas.routes.js';
import { parametrosRouter, feriadosRouter, tarifasRouter } from './modules/parametros/parametros.routes.js';
import eventosDescansoRoutes from './modules/eventos_descanso/eventos_descanso.routes.js';
import eventosRutaRoutes from './modules/eventos_ruta/eventos_ruta.routes.js';
import usuariosRoutes from './modules/usuarios/usuarios.routes.js';
import eventosRoutes from './modules/eventos/eventos.routes.js';
import {
  asignacionesDeRutaRouter, asignacionesRouter, acuerdosTurnoRouter, catalogosRouter,
} from './modules/asignaciones/asignaciones.routes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { cabecerasSeguridad, cabecerasWeb, origenesPermitidos } from './middlewares/seguridad.js';

// Web: mismo origen que la API, así la cookie de sesión funciona sin CORS.
// Se sirve la compilación de React (web/dist) si existe; si no, el prototipo (web-prototipo)
// para que la demostración nunca quede en blanco. La elección se hace al arrancar el servidor.
const WEB_DIST = fileURLToPath(new URL('../../web/dist', import.meta.url));
const WEB_PROTOTIPO = fileURLToPath(new URL('../../web-prototipo', import.meta.url));
const WEB_DIR = existsSync(join(WEB_DIST, 'index.html')) ? WEB_DIST : WEB_PROTOTIPO;

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
app.use('/api/v1/auditoria', auditoriaRoutes);
app.use('/api/v1/registros-tiempo/:id/descansos', eventosDescansoRoutes);
app.use('/api/v1/registros-tiempo', registrosRoutes);
app.use('/api/v1/rutas/:rutaId/asignaciones', asignacionesDeRutaRouter);
app.use('/api/v1/rutas', rutasRoutes);
app.use('/api/v1/asignaciones', asignacionesRouter);
app.use('/api/v1/eventos', eventosRoutes);
app.use('/api/v1/acuerdos-turno', acuerdosTurnoRouter);
app.use('/api/v1/catalogos', catalogosRouter);
app.use('/api/v1/planillas', planillasRoutes);
app.use('/api/v1/me/calculo', miCalculoRouter);
app.use('/api/v1/admin/parametros-pago', parametrosRouter);
app.use('/api/v1/admin/feriados', feriadosRouter);
app.use('/api/v1/trabajadores/:trabajadorId/tarifas', tarifasRouter);
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
  console.log(`[planilla-sis] Web servida desde ${WEB_DIR}`);
  app.use(cabecerasWeb);
  app.use(express.static(WEB_DIR));
  app.get('*', (req, res) => res.sendFile('index.html', { root: WEB_DIR }));
}

// Middleware global de manejo de errores
app.use(errorHandler);

export default app;

import { Router } from 'express';
import { sincronizarEventos } from './eventos_ruta.controller.js';
import { validarEventosBatch } from '../../middlewares/validarEventosBatch.js';
import { requerirIdempotencyKey } from '../../middlewares/idempotencia.js';
import { autenticarToken, requerirRol } from '../../middlewares/auth.js';

// Montado en /api/v1/eventos:batch
const router = Router();

// Blindamos todas las rutas de eventos de ruta
router.use(autenticarToken);

router.post('/', requerirRol('trabajador'), requerirIdempotencyKey, validarEventosBatch, sincronizarEventos);

export default router;

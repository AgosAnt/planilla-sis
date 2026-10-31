import { Router } from 'express';
import { crearDescanso } from './eventos_descanso.controller.js';
import { validarCrearDescanso } from '../../middlewares/validarDescanso.js';
import { requerirIdempotencyKey } from '../../middlewares/idempotencia.js';
import { autenticarToken, requerirRol } from '../../middlewares/auth.js';

// Montado en /api/v1/registros-tiempo/:id/descansos (mergeParams para leer :id)
const router = Router({ mergeParams: true });

// Blindamos todas las rutas de descansos
router.use(autenticarToken);

router.post('/', requerirRol('trabajador'), requerirIdempotencyKey, validarCrearDescanso, crearDescanso);

export default router;

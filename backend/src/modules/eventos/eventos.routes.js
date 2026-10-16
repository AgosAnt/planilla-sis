import { Router } from 'express';
import { obtenerEventos, obtenerEventosPorJornada, crearEvento } from './eventos.controller.js';
import { validarCrearEvento } from '../../middlewares/validarEvento.js';
import { autenticarToken } from '../../middlewares/auth.js';

const router = Router();

// Blindamos todas las rutas de eventos
router.use(autenticarToken);

router.get('/', obtenerEventos);
router.get('/jornada/:idJornada', obtenerEventosPorJornada);
router.post('/', validarCrearEvento, crearEvento);

export default router;

import { Router } from 'express';
import * as controller from './eventos.controller.js';
import { autenticarToken, requerirRol } from '../../middlewares/auth.js';
import { validarPaginacion } from '../../middlewares/validarPaginacion.js';
import { validarEventoId, validarFiltrosEventos, validarAtencion } from '../../middlewares/validarEventos.js';

// Montado en /api/v1/eventos (el envío desde el móvil sigue en POST /api/v1/eventos:batch, módulo eventos_ruta).
// Consultar: todos (el RLS filtra). Atender: supervisor del trabajador o administrador.
const router = Router();
router.use(autenticarToken);

router.get('/', validarPaginacion, validarFiltrosEventos, controller.obtenerEventos);
router.patch('/:id/atencion', requerirRol('administrador', 'supervisor'), validarEventoId, validarAtencion, controller.atenderEvento);

export default router;

import { Router } from 'express';
import * as controller from './asignaciones.controller.js';
import { autenticarToken, requerirRol } from '../../middlewares/auth.js';
import { validarPaginacion } from '../../middlewares/validarPaginacion.js';
import {
  validarIdsUuid, validarCrearAsignacion, validarActualizarAsignacion, validarProponerAcuerdo,
  validarRespuestaAcuerdo, validarFiltrosAcuerdos,
} from '../../middlewares/validarAsignacion.js';

// Gestión de asignaciones y turnos: administrador, o supervisor en las rutas a su cargo (C.2, CU-05).
// La respuesta al turno es del trabajador desde el móvil (CU-06).
const gestiona = requerirRol('administrador', 'supervisor');

// Montado en /api/v1/rutas/:rutaId/asignaciones
export const asignacionesDeRutaRouter = Router({ mergeParams: true });
asignacionesDeRutaRouter.use(autenticarToken, gestiona, validarIdsUuid('rutaId'));
asignacionesDeRutaRouter.post('/', validarCrearAsignacion, controller.crearAsignacion);
asignacionesDeRutaRouter.get('/', validarPaginacion, controller.obtenerAsignaciones);

// Montado en /api/v1/asignaciones
export const asignacionesRouter = Router();
asignacionesRouter.use(autenticarToken, gestiona);
asignacionesRouter.patch('/:id', validarIdsUuid('id'), validarActualizarAsignacion, controller.actualizarAsignacion);
asignacionesRouter.post('/:id/acuerdos', validarIdsUuid('id'), validarProponerAcuerdo, controller.proponerAcuerdo);

// Montado en /api/v1/acuerdos-turno
export const acuerdosTurnoRouter = Router();
acuerdosTurnoRouter.use(autenticarToken);
acuerdosTurnoRouter.get('/', validarPaginacion, validarFiltrosAcuerdos, controller.obtenerAcuerdos);
acuerdosTurnoRouter.patch('/:id/respuesta', requerirRol('trabajador'), validarIdsUuid('id'), validarRespuestaAcuerdo, controller.responderAcuerdo);
acuerdosTurnoRouter.post('/:id/confirmar', gestiona, validarIdsUuid('id'), controller.confirmarAcuerdo);

// Montado en /api/v1/catalogos
export const catalogosRouter = Router();
catalogosRouter.get('/turnos', autenticarToken, controller.obtenerTurnos);

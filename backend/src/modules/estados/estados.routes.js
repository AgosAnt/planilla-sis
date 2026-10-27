import { Router } from 'express';
import * as controller from './estados.controller.js';
import { autenticarToken, requerirRol } from '../../middlewares/auth.js';
import { validarPaginacion } from '../../middlewares/validarPaginacion.js';
import { validarTrabajadorEstado, validarCambioEstado } from '../../middlewares/validarEstado.js';

// Montado en /api/v1/trabajadores/:trabajadorId. Consultar: el propio trabajador, su supervisor o el admin.
// Cambiar (permiso estados.gestionar de M007): administrador o supervisor del trabajador.
export const estadosRouter = Router({ mergeParams: true });
estadosRouter.use(autenticarToken, validarTrabajadorEstado);
estadosRouter.get('/estado', controller.obtenerEstadoActual);
estadosRouter.post('/estado', requerirRol('administrador', 'supervisor'), validarCambioEstado, controller.cambiarEstado);
estadosRouter.get('/estados/historial', validarPaginacion, controller.obtenerHistorial);

// Montado en /api/v1/catalogos (junto al router de turnos del módulo de asignaciones)
export const catalogosEstadosRouter = Router();
catalogosEstadosRouter.get('/estados-trabajador', autenticarToken, controller.obtenerEstados);
catalogosEstadosRouter.get('/tipos-descanso', autenticarToken, controller.obtenerTiposDescanso);

import { Router } from 'express';
import * as controller from './parametros.controller.js';
import { autenticarToken, requerirRol } from '../../middlewares/auth.js';
import {
  validarActualizarParametros, validarFeriado, validarFechaFeriado, validarAnio, validarTrabajadorId, validarTarifa,
} from '../../middlewares/validarParametros.js';

// Configuración del cálculo (permiso parametros.configurar de M007: solo el administrador modifica).
// El supervisor puede consultar, porque calcula y verifica planillas.
const consulta = requerirRol('administrador', 'supervisor');
const soloAdmin = requerirRol('administrador');

// Montado en /api/v1/admin/parametros-pago
export const parametrosRouter = Router();
parametrosRouter.use(autenticarToken);
parametrosRouter.get('/', consulta, controller.obtenerParametros);
parametrosRouter.patch('/', soloAdmin, validarActualizarParametros, controller.actualizarParametros);

// Montado en /api/v1/admin/feriados
export const feriadosRouter = Router();
feriadosRouter.use(autenticarToken);
feriadosRouter.get('/', consulta, validarAnio, controller.obtenerFeriados);
feriadosRouter.post('/', soloAdmin, validarFeriado, controller.crearFeriado);
feriadosRouter.delete('/:fecha', soloAdmin, validarFechaFeriado, controller.borrarFeriado);

// Montado en /api/v1/trabajadores/:trabajadorId/tarifas
export const tarifasRouter = Router({ mergeParams: true });
tarifasRouter.use(autenticarToken, validarTrabajadorId);
tarifasRouter.get('/', consulta, controller.obtenerTarifas);
tarifasRouter.post('/', soloAdmin, validarTarifa, controller.crearTarifa);

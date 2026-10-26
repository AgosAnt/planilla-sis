import { Router } from 'express';
import * as controller from './planillas.controller.js';
import { autenticarToken, requerirRol } from '../../middlewares/auth.js';
import { validarPaginacion } from '../../middlewares/validarPaginacion.js';
import {
  validarIdsPlanilla, validarCrearPeriodo, validarCrearPlanilla, validarVerificar, validarListarPlanillas,
  validarRutaOpcional, validarRangoCalculo,
} from '../../middlewares/validarPlanilla.js';

// Permisos de M007: calcular (administrador y supervisor), verificar (supervisor). Aprobar y pagar: administrador.
const gestiona = requerirRol('administrador', 'supervisor');

// Montado en /api/v1/planillas
const router = Router();
router.use(autenticarToken);

router.post('/periodos', requerirRol('administrador'), validarCrearPeriodo, controller.crearPeriodo);
router.get('/periodos', gestiona, validarPaginacion, controller.obtenerPeriodos);
router.get('/periodos/:periodoId/calculo', gestiona, validarIdsPlanilla('periodoId'), validarRutaOpcional, validarPaginacion, controller.obtenerCalculoPeriodo);

router.get('/', gestiona, validarListarPlanillas, controller.obtenerPlanillas);
router.post('/', gestiona, validarCrearPlanilla, controller.crearPlanilla);
router.get('/:id', gestiona, validarIdsPlanilla('id'), validarPaginacion, controller.obtenerPlanilla);
router.post('/:id/calcular', gestiona, validarIdsPlanilla('id'), controller.recalcularPlanilla);
router.post('/:id/verificar', requerirRol('supervisor'), validarIdsPlanilla('id'), validarVerificar, controller.verificarPlanilla);

export default router;

// Montado en /api/v1/me/calculo: horas propias del trabajador (app móvil)
export const miCalculoRouter = Router();
miCalculoRouter.get('/', autenticarToken, requerirRol('trabajador'), validarRangoCalculo, controller.obtenerMiCalculo);

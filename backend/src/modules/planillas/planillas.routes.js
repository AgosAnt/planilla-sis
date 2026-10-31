import { Router } from 'express';
import * as controller from './planillas.controller.js';
import * as aprobacion from './aprobacion.controller.js';
import { autenticarToken, requerirRol, requerirReautenticacion } from '../../middlewares/auth.js';
import { requerirIdempotencyKey } from '../../middlewares/idempotencia.js';
import { validarPaginacion } from '../../middlewares/validarPaginacion.js';
import {
  validarIdsPlanilla, validarCrearPeriodo, validarCrearPlanilla, validarVerificar, validarListarPlanillas,
  validarRutaOpcional, validarRangoCalculo, validarAprobar, validarPagos,
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

// Aprobar y pagar: administrador, con la contraseña confirmada (X-Reauth-Token de POST /auth/reauth).
// La validación va antes de la reautenticación para no gastar el token en un cuerpo mal formado.
router.post('/:id/aprobar', requerirRol('administrador'), validarIdsPlanilla('id'), validarAprobar,
  requerirReautenticacion, aprobacion.aprobarPlanilla);
router.post('/:id/pagos', requerirRol('administrador'), validarIdsPlanilla('id'), requerirIdempotencyKey, validarPagos,
  requerirReautenticacion, aprobacion.registrarPagos);
router.get('/:id/pagos', requerirRol('administrador'), validarIdsPlanilla('id'), aprobacion.obtenerPagos);

export default router;

// Montado en /api/v1/me/calculo: horas propias del trabajador (app móvil)
export const miCalculoRouter = Router();
miCalculoRouter.get('/', autenticarToken, requerirRol('trabajador'), validarRangoCalculo, controller.obtenerMiCalculo);

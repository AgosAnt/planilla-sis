import { Router } from 'express';
import { obtenerRegistros, registrarIngreso, registrarSalida, validarRegistro } from './registros.controller.js';
import { autenticarToken, requerirRol } from '../../middlewares/auth.js';
import { requerirIdempotencyKey } from '../../middlewares/idempotencia.js';
import { validarPaginacion } from '../../middlewares/validarPaginacion.js';
import {
  validarRegistroId, validarIngreso, validarSalida, validarValidacion, validarFiltrosRegistros,
} from '../../middlewares/validarRegistro.js';

// Montado en /api/v1/registros-tiempo (los descansos van en su propio módulo: eventos_descanso)
const router = Router();

// Blindamos todas las rutas de registros
router.use(autenticarToken);

// Lectura: cada rol ve solo lo suyo (filtro en el servicio). Ingreso y salida: el trabajador desde el móvil (CU-07).
// Validación: supervisor o administrador (CU-10).
router.get('/', validarPaginacion, validarFiltrosRegistros, obtenerRegistros);
router.post('/ingreso', requerirRol('trabajador'), requerirIdempotencyKey, validarIngreso, registrarIngreso);
router.patch('/:id/salida', requerirRol('trabajador'), requerirIdempotencyKey, validarRegistroId, validarSalida, registrarSalida);
router.patch('/:id/validacion', requerirRol('supervisor', 'administrador'), validarRegistroId, validarValidacion, validarRegistro);

export default router;

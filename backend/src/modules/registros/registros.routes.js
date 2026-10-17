import { Router } from 'express';
import {
  obtenerRegistros,
  crearRegistro,
  marcarSalida,
  asignarRuta
} from './registros.controller.js';
import { autenticarToken, requerirRol } from '../../middlewares/auth.js';

const router = Router();

// Blindamos todas las rutas de registros
router.use(autenticarToken);

// Módulo aún sobre la tabla jornadas (ids enteros): no se puede verificar la pertenencia contra el
// sub (UUID) del token, así que las escrituras quedan solo para el administrador hasta reescribirlo.
router.get('/', requerirRol('administrador', 'supervisor'), obtenerRegistros);
router.post('/', requerirRol('administrador'), crearRegistro);
router.patch('/:id/salida', requerirRol('administrador'), marcarSalida);
router.patch('/:id/ruta', requerirRol('administrador'), asignarRuta);

export default router;

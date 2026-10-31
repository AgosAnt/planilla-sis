import { Router } from 'express';
import {
  obtenerRutas, obtenerRuta, crearRuta, actualizarRuta, obtenerPuntos, reemplazarPuntos,
} from './rutas.controller.js';
import { autenticarToken, requerirRol } from '../../middlewares/auth.js';
import { validarPaginacion } from '../../middlewares/validarPaginacion.js';
import {
  validarRutaId, validarCrearRuta, validarActualizarRuta, validarPuntos,
} from '../../middlewares/validarRuta.js';

const router = Router();

// Blindamos todas las rutas del módulo
router.use(autenticarToken);

// Lectura: cada rol ve solo lo suyo (filtro en el servicio). Escritura: administrador y supervisor (C.2).
router.get('/', validarPaginacion, obtenerRutas);
router.post('/', requerirRol('administrador', 'supervisor'), validarCrearRuta, crearRuta);
router.get('/:rutaId', validarRutaId, obtenerRuta);
router.patch('/:rutaId', requerirRol('administrador', 'supervisor'), validarRutaId, validarActualizarRuta, actualizarRuta);

// Geocerca (puntos donde se permite marcar): la consulta quien ve la ruta; la reemplaza administrador o supervisor.
router.get('/:rutaId/puntos', validarRutaId, obtenerPuntos);
router.put('/:rutaId/puntos', requerirRol('administrador', 'supervisor'), validarRutaId, validarPuntos, reemplazarPuntos);

export default router;

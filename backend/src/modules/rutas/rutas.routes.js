import { Router } from 'express';
import { obtenerRutas, obtenerRuta, crearRuta, actualizarRuta } from './rutas.controller.js';
import { autenticarToken, requerirRol } from '../../middlewares/auth.js';
import { validarPaginacion } from '../../middlewares/validarPaginacion.js';
import { validarRutaId, validarCrearRuta, validarActualizarRuta } from '../../middlewares/validarRuta.js';

const router = Router();

// Blindamos todas las rutas del módulo
router.use(autenticarToken);

// Lectura: cada rol ve solo lo suyo (filtro en el servicio). Escritura: administrador y supervisor (C.2).
router.get('/', validarPaginacion, obtenerRutas);
router.post('/', requerirRol('administrador', 'supervisor'), validarCrearRuta, crearRuta);
router.get('/:rutaId', validarRutaId, obtenerRuta);
router.patch('/:rutaId', requerirRol('administrador', 'supervisor'), validarRutaId, validarActualizarRuta, actualizarRuta);

export default router;

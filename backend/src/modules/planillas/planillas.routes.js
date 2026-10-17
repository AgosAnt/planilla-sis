import { Router } from 'express';
import { generarPlanilla, obtenerPlanillas, cambiarEstado } from './planillas.controller.js';
import { autenticarToken, requerirRol } from '../../middlewares/auth.js';

const router = Router();

// Blindamos todas las rutas de planillas
router.use(autenticarToken);

// C.2: administrador y supervisor consultan y calculan. El cambio de estado aún no aplica la
// segregación de funciones (RN-06), así que queda solo para el administrador.
router.get('/', requerirRol('administrador', 'supervisor'), obtenerPlanillas);
router.post('/generar', requerirRol('administrador', 'supervisor'), generarPlanilla);
router.patch('/:id/estado', requerirRol('administrador'), cambiarEstado);

export default router;

import { Router } from 'express';
import { generarPlanilla, obtenerPlanillas, cambiarEstado } from './planillas.controller.js';

const router = Router();

router.get('/', obtenerPlanillas);
router.post('/generar', generarPlanilla);
router.patch('/:id/estado', cambiarEstado);

export default router;
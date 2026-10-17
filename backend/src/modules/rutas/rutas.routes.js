import { Router } from 'express';
import { obtenerRutas, crearRuta } from './rutas.controller.js';

const router = Router();

router.get('/', obtenerRutas);
router.post('/', crearRuta);

export default router;
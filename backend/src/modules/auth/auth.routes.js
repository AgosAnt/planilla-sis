import { Router } from 'express';
import * as authController from './auth.controller.js';

const router = Router();

router.post('/session', authController.iniciarSesion);
router.post('/refresh', authController.renovarSesion);
router.post('/logout', authController.cerrarSesion);

export default router;
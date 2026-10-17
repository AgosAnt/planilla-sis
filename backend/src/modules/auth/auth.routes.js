import { Router } from 'express';
import * as authController from './auth.controller.js';
import { autenticarToken } from '../../middlewares/auth.js';

const router = Router();

router.post('/session', authController.iniciarSesion);
router.post('/refresh', authController.renovarSesion);
router.post('/logout', autenticarToken, authController.cerrarSesion);

// GET /api/v1/me: se monta aparte para no exponer /session, /refresh y /logout también bajo /api/v1
export const perfilRouter = Router();
perfilRouter.get('/', autenticarToken, authController.obtenerPerfil);

export default router;

import { Router } from 'express';
import { crearUsuario } from './usuarios.controller.js';
import { autenticarToken, requerirRol } from '../../middlewares/auth.js';
import { validarCrearUsuario } from '../../middlewares/validarUsuario.js';

// Montado en /api/v1/admin/usuarios. No hay registro público: solo el administrador da de alta (E-2b).
const router = Router();

router.use(autenticarToken, requerirRol('administrador'));

router.post('/', validarCrearUsuario, crearUsuario);

export default router;

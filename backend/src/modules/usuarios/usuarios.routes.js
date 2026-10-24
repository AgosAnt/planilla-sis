import { Router } from 'express';
import { crearUsuario, obtenerUsuarios, obtenerUsuario, actualizarUsuario } from './usuarios.controller.js';
import { autenticarToken, requerirRol } from '../../middlewares/auth.js';
import { validarPaginacion } from '../../middlewares/validarPaginacion.js';
import {
  validarCrearUsuario, validarUsuarioId, validarActualizarUsuario, validarFiltrosUsuarios,
} from '../../middlewares/validarUsuario.js';

// Montado en /api/v1/admin/usuarios. No hay registro público: solo el administrador da de alta (E-2b).
const router = Router();

router.use(autenticarToken, requerirRol('administrador'));

router.get('/', validarPaginacion, validarFiltrosUsuarios, obtenerUsuarios);
router.post('/', validarCrearUsuario, crearUsuario);
router.get('/:id', validarUsuarioId, obtenerUsuario);
router.patch('/:id', validarUsuarioId, validarActualizarUsuario, actualizarUsuario);

export default router;

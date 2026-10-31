import { Router } from 'express';
import { obtenerPermisos, obtenerPermisosDeRol } from './permisos.controller.js';
import { autenticarToken, requerirRol } from '../../middlewares/auth.js';
import { validarRol } from '../../middlewares/validarPermisos.js';

// Consulta de la matriz RBAC de M007: solo administrador (permiso usuarios.gestionar). Cada router se monta en su
// propio path para no exigir administrador al resto de /api/v1/admin (el supervisor consulta parametros-pago).

// Montado en /api/v1/admin/permisos
export const permisosRouter = Router();
permisosRouter.get('/', autenticarToken, requerirRol('administrador'), obtenerPermisos);

// Montado en /api/v1/admin/roles
export const rolesRouter = Router();
rolesRouter.get('/:rol/permisos', autenticarToken, requerirRol('administrador'), validarRol, obtenerPermisosDeRol);

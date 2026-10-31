import { conClaims } from '../../config/db.js';
import * as permisosRepo from './permisos.repository.js';

// Matriz de permisos por rol de M007 (RBAC), solo de consulta. No se edita por la API: quién puede hacer qué lo
// aplican requerirRol en cada ruta y el RLS de M010, así que cambiar la tabla no cambiaría lo que el sistema permite.

// GET /admin/permisos
export const listarPermisos = (admin) => conClaims(admin, (client) => permisosRepo.listarPermisos(client));

// GET /admin/roles/{rol}/permisos
export const permisosDeRol = (admin, rol) => conClaims(admin, (client) => permisosRepo.permisosDeRol(client, rol));

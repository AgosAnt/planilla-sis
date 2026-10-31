import { responderValidacion } from './validadores.js';

const ROLES = ['trabajador', 'supervisor', 'administrador']; // schema Rol del contrato

// GET /admin/roles/{rol}/permisos
export const validarRol = (req, res, next) => {
  if (!ROLES.includes(req.params.rol)) {
    return responderValidacion(res, `El rol debe ser uno de: ${ROLES.join(', ')}.`);
  }
  next();
};

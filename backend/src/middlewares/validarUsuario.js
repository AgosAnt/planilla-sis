import { responderValidacion } from './validadores.js';

const ROLES = ['trabajador', 'supervisor', 'administrador'];
// Formato básico de correo; la verificación real es que el usuario pueda iniciar sesión con él.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const texto = (valor, max) => (typeof valor === 'string' && valor.trim().length > 0 && valor.trim().length <= max ? valor.trim() : null);

// CrearUsuarioRequest (E-2b). codigo_empleado y documento son obligatorios: perfiles los exige NOT NULL UNIQUE (M002).
export const validarCrearUsuario = (req, res, next) => {
  const body = req.body ?? {};

  const email = texto(body.email, 255)?.toLowerCase();
  if (!email || !EMAIL_REGEX.test(email)) {
    return responderValidacion(res, 'El campo "email" es requerido y debe ser un correo válido (máximo 255 caracteres).');
  }
  const nombres = texto(body.nombres, 100);
  const apellidos = texto(body.apellidos, 100);
  if (!nombres || !apellidos) {
    return responderValidacion(res, 'Los campos "nombres" y "apellidos" son requeridos (1 a 100 caracteres).');
  }
  if (!ROLES.includes(body.rol)) {
    return responderValidacion(res, `El campo "rol" es requerido y debe ser uno de: ${ROLES.join(', ')}.`);
  }
  const codigoEmpleado = texto(body.codigo_empleado, 50);
  const documento = texto(body.documento, 50);
  if (!codigoEmpleado || !documento) {
    return responderValidacion(res, 'Los campos "codigo_empleado" y "documento" son requeridos (1 a 50 caracteres).');
  }

  req.body = { email, nombres, apellidos, rol: body.rol, codigo_empleado: codigoEmpleado, documento };
  next();
};

import { esUuid, responderValidacion } from './validadores.js';

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

export const validarUsuarioId = (req, res, next) => {
  if (!esUuid(req.params.id)) {
    return responderValidacion(res, 'El "id" del usuario debe ser un UUID.');
  }
  next();
};

// ActualizarUsuarioRequest: solo los campos enviados, al menos uno. El correo no se cambia (es el usuario del login).
export const validarActualizarUsuario = (req, res, next) => {
  const body = req.body ?? {};
  const datos = {};

  for (const [campo, max] of [['nombres', 100], ['apellidos', 100], ['codigo_empleado', 50], ['documento', 50]]) {
    if (body[campo] !== undefined) {
      const valor = texto(body[campo], max);
      if (!valor) {
        return responderValidacion(res, `El campo "${campo}" debe ser texto de 1 a ${max} caracteres.`);
      }
      datos[campo] = valor;
    }
  }
  if (body.rol !== undefined) {
    if (!ROLES.includes(body.rol)) {
      return responderValidacion(res, `El campo "rol" debe ser uno de: ${ROLES.join(', ')}.`);
    }
    datos.rol = body.rol;
  }
  if (body.activo !== undefined) {
    if (typeof body.activo !== 'boolean') {
      return responderValidacion(res, 'El campo "activo" debe ser booleano.');
    }
    datos.activo = body.activo;
  }
  if (Object.keys(datos).length === 0) {
    return responderValidacion(res, 'Envía al menos un campo a modificar: nombres, apellidos, rol, activo, codigo_empleado o documento.');
  }
  req.body = datos;
  next();
};

// Filtros opcionales del listado: rol, activo (true o false) y buscar (nombre, correo o código de empleado).
export const validarFiltrosUsuarios = (req, res, next) => {
  const { rol, activo, buscar } = req.query;
  if (rol !== undefined && !ROLES.includes(rol)) {
    return responderValidacion(res, `El filtro "rol" debe ser uno de: ${ROLES.join(', ')}.`);
  }
  if (activo !== undefined && activo !== 'true' && activo !== 'false') {
    return responderValidacion(res, 'El filtro "activo" debe ser true o false.');
  }
  if (buscar !== undefined && !texto(buscar, 100)) {
    return responderValidacion(res, 'El filtro "buscar" debe tener de 1 a 100 caracteres.');
  }
  req.filtros = {
    rol: rol ?? null,
    activo: activo === undefined ? null : activo === 'true',
    buscar: buscar === undefined ? null : texto(buscar, 100),
  };
  next();
};

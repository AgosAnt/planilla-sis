import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt.js';
import { COOKIE_ACCESS, DURACION_ACCESS_SEG } from '../config/sesion.js';
import { esCsrfValido } from './csrf.js';

const METODOS_SEGUROS = ['GET', 'HEAD', 'OPTIONS'];

// Con contraseña temporal (E-2b) solo se puede ver el perfil, cambiar la contraseña o salir
const RUTAS_CON_PASSWORD_TEMPORAL = ['/api/v1/me', '/api/v1/auth/csrf', '/api/v1/auth/logout', '/api/v1/auth/password'];

const responderNoAutenticado = (res, detalle, code) =>
  res.status(401).type('application/problem+json').json({
    type: 'about:blank',
    title: 'No autenticado',
    status: 401,
    detail: detalle,
    code,
  });

const responderProhibido = (res, detalle, code) =>
  res.status(403).type('application/problem+json').json({
    type: 'about:blank',
    title: 'Acceso denegado',
    status: 403,
    detail: detalle,
    code,
  });

// Móvil: Authorization: Bearer <token>. Web: cookie HttpOnly psis_access (ADR-001).
// Si llegan ambos, gana Bearer: el navegador nunca lo adjunta solo, así que no necesita CSRF.
const extraerToken = (req) => {
  const authHeader = req.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return { token: authHeader.slice('Bearer '.length), viaCookie: false };
  }
  const cookie = req.cookies?.[COOKIE_ACCESS];
  if (cookie) {
    return { token: cookie, viaCookie: true };
  }
  return {};
};

// Ruta completa sin la barra final: /api/v1/me/ y /api/v1/me cuentan igual
const rutaDe = (req) => (req.baseUrl + req.path).replace(/\/+$/, '');

// Sesiones cerradas (logout o cambio de contraseña): id de sesión -> hasta cuándo recordarla (segundos).
// El access token no consulta la base en cada petición; esto lo invalida al instante en vez de esperar su exp.
// Como reauthUsados, vive en memoria: si el backend se reinicia, un token de una sesión cerrada sirve hasta su exp.
const sesionesCerradas = new Map();

export const recordarSesionCerrada = (sesionId) => {
  if (sesionId) sesionesCerradas.set(sesionId, Math.floor(Date.now() / 1000) + DURACION_ACCESS_SEG);
};

const sesionCerrada = (sesionId) => {
  const ahora = Math.floor(Date.now() / 1000);
  for (const [id, hasta] of sesionesCerradas) {
    if (hasta <= ahora) sesionesCerradas.delete(id);
  }
  return sesionesCerradas.has(sesionId);
};

export const autenticarToken = (req, res, next) => {
  // 1. Obtener el token del encabezado o de la cookie de sesión
  const { token, viaCookie } = extraerToken(req);

  if (!token) {
    return responderNoAutenticado(res, 'No se proporcionó un token de autenticación.', 'NO_AUTENTICADO');
  }

  let decodificado;
  try {
    // 2. Verificar firma, exp, iss y aud (ADR-001)
    decodificado = jwt.verify(token, jwtConfig.secret, {
      algorithms: [jwtConfig.algorithm],
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    });
  } catch (error) {
    return responderNoAutenticado(res, 'El token es inválido o ha expirado.', 'TOKEN_INVALIDO');
  }
  if (sesionCerrada(decodificado.jti)) {
    return responderNoAutenticado(res, 'La sesión se cerró; vuelve a iniciar sesión.', 'SESION_CERRADA');
  }

  // 3. La cookie viaja sola en cada petición: las escrituras exigen el token CSRF (F.2)
  if (viaCookie && !METODOS_SEGUROS.includes(req.method) && !esCsrfValido(decodificado.jti, req.get('X-CSRF-Token'))) {
    return responderProhibido(res, 'Falta la cabecera X-CSRF-Token o no corresponde a la sesión.', 'CSRF_INVALIDO');
  }

  // 4. Contraseña temporal: hasta cambiarla no se puede usar el resto del sistema
  if (decodificado.dcp && !RUTAS_CON_PASSWORD_TEMPORAL.includes(rutaDe(req))) {
    return responderProhibido(res, 'Debes cambiar tu contraseña temporal antes de continuar.', 'DEBE_CAMBIAR_PASSWORD');
  }

  // 5. Inyectar la identidad en la request (sub = perfiles.id; jti = id de la sesión, base del CSRF)
  req.usuario = { id: decodificado.sub, email: decodificado.email, rol: decodificado.rol, sesionId: decodificado.jti };

  // 6. Continuar con el siguiente middleware o controlador
  next();
};

// Usar después de autenticarToken. Responde 403 si el rol del token no está permitido.
export const requerirRol = (...roles) => (req, res, next) => {
  if (!roles.includes(req.usuario?.rol)) {
    return responderProhibido(res, 'Tu rol no tiene permiso para esta operación.', 'ROL_NO_PERMITIDO');
  }
  next();
};

// Tokens de reautenticación ya usados: jti -> exp (segundos). El backend corre en un solo proceso en la LAN,
// así que basta la memoria; si se reinicia, un token vigente podría usarse otra vez hasta su exp (5 min).
const reauthUsados = new Map();

// Usar después de autenticarToken en operaciones críticas (aprobar planilla, registrar pagos).
// Exige el header X-Reauth-Token de POST /auth/reauth: de este usuario, de esta sesión y sin usar.
// Nunca se registra ni se audita el token.
export const requerirReautenticacion = (req, res, next) => {
  const ahora = Math.floor(Date.now() / 1000);
  for (const [jti, exp] of reauthUsados) {
    if (exp <= ahora) reauthUsados.delete(jti);
  }

  let datos = null;
  try {
    const token = req.get('X-Reauth-Token');
    if (token) {
      datos = jwt.verify(token, jwtConfig.secret, {
        algorithms: [jwtConfig.algorithm],
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audienceReauth,
      });
    }
  } catch (error) {
    datos = null;
  }

  const valido = datos
    && datos.tipo === 'reauth'
    && datos.sub === req.usuario?.id
    && datos.sid === req.usuario?.sesionId
    && datos.jti
    && !reauthUsados.has(datos.jti);
  if (!valido) {
    return responderProhibido(res, 'Confirma tu contraseña para realizar esta operación.', 'REAUTENTICACION_REQUERIDA');
  }

  reauthUsados.set(datos.jti, datos.exp);
  next();
};

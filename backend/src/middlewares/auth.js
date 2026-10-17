import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt.js';
import { COOKIE_ACCESS } from '../config/sesion.js';
import { esCsrfValido } from './csrf.js';

const METODOS_SEGUROS = ['GET', 'HEAD', 'OPTIONS'];

const responderNoAutenticado = (res, detalle, code) =>
  res.status(401).type('application/problem+json').json({
    type: 'about:blank',
    title: 'No autenticado',
    status: 401,
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

  // 3. La cookie viaja sola en cada petición: las escrituras exigen el token CSRF (F.2)
  if (viaCookie && !METODOS_SEGUROS.includes(req.method) && !esCsrfValido(decodificado.jti, req.get('X-CSRF-Token'))) {
    return res.status(403).type('application/problem+json').json({
      type: 'about:blank',
      title: 'Acceso denegado',
      status: 403,
      detail: 'Falta la cabecera X-CSRF-Token o no corresponde a la sesión.',
      code: 'CSRF_INVALIDO',
    });
  }

  // 4. Inyectar la identidad en la request (sub = perfiles.id)
  req.usuario = { id: decodificado.sub, email: decodificado.email, rol: decodificado.rol };

  // 5. Continuar con el siguiente middleware o controlador
  next();
};

// Usar después de autenticarToken. Responde 403 si el rol del token no está permitido.
export const requerirRol = (...roles) => (req, res, next) => {
  if (!roles.includes(req.usuario?.rol)) {
    return res.status(403).type('application/problem+json').json({
      type: 'about:blank',
      title: 'Acceso denegado',
      status: 403,
      detail: 'Tu rol no tiene permiso para esta operación.',
      code: 'ROL_NO_PERMITIDO',
    });
  }
  next();
};

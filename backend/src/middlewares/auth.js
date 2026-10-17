import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt.js';

export const autenticarToken = (req, res, next) => {
  // 1. Obtener el encabezado de autorización
  const authHeader = req.headers['authorization'];

  // 2. Extraer el token (formato: "Bearer <token>")
  const token = authHeader && authHeader.startsWith('Bearer ') && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).type('application/problem+json').json({
      type: 'about:blank',
      title: 'No autenticado',
      status: 401,
      detail: 'No se proporcionó un token de autenticación.',
      code: 'NO_AUTENTICADO',
    });
  }

  try {
    // 3. Verificar firma, exp, iss y aud (ADR-001)
    const decodificado = jwt.verify(token, jwtConfig.secret, {
      algorithms: [jwtConfig.algorithm],
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    });

    // 4. Inyectar la identidad en la request (sub = perfiles.id)
    req.usuario = { id: decodificado.sub, email: decodificado.email, rol: decodificado.rol };

    // 5. Continuar con el siguiente middleware o controlador
    next();
  } catch (error) {
    return res.status(401).type('application/problem+json').json({
      type: 'about:blank',
      title: 'No autenticado',
      status: 401,
      detail: 'El token es inválido o ha expirado.',
      code: 'TOKEN_INVALIDO',
    });
  }
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

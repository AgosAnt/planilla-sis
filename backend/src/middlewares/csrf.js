import { createHmac, timingSafeEqual } from 'node:crypto';
import { jwtConfig } from '../config/jwt.js';

// Token CSRF sin estado (F.2): HMAC del jti de la sesión con el secreto del backend.
// La web lo recibe en el cuerpo del login y lo envía en X-CSRF-Token en cada escritura.
export const generarTokenCsrf = (jti) =>
  createHmac('sha256', jwtConfig.secret).update(`csrf:${jti}`).digest('base64url');

export const esCsrfValido = (jti, recibido) => {
  if (!jti || typeof recibido !== 'string') return false;
  const esperado = Buffer.from(generarTokenCsrf(jti));
  const dado = Buffer.from(recibido);
  return esperado.length === dado.length && timingSafeEqual(esperado, dado);
};

import { PASSWORDS_COMUNES } from '../../config/passwordsComunes.js';

export const LONGITUD_MINIMA = 12;
const BYTES_MAXIMOS = 72; // bcrypt ignora lo que pase de 72 bytes

// Política de contraseñas de ADR-001. Devuelve el motivo del rechazo, o null si la contraseña sirve.
export const motivoPasswordDebil = (nueva, { actual, email }) => {
  if (nueva.length < LONGITUD_MINIMA) {
    return `La contraseña debe tener al menos ${LONGITUD_MINIMA} caracteres.`;
  }
  if (Buffer.byteLength(nueva) > BYTES_MAXIMOS) {
    return 'La contraseña es demasiado larga.';
  }
  if (nueva === actual) {
    return 'La contraseña nueva debe ser distinta de la actual.';
  }
  const minusculas = nueva.toLowerCase();
  const usuarioCorreo = email.toLowerCase().split('@')[0];
  if (minusculas === email.toLowerCase() || (usuarioCorreo.length >= 4 && minusculas.includes(usuarioCorreo))) {
    return 'La contraseña no puede contener tu correo.';
  }
  if (/^(.)\1+$/.test(nueva) || PASSWORDS_COMUNES.has(minusculas)) {
    return 'La contraseña es demasiado común; elige otra.';
  }
  return null;
};

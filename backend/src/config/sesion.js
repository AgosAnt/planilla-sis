// Cookie de sesión web (ADR-001 y E-1). Sin atributo Secure: el despliegue es HTTP dentro de la LAN (D-4).
export const COOKIE_ACCESS = 'psis_access';

// ADR-001 pide un access token de ~15 min con refresh. Mientras /auth/refresh no exista se mantiene en 2 h.
export const DURACION_ACCESS_SEG = 2 * 60 * 60;

// Reautenticación para operaciones críticas (aprobar planilla y registrar pagos): token corto de un solo uso.
export const DURACION_REAUTH_SEG = 5 * 60;

// Bloqueo progresivo del login (ADR-001): desde el 5.º intento fallido, 1, 2, 4, 8 y luego 15 minutos.
export const INTENTOS_ANTES_DE_BLOQUEO = 5;
export const BLOQUEO_MAXIMO_MIN = 15;

export const opcionesCookieAccess = {
  httpOnly: true,
  sameSite: 'lax',
  secure: false,
  path: '/',
};

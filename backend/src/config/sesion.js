// Cookie de sesión web (ADR-001 y E-1). Sin atributo Secure: el despliegue es HTTP dentro de la LAN (D-4).
export const COOKIE_ACCESS = 'psis_access';

// ADR-001 pide un access token de ~15 min con refresh. Mientras /auth/refresh no exista se mantiene en 2 h.
export const DURACION_ACCESS_SEG = 2 * 60 * 60;

export const opcionesCookieAccess = {
  httpOnly: true,
  sameSite: 'lax',
  secure: false,
  path: '/',
};

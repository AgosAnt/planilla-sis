// Cookies de sesión web (ADR-001 y E-1). Sin atributo Secure: el despliegue es HTTP dentro de la LAN (D-4).
export const COOKIE_ACCESS = 'psis_access';
export const COOKIE_REFRESH = 'psis_refresh';

// ADR-001 pide un access token de ~15 min con refresh. Se mantiene en 2 h hasta que la web y el móvil
// renueven solos con POST /auth/refresh; después baja a 15 min.
export const DURACION_ACCESS_SEG = 2 * 60 * 60;

// Refresh token (ADR-001: 7 a 14 días). Cada renovación lo rota y vuelve a contar los 7 días.
export const DURACION_REFRESH_SEG = 7 * 24 * 60 * 60;

// Dos pestañas pueden renovar a la vez con el mismo refresh: la segunda llega cuando la primera ya lo rotó.
// Dentro de este margen se responde 409 (la cookie nueva ya está en el navegador) en lugar de tomarlo como robo.
export const GRACIA_ROTACION_SEG = 30;

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

// El refresh solo viaja a /auth (refresh y logout) y nunca desde otro sitio (ADR-001)
export const opcionesCookieRefresh = {
  httpOnly: true,
  sameSite: 'strict',
  secure: false,
  path: '/api/v1/auth',
};

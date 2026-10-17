// Cabeceras de seguridad para respuestas de la API (F.2). La API solo devuelve JSON, así que la CSP
// no permite cargar nada. No se envía Strict-Transport-Security: solo aplica sobre HTTPS (D-4).
export const cabecerasSeguridad = (req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
    // B.4: las respuestas con datos personales no se guardan en caché
    'Cache-Control': 'no-store',
  });
  next();
};

// La web (HTML, CSS y JS propios) necesita cargar sus archivos: CSP de F.2 para la SPA, sin 'unsafe-inline'
// ni 'unsafe-eval'. Reemplaza la CSP estricta de la API solo en las respuestas de la web.
const CSP_WEB = [
  "default-src 'self'", "script-src 'self'", "style-src 'self'", "img-src 'self' data:", "connect-src 'self'",
  "object-src 'none'", "base-uri 'none'", "form-action 'self'", "frame-ancestors 'none'",
].join('; ');

export const cabecerasWeb = (req, res, next) => {
  res.set('Content-Security-Policy', CSP_WEB);
  next();
};

// CORS_ORIGINS: orígenes de la web separados por coma. Vacío = solo mismo origen (sin cabeceras CORS).
export const origenesPermitidos = () =>
  (process.env.CORS_ORIGINS ?? '').split(',').map((origen) => origen.trim()).filter(Boolean);

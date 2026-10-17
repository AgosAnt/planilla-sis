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

// CORS_ORIGINS: orígenes de la web separados por coma. Vacío = solo mismo origen (sin cabeceras CORS).
export const origenesPermitidos = () =>
  (process.env.CORS_ORIGINS ?? '').split(',').map((origen) => origen.trim()).filter(Boolean);

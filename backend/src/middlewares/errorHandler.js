// Crea un error que errorHandler convierte en application/problem+json.
export const crearError = (status, code, mensaje) => {
  const error = new Error(mensaje);
  error.status = status;
  error.code = code;
  error.publico = true; // mensaje pensado para el cliente, aunque el status sea 5xx (ej. 501)
  return error;
};

export const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const interno = status >= 500 && !err.publico;

  // Los errores internos (BD, bugs) se registran en el servidor y no se exponen al cliente.
  if (interno) {
    console.error(`[Error ${req.method} ${req.originalUrl}]:`, err);
  }

  // Cabeceras propias del error, por ejemplo Retry-After en un bloqueo por intentos fallidos
  if (!interno && err.headers) {
    res.set(err.headers);
  }

  // Especificación OpenAPI: Errores en formato application/problem+json
  return res.status(status).type('application/problem+json').json({
    type: 'about:blank',
    title: interno ? 'Error interno del servidor' : err.title || 'Solicitud rechazada',
    status: status,
    detail: interno ? 'Ocurrió un error inesperado en el servidor.' : err.message,
    code: interno ? 'ERROR_INTERNO' : typeof err.code === 'string' ? err.code : undefined,
    instance: req.originalUrl,
  });
};

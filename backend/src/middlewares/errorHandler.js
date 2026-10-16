export const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  
  // Especificación OpenAPI: Errores en formato application/problem+json
  return res.status(status).type('application/problem+json').json({
    type: err.type || 'https://api.planilla-sis.com/errors/internal-error',
    title: err.title || 'Error interno del servidor',
    status: status,
    detail: err.message || 'Ocurrió un error inesperado en el servidor.',
    instance: req.originalUrl
  });
};
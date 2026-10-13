function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const response = {
    type: 'about:blank',
    title: err.title || 'Error interno del servidor',
    status: status,
    detail: err.message || 'Ha ocurrido un error inesperado en la API',
    code: err.code || 'INTERNAL_ERROR',
    request_id: req.headers['x-request-id'] || 'req-' + Date.now(),
  };

  if (err.errors) {
    response.errors = err.errors;
  }

  res.setHeader('Content-Type', 'application/problem+json');
  return res.status(status).json(response);
}

module.exports = errorHandler;
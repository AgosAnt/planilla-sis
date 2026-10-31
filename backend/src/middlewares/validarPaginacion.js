import { responderValidacion } from './validadores.js';

const ENTERO_POSITIVO = /^[1-9]\d{0,5}$/;

// Parámetros Page y PageSize del contrato: page >= 1 (por defecto 1), page_size 1..100 (por defecto 50).
// Deja los valores ya convertidos en req.paginacion.
export const validarPaginacion = (req, res, next) => {
  const { page = '1', page_size = '50' } = req.query;

  if (typeof page !== 'string' || !ENTERO_POSITIVO.test(page)) {
    return responderValidacion(res, 'El parámetro "page" debe ser un entero mayor o igual a 1.');
  }
  if (typeof page_size !== 'string' || !ENTERO_POSITIVO.test(page_size) || Number(page_size) > 100) {
    return responderValidacion(res, 'El parámetro "page_size" debe ser un entero entre 1 y 100.');
  }

  req.paginacion = { page: Number(page), pageSize: Number(page_size) };
  next();
};

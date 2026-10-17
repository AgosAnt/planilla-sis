import { responderValidacion } from './validadores.js';

export const MAX_EVENTOS_POR_LOTE = 100;

// EventosBatchRequest: 1 a 100 eventos. Cada evento se valida en el servicio para
// devolver RECHAZADO por elemento en lugar de rechazar el lote completo.
export const validarEventosBatch = (req, res, next) => {
  const { eventos } = req.body ?? {};

  if (!Array.isArray(eventos) || eventos.length === 0) {
    return responderValidacion(res, 'El campo "eventos" es requerido y debe ser un arreglo con al menos un evento.');
  }

  if (eventos.length > MAX_EVENTOS_POR_LOTE) {
    return res.status(413).type('application/problem+json').json({
      type: 'about:blank',
      title: 'Lote demasiado grande',
      status: 413,
      detail: `Máximo ${MAX_EVENTOS_POR_LOTE} eventos por lote.`,
      code: 'LOTE_DEMASIADO_GRANDE',
    });
  }

  next();
};

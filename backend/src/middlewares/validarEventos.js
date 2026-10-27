import { esUuid, esFecha, responderValidacion } from './validadores.js';

const TIPOS = ['EMERGENCIA', 'VISITA_FALLIDA', 'PROBLEMA_VEHICULO', 'CAMBIO_ESTADO', 'NOTA', 'OTRO'];
const ESTADOS = ['PENDIENTE_REVISION', 'EN_ATENCION', 'ATENDIDO', 'DESCARTADO'];

export const validarEventoId = (req, res, next) => {
  if (!esUuid(req.params.id)) return responderValidacion(res, 'El "id" del evento debe ser un UUID.');
  next();
};

// Filtros opcionales de GET /eventos: estado_atencion, tipo_evento, trabajador_id, desde y hasta (YYYY-MM-DD)
export const validarFiltrosEventos = (req, res, next) => {
  const { estado_atencion, tipo_evento, trabajador_id, desde, hasta } = req.query;
  if (estado_atencion !== undefined && !ESTADOS.includes(estado_atencion)) {
    return responderValidacion(res, `El filtro "estado_atencion" debe ser uno de: ${ESTADOS.join(', ')}.`);
  }
  if (tipo_evento !== undefined && !TIPOS.includes(tipo_evento)) {
    return responderValidacion(res, `El filtro "tipo_evento" debe ser uno de: ${TIPOS.join(', ')}.`);
  }
  if (trabajador_id !== undefined && !esUuid(trabajador_id)) {
    return responderValidacion(res, 'El filtro "trabajador_id" debe ser un UUID.');
  }
  if ((desde !== undefined && !esFecha(desde)) || (hasta !== undefined && !esFecha(hasta))) {
    return responderValidacion(res, 'Los filtros "desde" y "hasta" deben ser fechas YYYY-MM-DD.');
  }
  if (desde !== undefined && hasta !== undefined && desde > hasta) {
    return responderValidacion(res, 'El filtro "desde" no puede ser posterior a "hasta".');
  }
  req.filtros = {
    estadoAtencion: estado_atencion ?? null, tipoEvento: tipo_evento ?? null, trabajadorId: trabajador_id ?? null,
    desde: desde ?? null, hasta: hasta ?? null,
  };
  next();
};

// AtencionEventoRequest: { estado_atencion: EN_ATENCION | ATENDIDO | DESCARTADO }
export const validarAtencion = (req, res, next) => {
  const { estado_atencion } = req.body ?? {};
  if (!['EN_ATENCION', 'ATENDIDO', 'DESCARTADO'].includes(estado_atencion)) {
    return responderValidacion(res, 'El campo "estado_atencion" debe ser EN_ATENCION, ATENDIDO o DESCARTADO.');
  }
  req.body = { estado_atencion };
  next();
};

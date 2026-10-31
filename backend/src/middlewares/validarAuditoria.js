import { esUuid, esFecha, responderValidacion } from './validadores.js';

// Acciones permitidas por el CHECK de auditoria.accion (M002)
const ACCIONES = ['INSERT', 'UPDATE', 'DELETE', 'VERIFICAR', 'APROBAR', 'RECHAZAR', 'PAGAR', 'LOGIN', 'EXPORT'];

const textoCorto = (valor) => typeof valor === 'string' && valor.length > 0 && valor.length <= 100;

// Filtros opcionales de GET /auditoria: entidad, entidad_id, actor_id, accion, desde y hasta (YYYY-MM-DD).
export const validarFiltrosAuditoria = (req, res, next) => {
  const { entidad, entidad_id, actor_id, accion, desde, hasta } = req.query;

  if (entidad !== undefined && !textoCorto(entidad)) {
    return responderValidacion(res, 'El filtro "entidad" debe tener de 1 a 100 caracteres.');
  }
  if (entidad_id !== undefined && !textoCorto(entidad_id)) {
    return responderValidacion(res, 'El filtro "entidad_id" debe tener de 1 a 100 caracteres.');
  }
  if (actor_id !== undefined && !esUuid(actor_id)) {
    return responderValidacion(res, 'El filtro "actor_id" debe ser un UUID.');
  }
  if (accion !== undefined && !ACCIONES.includes(accion)) {
    return responderValidacion(res, `El filtro "accion" debe ser uno de: ${ACCIONES.join(', ')}.`);
  }
  if ((desde !== undefined && !esFecha(desde)) || (hasta !== undefined && !esFecha(hasta))) {
    return responderValidacion(res, 'Los filtros "desde" y "hasta" deben ser fechas YYYY-MM-DD.');
  }
  if (desde !== undefined && hasta !== undefined && desde > hasta) {
    return responderValidacion(res, 'El filtro "desde" no puede ser posterior a "hasta".');
  }

  req.filtros = {
    entidad: entidad ?? null,
    entidadId: entidad_id ?? null,
    actorId: actor_id ?? null,
    accion: accion ?? null,
    desde: desde ?? null,
    hasta: hasta ?? null,
  };
  next();
};

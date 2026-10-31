import { esUuid, esFechaIso, esEnteroEnRango, responderValidacion } from './validadores.js';

// DescansoRequest (docs/openapi.yaml): client_uuid, tipo_id, inicio_at y fin_at obligatorios.
export const validarCrearDescanso = (req, res, next) => {
  const { client_uuid, tipo_id, inicio_at, fin_at } = req.body ?? {};

  if (!esUuid(req.params.id)) {
    return responderValidacion(res, 'El "id" del registro de tiempo debe ser un UUID.');
  }
  if (!esUuid(client_uuid)) {
    return responderValidacion(res, 'El campo "client_uuid" es requerido y debe ser un UUID.');
  }
  if (!esEnteroEnRango(tipo_id, 1, 32767)) {
    return responderValidacion(res, 'El campo "tipo_id" es requerido y debe ser un entero positivo.');
  }
  if (!esFechaIso(inicio_at) || !esFechaIso(fin_at)) {
    return responderValidacion(res, 'Los campos "inicio_at" y "fin_at" son requeridos en ISO 8601 con zona (ej. 2026-10-17T13:00:00Z).');
  }

  next();
};

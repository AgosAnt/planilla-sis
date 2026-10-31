import { esUuid, esFechaIso, esFecha, esUbicacion, responderValidacion } from './validadores.js';

const ESTADOS = ['PENDIENTE', 'APROBADA', 'CORREGIDA', 'RECHAZADA'];

const textoCorto = (valor, max) => (typeof valor === 'string' && valor.length <= max ? valor : undefined);

// Dispositivo del contrato: solo id y app_version, recortados a una longitud razonable
const limpiarDispositivo = (dispositivo) => {
  if (typeof dispositivo !== 'object' || dispositivo === null) return null;
  const limpio = { id: textoCorto(dispositivo.id, 100), app_version: textoCorto(dispositivo.app_version, 50) };
  return limpio.id || limpio.app_version ? limpio : null;
};

export const validarRegistroId = (req, res, next) => {
  if (!esUuid(req.params.id)) {
    return responderValidacion(res, 'El "id" del registro de tiempo debe ser un UUID.');
  }
  next();
};

// IngresoRequest: client_uuid, asignacion_id e ingreso_at obligatorios; ubicacion y dispositivo opcionales
export const validarIngreso = (req, res, next) => {
  const { client_uuid, asignacion_id, ingreso_at, ubicacion, dispositivo } = req.body ?? {};
  if (!esUuid(client_uuid) || !esUuid(asignacion_id)) {
    return responderValidacion(res, 'Los campos "client_uuid" y "asignacion_id" son requeridos y deben ser UUID.');
  }
  if (!esFechaIso(ingreso_at)) {
    return responderValidacion(res, 'El campo "ingreso_at" es requerido en ISO 8601 con zona (ej. 2026-10-18T13:00:00Z).');
  }
  if (ubicacion !== undefined && !esUbicacion(ubicacion)) {
    return responderValidacion(res, 'El campo "ubicacion" debe tener lat (-90..90), lng (-180..180) y precision_m opcional >= 0.');
  }
  req.body = { client_uuid, asignacion_id, ingreso_at, ubicacion: ubicacion ?? null, dispositivo: limpiarDispositivo(dispositivo) };
  next();
};

// SalidaRequest: salida_at obligatorio; ubicacion opcional
export const validarSalida = (req, res, next) => {
  const { salida_at, ubicacion } = req.body ?? {};
  if (!esFechaIso(salida_at)) {
    return responderValidacion(res, 'El campo "salida_at" es requerido en ISO 8601 con zona (ej. 2026-10-18T21:00:00Z).');
  }
  if (ubicacion !== undefined && !esUbicacion(ubicacion)) {
    return responderValidacion(res, 'El campo "ubicacion" debe tener lat (-90..90), lng (-180..180) y precision_m opcional >= 0.');
  }
  req.body = { salida_at, ubicacion: ubicacion ?? null };
  next();
};

// ValidacionRequest: APROBADA o RECHAZADA; observaciones hasta 1000 caracteres
export const validarValidacion = (req, res, next) => {
  const { estado_validacion, observaciones } = req.body ?? {};
  if (!['APROBADA', 'RECHAZADA'].includes(estado_validacion)) {
    return responderValidacion(res, 'El campo "estado_validacion" debe ser APROBADA o RECHAZADA.');
  }
  if (observaciones !== undefined && observaciones !== null && (typeof observaciones !== 'string' || observaciones.length > 1000)) {
    return responderValidacion(res, 'El campo "observaciones" debe ser texto de hasta 1000 caracteres.');
  }
  req.body = { estado_validacion, observaciones: observaciones?.trim() || null };
  next();
};

// Filtros de GET /registros-tiempo; deja los valores en req.filtros
export const validarFiltrosRegistros = (req, res, next) => {
  const { trabajador_id, desde, hasta, estado_validacion } = req.query;
  if (trabajador_id !== undefined && !esUuid(trabajador_id)) {
    return responderValidacion(res, 'El filtro "trabajador_id" debe ser un UUID.');
  }
  if ((desde !== undefined && !esFecha(desde)) || (hasta !== undefined && !esFecha(hasta))) {
    return responderValidacion(res, 'Los filtros "desde" y "hasta" deben ser fechas YYYY-MM-DD.');
  }
  if (desde && hasta && desde > hasta) {
    return responderValidacion(res, 'El filtro "desde" no puede ser posterior a "hasta".');
  }
  if (estado_validacion !== undefined && !ESTADOS.includes(estado_validacion)) {
    return responderValidacion(res, `El filtro "estado_validacion" debe ser uno de: ${ESTADOS.join(', ')}.`);
  }
  req.filtros = {
    trabajadorId: trabajador_id ?? null,
    desde: desde ?? null,
    hasta: hasta ?? null,
    estado: estado_validacion ?? null,
  };
  next();
};

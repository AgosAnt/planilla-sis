import { esUuid, esFecha, esEnteroEnRango, responderValidacion } from './validadores.js';

const ESTADOS_RESPUESTA = ['ACEPTADO', 'RECHAZADO'];
const ESTADOS_ACUERDO = ['PROPUESTO', 'ACEPTADO', 'RECHAZADO', 'CONFIRMADO'];

const esTurnoId = (valor) => esEnteroEnRango(valor, 1, 32767);

// Valida que los parámetros de ruta indicados sean UUID (rutaId, id).
export const validarIdsUuid = (...nombres) => (req, res, next) => {
  const invalido = nombres.find((nombre) => !esUuid(req.params[nombre]));
  if (invalido) {
    return responderValidacion(res, `El parámetro "${invalido}" debe ser un UUID.`);
  }
  next();
};

// AsignacionRequest: trabajador_id, fecha_inicio y turno_id obligatorios; fecha_fin opcional.
export const validarCrearAsignacion = (req, res, next) => {
  const { trabajador_id, fecha_inicio, fecha_fin = null, turno_id } = req.body ?? {};
  if (!esUuid(trabajador_id)) {
    return responderValidacion(res, 'El campo "trabajador_id" es requerido y debe ser un UUID.');
  }
  if (!esFecha(fecha_inicio)) {
    return responderValidacion(res, 'El campo "fecha_inicio" es requerido con formato YYYY-MM-DD.');
  }
  if (fecha_fin !== null && (!esFecha(fecha_fin) || fecha_fin < fecha_inicio)) {
    return responderValidacion(res, 'El campo "fecha_fin" debe ser null o una fecha YYYY-MM-DD igual o posterior a "fecha_inicio".');
  }
  if (!esTurnoId(turno_id)) {
    return responderValidacion(res, 'El campo "turno_id" es requerido y debe ser un entero.');
  }
  req.body = { trabajador_id, fecha_inicio, fecha_fin, turno_id };
  next();
};

// PATCH /asignaciones/{id}: cerrar (fecha_fin) o desactivar (activa); al menos uno de los dos.
export const validarActualizarAsignacion = (req, res, next) => {
  const { fecha_fin, activa } = req.body ?? {};
  const datos = {};
  if (fecha_fin !== undefined) {
    if (fecha_fin !== null && !esFecha(fecha_fin)) {
      return responderValidacion(res, 'El campo "fecha_fin" debe ser null o una fecha YYYY-MM-DD.');
    }
    datos.fecha_fin = fecha_fin;
  }
  if (activa !== undefined) {
    if (typeof activa !== 'boolean') {
      return responderValidacion(res, 'El campo "activa" debe ser booleano.');
    }
    datos.activa = activa;
  }
  if (Object.keys(datos).length === 0) {
    return responderValidacion(res, 'Envía al menos un campo a modificar: fecha_fin o activa.');
  }
  req.body = datos;
  next();
};

// POST /asignaciones/{id}/acuerdos: el turno propuesto para un día.
export const validarProponerAcuerdo = (req, res, next) => {
  const { fecha, turno_id } = req.body ?? {};
  if (!esFecha(fecha)) {
    return responderValidacion(res, 'El campo "fecha" es requerido con formato YYYY-MM-DD.');
  }
  if (!esTurnoId(turno_id)) {
    return responderValidacion(res, 'El campo "turno_id" es requerido y debe ser un entero.');
  }
  req.body = { fecha, turno_id };
  next();
};

// AcuerdoRespuestaRequest: el trabajador acepta o rechaza.
export const validarRespuestaAcuerdo = (req, res, next) => {
  const { estado } = req.body ?? {};
  if (!ESTADOS_RESPUESTA.includes(estado)) {
    return responderValidacion(res, 'El campo "estado" debe ser ACEPTADO o RECHAZADO.');
  }
  req.body = { estado };
  next();
};

// GET /acuerdos-turno: filtros opcionales estado y desde (fecha del acuerdo).
export const validarFiltrosAcuerdos = (req, res, next) => {
  const { estado, desde } = req.query;
  if (estado !== undefined && !ESTADOS_ACUERDO.includes(estado)) {
    return responderValidacion(res, `El filtro "estado" debe ser uno de: ${ESTADOS_ACUERDO.join(', ')}.`);
  }
  if (desde !== undefined && !esFecha(desde)) {
    return responderValidacion(res, 'El filtro "desde" debe ser una fecha YYYY-MM-DD.');
  }
  req.filtros = { estado: estado ?? null, desde: desde ?? null };
  next();
};

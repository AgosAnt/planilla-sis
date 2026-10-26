import { esUuid, esFecha, responderValidacion } from './validadores.js';

const MAX_DIAS_PERIODO = 62;
const dias = (desde, hasta) => (Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86400000;

// Valida que los parámetros de ruta indicados sean UUID.
export const validarIdsPlanilla = (...nombres) => (req, res, next) => {
  const invalido = nombres.find((nombre) => !esUuid(req.params[nombre]));
  if (invalido) return responderValidacion(res, `El parámetro "${invalido}" debe ser un UUID.`);
  next();
};

// POST /planillas/periodos: { codigo, fecha_inicio, fecha_fin }
export const validarCrearPeriodo = (req, res, next) => {
  const { codigo, fecha_inicio, fecha_fin } = req.body ?? {};
  const codigoLimpio = typeof codigo === 'string' ? codigo.trim() : '';
  if (!codigoLimpio || codigoLimpio.length > 50) {
    return responderValidacion(res, 'El campo "codigo" es requerido (1 a 50 caracteres), por ejemplo "2026-11-Q2".');
  }
  if (!esFecha(fecha_inicio) || !esFecha(fecha_fin) || fecha_fin < fecha_inicio) {
    return responderValidacion(res, 'Los campos "fecha_inicio" y "fecha_fin" son requeridos (YYYY-MM-DD) y fecha_fin no puede ser anterior.');
  }
  if (dias(fecha_inicio, fecha_fin) > MAX_DIAS_PERIODO) {
    return responderValidacion(res, `Un período no puede durar más de ${MAX_DIAS_PERIODO} días.`);
  }
  req.body = { codigo: codigoLimpio, fecha_inicio, fecha_fin };
  next();
};

// POST /planillas: { periodo_id, ruta_id? } (sin ruta = planilla general)
export const validarCrearPlanilla = (req, res, next) => {
  const { periodo_id, ruta_id = null } = req.body ?? {};
  if (!esUuid(periodo_id)) return responderValidacion(res, 'El campo "periodo_id" es requerido y debe ser un UUID.');
  if (ruta_id !== null && !esUuid(ruta_id)) return responderValidacion(res, 'El campo "ruta_id" debe ser un UUID o null.');
  req.body = { periodo_id, ruta_id };
  next();
};

// POST /planillas/{id}/verificar: VerificarRequest
export const validarVerificar = (req, res, next) => {
  const { observaciones, excepciones_revisadas = [] } = req.body ?? {};
  if (typeof observaciones !== 'string' || !observaciones.trim() || observaciones.length > 1000) {
    return responderValidacion(res, 'El campo "observaciones" es requerido (hasta 1000 caracteres).');
  }
  if (!Array.isArray(excepciones_revisadas) || excepciones_revisadas.length > 500 || !excepciones_revisadas.every(esUuid)) {
    return responderValidacion(res, 'El campo "excepciones_revisadas" debe ser una lista de UUID.');
  }
  req.body = { observaciones: observaciones.trim(), excepciones_revisadas };
  next();
};

// GET /planillas?periodo_id=
export const validarListarPlanillas = (req, res, next) => {
  if (!esUuid(req.query.periodo_id)) return responderValidacion(res, 'El filtro "periodo_id" es requerido y debe ser un UUID.');
  next();
};

// GET /planillas/periodos/{periodoId}/calculo?ruta_id=
export const validarRutaOpcional = (req, res, next) => {
  const { ruta_id } = req.query;
  if (ruta_id !== undefined && !esUuid(ruta_id)) return responderValidacion(res, 'El filtro "ruta_id" debe ser un UUID.');
  req.rutaId = ruta_id ?? null;
  next();
};

// GET /me/calculo?desde&hasta
export const validarRangoCalculo = (req, res, next) => {
  const { desde, hasta } = req.query;
  if (!esFecha(desde) || !esFecha(hasta) || hasta < desde) {
    return responderValidacion(res, 'Los filtros "desde" y "hasta" son requeridos (YYYY-MM-DD) y "hasta" no puede ser anterior.');
  }
  if (dias(desde, hasta) > MAX_DIAS_PERIODO) {
    return responderValidacion(res, `El rango no puede pasar de ${MAX_DIAS_PERIODO} días.`);
  }
  next();
};

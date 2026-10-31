import { esUuid, esFecha, esEnteroEnRango, responderValidacion } from './validadores.js';

const PERIODICIDADES = ['SEMANAL', 'QUINCENAL', 'MENSUAL'];
const DECIMAL = /^\d{1,7}(\.\d{1,2})?$/;

// Número decimal con hasta 2 decimales (acepta 1.5 o "1.50"); devuelve el texto normalizado o null
const decimal = (valor, min, max) => {
  const texto = typeof valor === 'number' ? String(valor) : valor;
  if (typeof texto !== 'string' || !DECIMAL.test(texto)) return null;
  const n = Number(texto);
  return n >= min && n <= max ? n.toFixed(2) : null;
};

// PATCH /admin/parametros-pago: solo lo enviado, al menos un campo (docs/reglas-calculo.md)
const REGLAS = {
  factor_hora_extra: [(v) => decimal(v, 1.5, 9.99), 'decimal entre 1.50 y 9.99 (art. 121: al menos 50 % más)'],
  factor_hora_nocturna: [(v) => decimal(v, 1, 9.99), 'decimal entre 1.00 y 9.99'],
  minutos_tolerancia_llegada: [(v) => (esEnteroEnRango(v, 0, 120) ? v : null), 'entero entre 0 y 120'],
  regla_redondeo: [(v) => (v === 'EXACTO' ? v : null), 'EXACTO (el motor todavía no aplica otros redondeos)'],
  periodicidad: [(v) => (PERIODICIDADES.includes(v) ? v : null), PERIODICIDADES.join(', ')],
  porcentaje_igss_laboral: [(v) => decimal(v, 0, 100), 'decimal entre 0 y 100'],
  bonificacion_incentivo_mensual: [(v) => decimal(v, 0, 99999), 'monto mayor o igual a 0'],
  minutos_almuerzo_pagado: [(v) => (esEnteroEnRango(v, 0, 120) ? v : null), 'entero entre 0 y 120'],
  horas_maximas_dia: [(v) => decimal(v, 1, 24), 'decimal entre 1 y 24'],
};

export const validarActualizarParametros = (req, res, next) => {
  const body = req.body ?? {};
  const datos = {};
  for (const [campo, [validar, descripcion]] of Object.entries(REGLAS)) {
    if (body[campo] === undefined) continue;
    const valor = validar(body[campo]);
    if (valor === null) return responderValidacion(res, `El campo "${campo}" debe ser ${descripcion}.`);
    datos[campo] = valor;
  }
  if (Object.keys(datos).length === 0) {
    return responderValidacion(res, `Envía al menos un campo a modificar: ${Object.keys(REGLAS).join(', ')}.`);
  }
  req.body = datos;
  next();
};

// POST /admin/feriados: { fecha, nombre, medio_dia? }
export const validarFeriado = (req, res, next) => {
  const { fecha, nombre, medio_dia = false } = req.body ?? {};
  const nombreLimpio = typeof nombre === 'string' ? nombre.trim() : '';
  if (!esFecha(fecha)) return responderValidacion(res, 'El campo "fecha" es requerido con formato YYYY-MM-DD.');
  if (!nombreLimpio || nombreLimpio.length > 100) return responderValidacion(res, 'El campo "nombre" es requerido (1 a 100 caracteres).');
  if (typeof medio_dia !== 'boolean') return responderValidacion(res, 'El campo "medio_dia" debe ser booleano.');
  req.body = { fecha, nombre: nombreLimpio, medio_dia };
  next();
};

export const validarFechaFeriado = (req, res, next) => {
  if (!esFecha(req.params.fecha)) return responderValidacion(res, 'La fecha del feriado debe tener formato YYYY-MM-DD.');
  next();
};

export const validarAnio = (req, res, next) => {
  const { anio } = req.query;
  if (anio !== undefined && !/^\d{4}$/.test(anio)) return responderValidacion(res, 'El filtro "anio" debe ser un año de 4 dígitos.');
  req.anio = anio === undefined ? null : Number(anio);
  next();
};

export const validarTrabajadorId = (req, res, next) => {
  if (!esUuid(req.params.trabajadorId)) return responderValidacion(res, 'El "trabajadorId" debe ser un UUID.');
  next();
};

// POST /trabajadores/{id}/tarifas: { monto_hora, monto_hora_extra?, vigente_desde }
export const validarTarifa = (req, res, next) => {
  const { monto_hora, monto_hora_extra = null, vigente_desde } = req.body ?? {};
  const hora = decimal(monto_hora, 0.01, 99999);
  if (hora === null) return responderValidacion(res, 'El campo "monto_hora" es requerido: monto mayor a 0 con hasta 2 decimales.');
  const extra = monto_hora_extra === null ? null : decimal(monto_hora_extra, 0.01, 99999);
  if (monto_hora_extra !== null && extra === null) {
    return responderValidacion(res, 'El campo "monto_hora_extra" debe ser null o un monto mayor a 0.');
  }
  if (extra !== null && Number(extra) < Number(hora) * 1.5) {
    return responderValidacion(res, 'El campo "monto_hora_extra" no puede ser menor a 1.5 veces "monto_hora" (art. 121).');
  }
  if (!esFecha(vigente_desde)) return responderValidacion(res, 'El campo "vigente_desde" es requerido con formato YYYY-MM-DD.');
  req.body = { monto_hora: hora, monto_hora_extra: extra, vigente_desde };
  next();
};

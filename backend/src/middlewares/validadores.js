export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ISO 8601 con zona explícita (Z u offset): la BD guarda timestamptz y el contrato exige UTC.
const FECHA_ISO_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,6})?)?(Z|[+-]\d{2}:\d{2})$/;

export const esUuid = (valor) => typeof valor === 'string' && UUID_REGEX.test(valor);

export const esFechaIso = (valor) =>
  typeof valor === 'string' && FECHA_ISO_REGEX.test(valor) && !Number.isNaN(Date.parse(valor));

// Fecha de calendario YYYY-MM-DD válida (rechaza 2026-02-30)
export const esFecha = (valor) => {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().startsWith(valor);
};

// Ubicacion del contrato: { lat, lng, precision_m? }
export const esUbicacion = (valor) =>
  typeof valor === 'object' && valor !== null &&
  typeof valor.lat === 'number' && Math.abs(valor.lat) <= 90 &&
  typeof valor.lng === 'number' && Math.abs(valor.lng) <= 180 &&
  (valor.precision_m === undefined || (typeof valor.precision_m === 'number' && valor.precision_m >= 0));

export const esEnteroEnRango = (valor, min, max) =>
  Number.isInteger(valor) && valor >= min && valor <= max;

export const responderValidacion = (res, detalle) =>
  res.status(400).type('application/problem+json').json({
    type: 'about:blank',
    title: 'Validación fallida',
    status: 400,
    detail: detalle,
    code: 'VALIDACION',
  });

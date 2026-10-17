export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ISO 8601 con zona explícita (Z u offset): la BD guarda timestamptz y el contrato exige UTC.
const FECHA_ISO_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,6})?)?(Z|[+-]\d{2}:\d{2})$/;

export const esUuid = (valor) => typeof valor === 'string' && UUID_REGEX.test(valor);

export const esFechaIso = (valor) =>
  typeof valor === 'string' && FECHA_ISO_REGEX.test(valor) && !Number.isNaN(Date.parse(valor));

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

// Todas las funciones reciben el client de la transacción abierta por conClaims (RLS de M010).

const COLUMNAS_PARAMETROS = `
  factor_hora_extra::text AS factor_hora_extra, factor_hora_nocturna::text AS factor_hora_nocturna,
  minutos_tolerancia_llegada, regla_redondeo, periodicidad, porcentaje_igss_laboral::text AS porcentaje_igss_laboral,
  bonificacion_incentivo_mensual::text AS bonificacion_incentivo_mensual, minutos_almuerzo_pagado,
  horas_maximas_dia::text AS horas_maximas_dia, actualizado_at
`;

export const obtenerParametros = async (client, { bloquear = false } = {}) => {
  const { rows } = await client.query(`SELECT ${COLUMNAS_PARAMETROS} FROM parametros_pago WHERE id = 1 ${bloquear ? 'FOR UPDATE' : ''};`);
  return rows[0];
};

// Solo columnas de una lista fija: los nombres nunca vienen del usuario
const EDITABLES = ['factor_hora_extra', 'factor_hora_nocturna', 'minutos_tolerancia_llegada', 'regla_redondeo', 'periodicidad',
  'porcentaje_igss_laboral', 'bonificacion_incentivo_mensual', 'minutos_almuerzo_pagado', 'horas_maximas_dia'];

export const actualizarParametros = async (client, cambios) => {
  const campos = EDITABLES.filter((c) => cambios[c] !== undefined);
  const asignaciones = campos.map((c, i) => `${c} = $${i + 1}`).join(', ');
  await client.query(`UPDATE parametros_pago SET ${asignaciones}, actualizado_at = NOW() WHERE id = 1;`, campos.map((c) => cambios[c]));
};

export const listarFeriados = async (client, anio) => {
  const query = `
    SELECT fecha::text AS fecha, nombre, medio_dia FROM feriados
    WHERE $1::int IS NULL OR extract(year FROM fecha) = $1
    ORDER BY fecha;
  `;
  const { rows } = await client.query(query, [anio]);
  return rows;
};

export const crearFeriado = async (client, { fecha, nombre, medioDia }) => {
  const query = 'INSERT INTO feriados (fecha, nombre, medio_dia) VALUES ($1, $2, $3) RETURNING fecha::text AS fecha, nombre, medio_dia;';
  const { rows } = await client.query(query, [fecha, nombre, medioDia]);
  return rows[0];
};

export const borrarFeriado = async (client, fecha) => {
  const { rows } = await client.query('DELETE FROM feriados WHERE fecha = $1 RETURNING fecha::text AS fecha, nombre, medio_dia;', [fecha]);
  return rows[0];
};

export const esTrabajadorActivo = async (client, perfilId) => {
  const query = `
    SELECT 1 FROM perfiles p JOIN roles r ON r.id = p.rol_id
    WHERE p.id = $1 AND p.activo AND r.nombre = 'trabajador';
  `;
  const { rowCount } = await client.query(query, [perfilId]);
  return rowCount > 0;
};

const COLUMNAS_TARIFA = `id, trabajador_id, monto_hora::text AS monto_hora, monto_hora_extra::text AS monto_hora_extra, moneda,
  vigente_desde::text AS vigente_desde, vigente_hasta::text AS vigente_hasta, creado_at`;

export const listarTarifas = async (client, trabajadorId) => {
  const { rows } = await client.query(
    `SELECT ${COLUMNAS_TARIFA} FROM tarifas_trabajador WHERE trabajador_id = $1 ORDER BY vigente_desde DESC;`, [trabajadorId]);
  return rows;
};

// Tarifa sin fecha de fin (la vigente hacia adelante), bloqueada para cerrarla
export const tarifaAbierta = async (client, trabajadorId) => {
  const query = `SELECT ${COLUMNAS_TARIFA} FROM tarifas_trabajador WHERE trabajador_id = $1 AND vigente_hasta IS NULL FOR UPDATE;`;
  const { rows } = await client.query(query, [trabajadorId]);
  return rows[0];
};

export const cerrarTarifa = async (client, tarifaId, vigenteHasta) => {
  await client.query('UPDATE tarifas_trabajador SET vigente_hasta = $2 WHERE id = $1;', [tarifaId, vigenteHasta]);
};

export const crearTarifa = async (client, { trabajadorId, montoHora, montoHoraExtra, vigenteDesde }) => {
  const query = `
    INSERT INTO tarifas_trabajador (trabajador_id, monto_hora, monto_hora_extra, vigente_desde)
    VALUES ($1, $2, $3, $4) RETURNING ${COLUMNAS_TARIFA};
  `;
  const { rows } = await client.query(query, [trabajadorId, montoHora, montoHoraExtra, vigenteDesde]);
  return rows[0];
};

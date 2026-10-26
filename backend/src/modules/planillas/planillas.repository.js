// Todas las funciones reciben el client de la transacción abierta por conClaims (RLS de M010).
// Las fechas salen como texto YYYY-MM-DD y los montos como texto decimal, para no perder precisión.

const COLUMNAS_PERIODO = 'p.id, p.codigo, p.fecha_inicio::text AS fecha_inicio, p.fecha_fin::text AS fecha_fin, p.estado, p.creado_at';
const COLUMNAS_PLANILLA = `pl.id, pl.periodo_id, pl.ruta_id, pl.estado, pl.calculada_por, pl.calculada_at,
  pl.verificada_por, pl.verificada_at, pl.aprobada_por, pl.aprobada_at, pl.hash_integridad`;

// ------------------------------- Períodos -------------------------------
export const crearPeriodo = async (client, { codigo, fechaInicio, fechaFin }) => {
  const query = `
    INSERT INTO periodos_planilla (codigo, fecha_inicio, fecha_fin) VALUES ($1, $2, $3)
    RETURNING id, codigo, fecha_inicio::text AS fecha_inicio, fecha_fin::text AS fecha_fin, estado, creado_at;
  `;
  const { rows } = await client.query(query, [codigo, fechaInicio, fechaFin]);
  return rows[0];
};

export const contarPeriodos = async (client) => {
  const { rows } = await client.query('SELECT count(*)::int AS total FROM periodos_planilla;');
  return rows[0].total;
};

export const listarPeriodos = async (client, { limite, desplazamiento }) => {
  const query = `SELECT ${COLUMNAS_PERIODO} FROM periodos_planilla p ORDER BY p.fecha_inicio DESC LIMIT $1 OFFSET $2;`;
  const { rows } = await client.query(query, [limite, desplazamiento]);
  return rows;
};

export const buscarPeriodo = async (client, periodoId, { bloquear = false } = {}) => {
  const query = `SELECT ${COLUMNAS_PERIODO} FROM periodos_planilla p WHERE p.id = $1 ${bloquear ? 'FOR UPDATE' : ''};`;
  const { rows } = await client.query(query, [periodoId]);
  return rows[0];
};

export const actualizarEstadoPeriodo = async (client, periodoId, estado) => {
  await client.query('UPDATE periodos_planilla SET estado = $2 WHERE id = $1;', [periodoId, estado]);
};

// ------------------------------- Planillas -------------------------------
export const crearPlanilla = async (client, { periodoId, rutaId, calculadaPor }) => {
  const query = `
    INSERT INTO planillas (periodo_id, ruta_id, calculada_por) VALUES ($1, $2, $3)
    RETURNING id;
  `;
  const { rows } = await client.query(query, [periodoId, rutaId, calculadaPor]);
  return rows[0].id;
};

export const buscarPlanilla = async (client, planillaId, { bloquear = false } = {}) => {
  const query = `SELECT ${COLUMNAS_PLANILLA} FROM planillas pl WHERE pl.id = $1 ${bloquear ? 'FOR UPDATE' : ''};`;
  const { rows } = await client.query(query, [planillaId]);
  return rows[0];
};

export const buscarPlanillaDePeriodo = async (client, periodoId, rutaId) => {
  const query = `SELECT ${COLUMNAS_PLANILLA} FROM planillas pl WHERE pl.periodo_id = $1 AND pl.ruta_id IS NOT DISTINCT FROM $2;`;
  const { rows } = await client.query(query, [periodoId, rutaId]);
  return rows[0];
};

// Planillas de un período con sus totales (para la lista de la web)
export const listarPlanillas = async (client, periodoId) => {
  const query = `
    SELECT ${COLUMNAS_PLANILLA}, r.codigo AS ruta_codigo,
           count(d.id)::int AS trabajadores, COALESCE(sum(d.monto_bruto), 0)::text AS total_bruto,
           COALESCE(sum(d.neto), 0)::text AS total_neto
    FROM planillas pl
    LEFT JOIN rutas r ON r.id = pl.ruta_id
    LEFT JOIN planilla_detalle d ON d.planilla_id = pl.id
    WHERE pl.periodo_id = $1
    GROUP BY pl.id, r.codigo
    ORDER BY r.codigo NULLS FIRST;
  `;
  const { rows } = await client.query(query, [periodoId]);
  return rows;
};

export const marcarCalculada = async (client, planillaId, usuarioId) => {
  await client.query('UPDATE planillas SET calculada_por = $2, calculada_at = NOW() WHERE id = $1;', [planillaId, usuarioId]);
};

export const marcarVerificada = async (client, planillaId, usuarioId) => {
  const query = `
    UPDATE planillas SET estado = 'VERIFICADA', verificada_por = $2, verificada_at = NOW() WHERE id = $1
    RETURNING id, estado, verificada_por, verificada_at;
  `;
  const { rows } = await client.query(query, [planillaId, usuarioId]);
  return rows[0];
};

// ------------------------------- Datos para el cálculo -------------------------------
// Jornadas del período (fecha de ingreso en la zona de operación), opcionalmente de una ruta. Sin las RECHAZADAS.
export const jornadasDelPeriodo = async (client, { fechaInicio, fechaFin, rutaId, trabajadorId = null, zona }) => {
  const query = `
    SELECT rt.id, rt.trabajador_id, rt.asignacion_id, rt.ingreso_at, rt.salida_at, rt.estado_validacion
    FROM registros_tiempo rt
    LEFT JOIN asignaciones_ruta a ON a.id = rt.asignacion_id
    WHERE (rt.ingreso_at AT TIME ZONE $5)::date BETWEEN $1::date AND $2::date
      AND ($3::uuid IS NULL OR a.ruta_id = $3)
      AND ($4::uuid IS NULL OR rt.trabajador_id = $4)
      AND rt.estado_validacion <> 'RECHAZADA'
    ORDER BY rt.ingreso_at;
  `;
  const { rows } = await client.query(query, [fechaInicio, fechaFin, rutaId, trabajadorId, zona]);
  return rows;
};

export const descansosDe = async (client, registroIds) => {
  const query = `
    SELECT d.registro_tiempo_id, d.inicio_at, d.fin_at, td.remunerado
    FROM descansos d JOIN tipos_descanso td ON td.id = d.tipo_id
    WHERE d.registro_tiempo_id = ANY($1::uuid[]);
  `;
  const { rows } = await client.query(query, [registroIds]);
  return rows;
};

// Turno acordado (aceptado o confirmado) el día del ingreso de cada jornada
export const turnosDe = async (client, registroIds, zona) => {
  const query = `
    SELECT rt.id AS registro_id, to_char(t.hora_inicio, 'HH24:MI') AS hora_inicio
    FROM registros_tiempo rt
    JOIN acuerdos_turno ac ON ac.asignacion_id = rt.asignacion_id
      AND ac.fecha = (rt.ingreso_at AT TIME ZONE $2)::date AND ac.estado IN ('ACEPTADO', 'CONFIRMADO')
    JOIN turnos t ON t.id = ac.turno_id
    WHERE rt.id = ANY($1::uuid[]);
  `;
  const { rows } = await client.query(query, [registroIds, zona]);
  return rows;
};

export const tarifasDe = async (client, trabajadorIds) => {
  const query = `
    SELECT trabajador_id, monto_hora::text AS monto_hora, monto_hora_extra::text AS monto_hora_extra,
           vigente_desde::text AS vigente_desde, vigente_hasta::text AS vigente_hasta
    FROM tarifas_trabajador WHERE trabajador_id = ANY($1::uuid[]);
  `;
  const { rows } = await client.query(query, [trabajadorIds]);
  return rows;
};

export const parametrosDePago = async (client) => {
  const query = `
    SELECT factor_hora_extra::text AS factor_hora_extra, factor_hora_nocturna::text AS factor_hora_nocturna,
           minutos_tolerancia_llegada, regla_redondeo, periodicidad, porcentaje_igss_laboral::text AS porcentaje_igss_laboral,
           bonificacion_incentivo_mensual::text AS bonificacion_incentivo_mensual, minutos_almuerzo_pagado,
           horas_maximas_dia::text AS horas_maximas_dia
    FROM parametros_pago WHERE id = 1;
  `;
  const { rows } = await client.query(query);
  return rows[0];
};

export const feriadosEntre = async (client, fechaInicio, fechaFin) => {
  const { rows } = await client.query(
    'SELECT fecha::text AS fecha, medio_dia FROM feriados WHERE fecha BETWEEN $1::date AND $2::date;', [fechaInicio, fechaFin]);
  return rows;
};

// ------------------------------- Detalle -------------------------------
export const borrarDetalle = async (client, planillaId) => {
  await client.query('DELETE FROM planilla_detalle WHERE planilla_id = $1;', [planillaId]);
};

export const insertarDetalle = async (client, planillaId, trabajadorId, r) => {
  const query = `
    INSERT INTO planilla_detalle (planilla_id, trabajador_id, horas_ordinarias, horas_extra_diurnas, horas_extra_nocturnas,
                                  monto_bruto, total_bonificaciones, total_deducciones, neto, calculo_detalle)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
    RETURNING id;
  `;
  const { rows } = await client.query(query, [planillaId, trabajadorId, r.horas_ordinarias, r.horas_extra_diurnas,
    r.horas_extra_nocturnas, r.monto_bruto, r.total_bonificaciones, r.total_deducciones, r.neto,
    JSON.stringify({ ...r.calculo_detalle, alertas: r.alertas })]);
  return rows[0].id;
};

// Conceptos de ley (M005): BONO_LEY, IGSS, ISR
export const insertarConceptos = async (client, detalleId, conceptos) => {
  const query = `
    INSERT INTO detalle_conceptos (detalle_id, concepto_id, monto)
    SELECT $1, c.id, v.monto::numeric
    FROM jsonb_each_text($2::jsonb) AS v(codigo, monto)
    JOIN conceptos_pago c ON c.codigo = v.codigo;
  `;
  await client.query(query, [detalleId, JSON.stringify(conceptos)]);
};

export const contarDetalle = async (client, planillaId) => {
  const { rows } = await client.query('SELECT count(*)::int AS total FROM planilla_detalle WHERE planilla_id = $1;', [planillaId]);
  return rows[0].total;
};

export const resumenDetalle = async (client, planillaId) => {
  const query = `
    SELECT count(*)::int AS trabajadores, COALESCE(sum(horas_ordinarias), 0)::text AS horas_ordinarias,
           COALESCE(sum(horas_extra_diurnas + horas_extra_nocturnas), 0)::text AS horas_extra,
           COALESCE(sum(monto_bruto), 0)::text AS total_bruto, COALESCE(sum(neto), 0)::text AS total_neto
    FROM planilla_detalle WHERE planilla_id = $1;
  `;
  const { rows } = await client.query(query, [planillaId]);
  return rows[0];
};

export const listarDetalle = async (client, planillaId, { limite, desplazamiento }) => {
  const query = `
    SELECT d.id, d.trabajador_id, p.nombres || ' ' || p.apellidos AS trabajador_nombre,
           d.horas_ordinarias::text AS horas_ordinarias, d.horas_extra_diurnas::text AS horas_extra_diurnas,
           d.horas_extra_nocturnas::text AS horas_extra_nocturnas, d.monto_bruto::text AS monto_bruto,
           d.total_bonificaciones::text AS total_bonificaciones, d.total_deducciones::text AS total_deducciones,
           d.neto::text AS neto, COALESCE(d.calculo_detalle -> 'alertas', '[]'::jsonb) AS alertas
    FROM planilla_detalle d JOIN perfiles p ON p.id = d.trabajador_id
    WHERE d.planilla_id = $1
    ORDER BY p.apellidos, p.nombres
    LIMIT $2 OFFSET $3;
  `;
  const { rows } = await client.query(query, [planillaId, limite, desplazamiento]);
  return rows;
};

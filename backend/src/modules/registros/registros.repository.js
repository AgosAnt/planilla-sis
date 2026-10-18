// Todas las funciones reciben el client de la transacción abierta por conClaims (RLS de M008).

const COLUMNAS = `rt.id, rt.trabajador_id, rt.asignacion_id, rt.ingreso_at, rt.salida_at,
  rt.estado_validacion, rt.validado_por, rt.validado_at`;

// Visibilidad por rol (C.2 y D.4): administrador ve todos; trabajador, los propios; supervisor, los de
// trabajadores con asignación activa en una ruta suya (igual que app.supervisa_trabajador). $1 = rol, $2 = perfiles.id
const VISIBLE_PARA = `
  ($1 = 'administrador'
   OR ($1 = 'trabajador' AND rt.trabajador_id = $2)
   OR ($1 = 'supervisor' AND EXISTS (
         SELECT 1 FROM asignaciones_ruta a JOIN rutas r ON r.id = a.ruta_id
         WHERE a.trabajador_id = rt.trabajador_id AND a.activa AND r.supervisor_id = $2)))
`;

// Filtros opcionales del listado; desde/hasta son fechas de calendario en la zona de operación ($7)
const FILTROS = `
  AND ($3::uuid IS NULL OR rt.trabajador_id = $3)
  AND ($4::date IS NULL OR rt.ingreso_at >= ($4::date)::timestamp AT TIME ZONE $7)
  AND ($5::date IS NULL OR rt.ingreso_at < ($5::date + 1)::timestamp AT TIME ZONE $7)
  AND ($6::text IS NULL OR rt.estado_validacion = $6)
`;

const parametrosListado = ({ rol, usuarioId, trabajadorId, desde, hasta, estado, zona }) =>
  [rol, usuarioId, trabajadorId, desde, hasta, estado, zona];

export const contarRegistros = async (client, filtro) => {
  const query = `SELECT count(*)::int AS total FROM registros_tiempo rt WHERE ${VISIBLE_PARA} ${FILTROS};`;
  const { rows } = await client.query(query, parametrosListado(filtro));
  return rows[0].total;
};

export const listarRegistros = async (client, filtro) => {
  const query = `
    SELECT ${COLUMNAS}
    FROM registros_tiempo rt
    WHERE ${VISIBLE_PARA} ${FILTROS}
    ORDER BY rt.ingreso_at DESC
    LIMIT $8 OFFSET $9;
  `;
  const { rows } = await client.query(query, [...parametrosListado(filtro), filtro.limite, filtro.desplazamiento]);
  return rows;
};

// bloquear = true para leer antes de un UPDATE dentro de la misma transacción
export const buscarRegistro = async (client, { rol, usuarioId, registroId, bloquear = false }) => {
  const query = `
    SELECT ${COLUMNAS}, rt.observaciones
    FROM registros_tiempo rt
    WHERE rt.id = $3 AND ${VISIBLE_PARA}
    ${bloquear ? 'FOR UPDATE' : ''};
  `;
  const { rows } = await client.query(query, [rol, usuarioId, registroId]);
  return rows[0];
};

export const buscarPorClientUuid = async (client, trabajadorId, clientUuid) => {
  const query = `
    SELECT rt.id, rt.asignacion_id, rt.ingreso_at, rt.estado_validacion
    FROM registros_tiempo rt
    WHERE rt.trabajador_id = $1 AND rt.client_uuid = $2;
  `;
  const { rows } = await client.query(query, [trabajadorId, clientUuid]);
  return rows[0];
};

// Asignación propia, activa y vigente en la fecha local del ingreso
export const buscarAsignacionVigente = async (client, { asignacionId, trabajadorId, ingresoAt, zona }) => {
  const query = `
    SELECT a.id, a.ruta_id
    FROM asignaciones_ruta a
    WHERE a.id = $1 AND a.trabajador_id = $2 AND a.activa
      AND a.fecha_inicio <= ($3::timestamptz AT TIME ZONE $4)::date
      AND (a.fecha_fin IS NULL OR a.fecha_fin >= ($3::timestamptz AT TIME ZONE $4)::date);
  `;
  const { rows } = await client.query(query, [asignacionId, trabajadorId, ingresoAt, zona]);
  return rows[0];
};

export const ultimaSalida = async (client, trabajadorId) => {
  const { rows } = await client.query('SELECT max(salida_at) AS salida FROM registros_tiempo WHERE trabajador_id = $1;', [trabajadorId]);
  return rows[0].salida;
};

export const existeRegistroAbierto = async (client, trabajadorId) => {
  const query = `SELECT 1 FROM registros_tiempo WHERE trabajador_id = $1 AND salida_at IS NULL;`;
  const { rowCount } = await client.query(query, [trabajadorId]);
  return rowCount > 0;
};

export const crearIngreso = async (client, r) => {
  const query = `
    INSERT INTO registros_tiempo
      (trabajador_id, asignacion_id, ingreso_at, latitud_ingreso, longitud_ingreso, precision_m, dispositivo, origen, client_uuid)
    VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, 'MOVIL', $8)
    RETURNING id, estado_validacion;
  `;
  const { rows } = await client.query(query, [
    r.trabajadorId, r.asignacionId, r.ingresoAt, r.lat, r.lng, r.precision, JSON.stringify(r.dispositivo), r.clientUuid,
  ]);
  return rows[0];
};

// Turno acordado (aceptado o confirmado) para la asignación en la fecha local del ingreso
export const buscarTurno = async (client, { asignacionId, ingresoAt, zona }) => {
  const query = `
    SELECT t.nombre, to_char(t.hora_inicio, 'HH24:MI') AS hora_inicio, to_char(t.hora_fin, 'HH24:MI') AS hora_fin
    FROM acuerdos_turno ac
    JOIN turnos t ON t.id = ac.turno_id
    WHERE ac.asignacion_id = $1 AND ac.fecha = ($2::timestamptz AT TIME ZONE $3)::date
      AND ac.estado IN ('ACEPTADO', 'CONFIRMADO');
  `;
  const { rows } = await client.query(query, [asignacionId, ingresoAt, zona]);
  return rows[0];
};

// ¿La ubicación cae dentro del radio de algún punto de la ruta? (fórmula de haversine, en metros).
// null cuando la ruta no tiene puntos definidos.
export const dentroDeGeocerca = async (client, { rutaId, lat, lng }) => {
  const query = `
    SELECT count(*)::int AS puntos,
           bool_or(2 * 6371000 * asin(sqrt(
             power(sin(radians(p.latitud::float8 - $2::float8) / 2), 2) +
             cos(radians($2::float8)) * cos(radians(p.latitud::float8)) *
             power(sin(radians(p.longitud::float8 - $3::float8) / 2), 2)
           )) <= p.radio_m) AS dentro
    FROM ruta_puntos p
    WHERE p.ruta_id = $1;
  `;
  const { rows } = await client.query(query, [rutaId, lat, lng]);
  return rows[0].puntos === 0 ? null : rows[0].dentro;
};

export const ultimoFinDescanso = async (client, registroId) => {
  const { rows } = await client.query('SELECT max(fin_at) AS fin FROM descansos WHERE registro_tiempo_id = $1;', [registroId]);
  return rows[0].fin;
};

export const registrarSalida = async (client, registroId, { salidaAt, lat, lng }) => {
  const query = `
    UPDATE registros_tiempo
    SET salida_at = $2, latitud_salida = $3, longitud_salida = $4
    WHERE id = $1
    RETURNING id, salida_at, estado_validacion;
  `;
  const { rows } = await client.query(query, [registroId, salidaAt, lat, lng]);
  return rows[0];
};

export const validarRegistro = async (client, registroId, { estado, observaciones, validadoPor }) => {
  const query = `
    UPDATE registros_tiempo
    SET estado_validacion = $2, observaciones = COALESCE($3, observaciones), validado_por = $4, validado_at = NOW()
    WHERE id = $1
    RETURNING id, estado_validacion, validado_por, validado_at;
  `;
  const { rows } = await client.query(query, [registroId, estado, observaciones, validadoPor]);
  return rows[0];
};

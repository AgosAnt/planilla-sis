// Todas las funciones reciben el client de la transacción abierta por conClaims.
// Las fechas salen como texto YYYY-MM-DD para que no se corran por la zona horaria.

const COLUMNAS_ASIGNACION = `
  a.id, a.ruta_id, a.trabajador_id, p.nombres || ' ' || p.apellidos AS trabajador_nombre,
  a.fecha_inicio::text AS fecha_inicio, a.fecha_fin::text AS fecha_fin, a.activa
`;

const COLUMNAS_ACUERDO = `
  ac.id, ac.asignacion_id, ac.fecha::text AS fecha, ac.estado, ac.confirmado_por, ac.confirmado_at,
  t.id AS turno_id, t.nombre AS turno_nombre,
  to_char(t.hora_inicio, 'HH24:MI') AS turno_hora_inicio, to_char(t.hora_fin, 'HH24:MI') AS turno_hora_fin
`;

// Quién gestiona una ruta: el administrador cualquiera; el supervisor, solo las suyas. $1 = rol, $2 = perfiles.id
const GESTIONA_RUTA = `($1 = 'administrador' OR ($1 = 'supervisor' AND r.supervisor_id = $2))`;

export const buscarRutaGestionable = async (client, { rol, usuarioId, rutaId }) => {
  const query = `SELECT r.id, r.activa FROM rutas r WHERE r.id = $3 AND ${GESTIONA_RUTA};`;
  const { rows } = await client.query(query, [rol, usuarioId, rutaId]);
  return rows[0];
};

export const esTrabajadorActivo = async (client, perfilId) => {
  const query = `
    SELECT 1 FROM perfiles p JOIN roles ro ON ro.id = p.rol_id
    WHERE p.id = $1 AND p.activo AND ro.nombre = 'trabajador';
  `;
  const { rowCount } = await client.query(query, [perfilId]);
  return rowCount > 0;
};

export const existeTurno = async (client, turnoId) => {
  const { rowCount } = await client.query('SELECT 1 FROM turnos WHERE id = $1;', [turnoId]);
  return rowCount > 0;
};

export const crearAsignacion = async (client, { rutaId, trabajadorId, asignadoPor, fechaInicio, fechaFin }) => {
  const query = `
    INSERT INTO asignaciones_ruta (ruta_id, trabajador_id, asignado_por, fecha_inicio, fecha_fin)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id;
  `;
  const { rows } = await client.query(query, [rutaId, trabajadorId, asignadoPor, fechaInicio, fechaFin]);
  return rows[0].id;
};

export const contarAsignaciones = async (client, rutaId) => {
  const { rows } = await client.query('SELECT count(*)::int AS total FROM asignaciones_ruta WHERE ruta_id = $1;', [rutaId]);
  return rows[0].total;
};

// Cada asignación lleva su acuerdo más relevante: el de hoy o el próximo; si no hay, el último.
export const listarAsignaciones = async (client, { rutaId, zona, limite, desplazamiento }) => {
  const query = `
    SELECT ${COLUMNAS_ASIGNACION}, row_to_json(acuerdo) AS acuerdo
    FROM asignaciones_ruta a
    JOIN perfiles p ON p.id = a.trabajador_id
    LEFT JOIN LATERAL (
      SELECT ${COLUMNAS_ACUERDO}
      FROM acuerdos_turno ac
      JOIN turnos t ON t.id = ac.turno_id
      WHERE ac.asignacion_id = a.id
      ORDER BY (ac.fecha < (NOW() AT TIME ZONE $2)::date), abs(ac.fecha - (NOW() AT TIME ZONE $2)::date)
      LIMIT 1
    ) acuerdo ON true
    WHERE a.ruta_id = $1
    ORDER BY a.activa DESC, a.fecha_inicio DESC
    LIMIT $3 OFFSET $4;
  `;
  const { rows } = await client.query(query, [rutaId, zona, limite, desplazamiento]);
  return rows;
};

export const buscarAsignacion = async (client, asignacionId) => {
  const query = `
    SELECT ${COLUMNAS_ASIGNACION}
    FROM asignaciones_ruta a JOIN perfiles p ON p.id = a.trabajador_id
    WHERE a.id = $1;
  `;
  const { rows } = await client.query(query, [asignacionId]);
  return rows[0];
};

// Asignación de una ruta que el usuario gestiona. bloquear = true antes de un UPDATE.
export const buscarAsignacionGestionable = async (client, { rol, usuarioId, asignacionId, bloquear = false }) => {
  const query = `
    SELECT a.id, a.fecha_inicio::text AS fecha_inicio, a.fecha_fin::text AS fecha_fin, a.activa
    FROM asignaciones_ruta a JOIN rutas r ON r.id = a.ruta_id
    WHERE a.id = $3 AND ${GESTIONA_RUTA}
    ${bloquear ? 'FOR UPDATE OF a' : ''};
  `;
  const { rows } = await client.query(query, [rol, usuarioId, asignacionId]);
  return rows[0];
};

export const actualizarAsignacion = async (client, asignacionId, { fechaFin, activa }) => {
  const query = 'UPDATE asignaciones_ruta SET fecha_fin = $2, activa = $3 WHERE id = $1;';
  await client.query(query, [asignacionId, fechaFin, activa]);
};

export const crearAcuerdo = async (client, { asignacionId, turnoId, fecha }) => {
  const query = `
    INSERT INTO acuerdos_turno (asignacion_id, turno_id, fecha)
    VALUES ($1, $2, $3)
    RETURNING id;
  `;
  const { rows } = await client.query(query, [asignacionId, turnoId, fecha]);
  return rows[0].id;
};

// Acuerdo con los datos para decidir permisos: trabajador de la asignación y supervisor de la ruta.
export const buscarAcuerdo = async (client, acuerdoId, { bloquear = false } = {}) => {
  const query = `
    SELECT ${COLUMNAS_ACUERDO}, a.trabajador_id, r.supervisor_id
    FROM acuerdos_turno ac
    JOIN turnos t ON t.id = ac.turno_id
    JOIN asignaciones_ruta a ON a.id = ac.asignacion_id
    JOIN rutas r ON r.id = a.ruta_id
    WHERE ac.id = $1
    ${bloquear ? 'FOR UPDATE OF ac' : ''};
  `;
  const { rows } = await client.query(query, [acuerdoId]);
  return rows[0];
};

export const actualizarEstadoAcuerdo = async (client, acuerdoId, { estado, confirmadoPor = null }) => {
  const query = `
    UPDATE acuerdos_turno
    SET estado = $2,
        confirmado_por = COALESCE($3, confirmado_por),
        confirmado_at = CASE WHEN $3::uuid IS NULL THEN confirmado_at ELSE NOW() END
    WHERE id = $1;
  `;
  await client.query(query, [acuerdoId, estado, confirmadoPor]);
};

// Visibilidad: trabajador, sus acuerdos; supervisor, los de sus rutas; administrador, todos.
const ACUERDO_VISIBLE = `
  ($1 = 'administrador'
   OR ($1 = 'supervisor' AND r.supervisor_id = $2)
   OR ($1 = 'trabajador' AND a.trabajador_id = $2))
  AND ($3::text IS NULL OR ac.estado = $3)
  AND ($4::date IS NULL OR ac.fecha >= $4)
`;

export const contarAcuerdos = async (client, { rol, usuarioId, estado, desde }) => {
  const query = `
    SELECT count(*)::int AS total
    FROM acuerdos_turno ac
    JOIN asignaciones_ruta a ON a.id = ac.asignacion_id
    JOIN rutas r ON r.id = a.ruta_id
    WHERE ${ACUERDO_VISIBLE};
  `;
  const { rows } = await client.query(query, [rol, usuarioId, estado, desde]);
  return rows[0].total;
};

export const listarAcuerdos = async (client, { rol, usuarioId, estado, desde, limite, desplazamiento }) => {
  const query = `
    SELECT ${COLUMNAS_ACUERDO}, a.trabajador_id, a.ruta_id
    FROM acuerdos_turno ac
    JOIN turnos t ON t.id = ac.turno_id
    JOIN asignaciones_ruta a ON a.id = ac.asignacion_id
    JOIN rutas r ON r.id = a.ruta_id
    WHERE ${ACUERDO_VISIBLE}
    ORDER BY ac.fecha, t.hora_inicio
    LIMIT $5 OFFSET $6;
  `;
  const { rows } = await client.query(query, [rol, usuarioId, estado, desde, limite, desplazamiento]);
  return rows;
};

export const listarTurnos = async (client) => {
  const query = `
    SELECT id, nombre, to_char(hora_inicio, 'HH24:MI') AS hora_inicio, to_char(hora_fin, 'HH24:MI') AS hora_fin,
           minutos_descanso, es_nocturno
    FROM turnos
    ORDER BY id;
  `;
  const { rows } = await client.query(query);
  return rows;
};

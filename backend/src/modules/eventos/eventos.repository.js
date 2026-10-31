// Consulta y atención de eventos (emergencias, etc.). Todas las funciones reciben el client de la transacción
// abierta por conClaims: el RLS de M008 limita las filas (trabajador: las suyas; supervisor: sus trabajadores).

const COLUMNAS = `
  e.id, e.trabajador_id, (SELECT p.nombres || ' ' || p.apellidos FROM perfiles p WHERE p.id = e.trabajador_id) AS trabajador_nombre,
  e.registro_tiempo_id, e.tipo_evento, e.origen, e.latitud::float AS latitud, e.longitud::float AS longitud,
  e.estado_atencion, e.atendido_por, e.atendido_at, e.payload, e.ocurrido_en, e.recibido_en
`;

// Filtros opcionales; desde y hasta son fechas de calendario en la zona de operación ($6)
const FILTROS = `
  ($1::text IS NULL OR e.estado_atencion = $1)
  AND ($2::text IS NULL OR e.tipo_evento = $2)
  AND ($3::uuid IS NULL OR e.trabajador_id = $3)
  AND ($4::date IS NULL OR e.ocurrido_en >= ($4::date)::timestamp AT TIME ZONE $6)
  AND ($5::date IS NULL OR e.ocurrido_en < ($5::date + 1)::timestamp AT TIME ZONE $6)
`;
const parametros = ({ estadoAtencion, tipoEvento, trabajadorId, desde, hasta, zona }) =>
  [estadoAtencion, tipoEvento, trabajadorId, desde, hasta, zona];

export const contarEventos = async (client, filtro) => {
  const { rows } = await client.query(`SELECT count(*)::int AS total FROM eventos_diarios e WHERE ${FILTROS};`, parametros(filtro));
  return rows[0].total;
};

// Primero los que esperan atención, y dentro de cada grupo los más recientes
export const listarEventos = async (client, filtro) => {
  const query = `
    SELECT ${COLUMNAS} FROM eventos_diarios e
    WHERE ${FILTROS}
    ORDER BY (e.estado_atencion IN ('ATENDIDO', 'DESCARTADO')), e.ocurrido_en DESC
    LIMIT $7 OFFSET $8;
  `;
  const { rows } = await client.query(query, [...parametros(filtro), filtro.limite, filtro.desplazamiento]);
  return rows;
};

export const buscarEvento = async (client, eventoId, { bloquear = false } = {}) => {
  const query = `SELECT ${COLUMNAS} FROM eventos_diarios e WHERE e.id = $1 ${bloquear ? 'FOR UPDATE' : ''};`;
  const { rows } = await client.query(query, [eventoId]);
  return rows[0];
};

// M006 solo deja actualizar estado_atencion, atendido_por y atendido_at
export const actualizarAtencion = async (client, eventoId, { estado, atendidoPor }) => {
  await client.query('UPDATE eventos_diarios SET estado_atencion = $2, atendido_por = $3, atendido_at = NOW() WHERE id = $1;',
    [eventoId, estado, atendidoPor]);
};

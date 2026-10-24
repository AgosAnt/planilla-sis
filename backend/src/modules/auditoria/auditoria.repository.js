// Bitácora append-only (D.3). Recibe el client de la transacción del cambio auditado, para que el registro
// y el cambio se confirmen o se deshagan juntos. Nunca se guardan contraseñas ni hashes.
export const registrarAuditoria = async (client, { actor, entidad, entidadId, accion, datosAntes = null, datosDespues = null }) => {
  const query = `
    INSERT INTO auditoria (actor_id, actor_rol, entidad, entidad_id, accion, datos_antes, datos_despues)
    VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb);
  `;
  await client.query(query, [
    actor.id,
    actor.rol,
    entidad,
    entidadId,
    accion,
    datosAntes && JSON.stringify(datosAntes),
    datosDespues && JSON.stringify(datosDespues),
  ]);
};

// Filtros de la consulta (todos opcionales). desde y hasta son fechas de calendario en la zona de operación ($7).
const FILTROS = `
  ($1::text IS NULL OR au.entidad = $1)
  AND ($2::text IS NULL OR au.entidad_id = $2)
  AND ($3::uuid IS NULL OR au.actor_id = $3)
  AND ($4::text IS NULL OR au.accion = $4)
  AND ($5::date IS NULL OR au.ocurrido_en >= ($5::date)::timestamp AT TIME ZONE $7)
  AND ($6::date IS NULL OR au.ocurrido_en < ($6::date + 1)::timestamp AT TIME ZONE $7)
`;

const parametros = ({ entidad, entidadId, actorId, accion, desde, hasta, zona }) =>
  [entidad, entidadId, actorId, accion, desde, hasta, zona];

export const contarAuditoria = async (client, filtro) => {
  const query = `SELECT count(*)::int AS total FROM auditoria au WHERE ${FILTROS};`;
  const { rows } = await client.query(query, parametros(filtro));
  return rows[0].total;
};

// Más recientes primero; incluye el nombre de quién hizo el cambio.
export const listarAuditoria = async (client, filtro) => {
  const query = `
    SELECT au.id, au.ocurrido_en, au.actor_id, p.nombres || ' ' || p.apellidos AS actor_nombre, au.actor_rol,
           au.entidad, au.entidad_id, au.accion, au.datos_antes, au.datos_despues
    FROM auditoria au
    LEFT JOIN perfiles p ON p.id = au.actor_id
    WHERE ${FILTROS}
    ORDER BY au.ocurrido_en DESC, au.id DESC
    LIMIT $8 OFFSET $9;
  `;
  const { rows } = await client.query(query, [...parametros(filtro), filtro.limite, filtro.desplazamiento]);
  return rows;
};

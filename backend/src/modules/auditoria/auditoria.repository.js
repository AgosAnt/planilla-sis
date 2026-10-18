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

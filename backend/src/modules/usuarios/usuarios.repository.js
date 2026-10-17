// Todas las funciones reciben el client de la transacción abierta por conClaims.

export const buscarIdRol = async (client, nombreRol) => {
  const { rows } = await client.query('SELECT id FROM roles WHERE nombre = $1;', [nombreRol]);
  return rows[0]?.id;
};

export const crearPerfil = async (client, { email, passwordHash, rolId, codigoEmpleado, nombres, apellidos, documento }) => {
  const query = `
    INSERT INTO perfiles (email, password_hash, rol_id, codigo_empleado, nombres, apellidos, documento, debe_cambiar_password)
    VALUES ($1, $2, $3, $4, $5, $6, $7, true)
    RETURNING id, email, codigo_empleado, nombres, apellidos, documento, debe_cambiar_password;
  `;
  const { rows } = await client.query(query, [email, passwordHash, rolId, codigoEmpleado, nombres, apellidos, documento]);
  return rows[0];
};

// Bitácora append-only (D.3). Nunca se guarda la contraseña ni su hash.
export const registrarAuditoria = async (client, { actor, entidad, entidadId, accion, datosDespues }) => {
  const query = `
    INSERT INTO auditoria (actor_id, actor_rol, entidad, entidad_id, accion, datos_despues)
    VALUES ($1, $2, $3, $4, $5, $6::jsonb);
  `;
  await client.query(query, [actor.id, actor.rol, entidad, entidadId, accion, JSON.stringify(datosDespues)]);
};

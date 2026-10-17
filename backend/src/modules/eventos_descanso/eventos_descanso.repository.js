// Todas las funciones reciben el client de la transacción abierta por conClaims (RLS de M008).

export const buscarRegistroDelTrabajador = async (client, registroId, trabajadorId) => {
  const query = `
    SELECT id, ingreso_at, salida_at, estado_validacion
    FROM registros_tiempo
    WHERE id = $1 AND trabajador_id = $2;
  `;
  const { rows } = await client.query(query, [registroId, trabajadorId]);
  return rows[0];
};

// Bloquea el registro padre para que dos descansos simultáneos no se solapen.
export const bloquearRegistro = async (client, registroId) => {
  const query = `SELECT id FROM registros_tiempo WHERE id = $1 FOR UPDATE;`;
  const { rows } = await client.query(query, [registroId]);
  return rows[0];
};

export const existeTipoDescanso = async (client, tipoId) => {
  const { rowCount } = await client.query('SELECT 1 FROM tipos_descanso WHERE id = $1;', [tipoId]);
  return rowCount > 0;
};

export const buscarPorClientUuid = async (client, registroId, clientUuid) => {
  const query = `
    SELECT id, registro_tiempo_id, tipo_id, inicio_at, fin_at
    FROM descansos
    WHERE registro_tiempo_id = $1 AND client_uuid = $2;
  `;
  const { rows } = await client.query(query, [registroId, clientUuid]);
  return rows[0];
};

export const existeSolapamiento = async (client, registroId, inicioAt, finAt) => {
  const query = `
    SELECT 1
    FROM descansos
    WHERE registro_tiempo_id = $1
      AND tstzrange(inicio_at, COALESCE(fin_at, 'infinity')) && tstzrange($2, $3)
    LIMIT 1;
  `;
  const { rowCount } = await client.query(query, [registroId, inicioAt, finAt]);
  return rowCount > 0;
};

export const crearDescanso = async (client, { registroId, clientUuid, tipoId, inicioAt, finAt }) => {
  const query = `
    INSERT INTO descansos (registro_tiempo_id, client_uuid, tipo_id, inicio_at, fin_at)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (registro_tiempo_id, client_uuid) DO NOTHING
    RETURNING id, registro_tiempo_id, tipo_id, inicio_at, fin_at;
  `;
  const { rows } = await client.query(query, [registroId, clientUuid, tipoId, inicioAt, finAt]);
  return rows[0];
};

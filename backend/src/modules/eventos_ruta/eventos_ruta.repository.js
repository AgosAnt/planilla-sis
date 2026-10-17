// Todas las funciones reciben el client de la transacción abierta por conClaims (RLS de M008).

export const buscarIdPorClientUuid = async (client, trabajadorId, clientUuid) => {
  const query = `SELECT id FROM eventos_diarios WHERE trabajador_id = $1 AND client_uuid = $2;`;
  const { rows } = await client.query(query, [trabajadorId, clientUuid]);
  return rows[0]?.id;
};

export const existeRegistroDelTrabajador = async (client, registroId, trabajadorId) => {
  const query = `SELECT 1 FROM registros_tiempo WHERE id = $1 AND trabajador_id = $2;`;
  const { rowCount } = await client.query(query, [registroId, trabajadorId]);
  return rowCount > 0;
};

// Devuelve el id creado, o undefined si (trabajador_id, client_uuid) ya existía.
export const crearEvento = async (client, evento) => {
  const query = `
    INSERT INTO eventos_diarios
      (client_uuid, trabajador_id, registro_tiempo_id, tipo_evento, origen,
       latitud, longitud, esquema_version, payload, ocurrido_en)
    VALUES ($1, $2, $3, $4, 'MOVIL', $5, $6, $7, $8::jsonb, $9)
    ON CONFLICT (trabajador_id, client_uuid) DO NOTHING
    RETURNING id;
  `;
  const { rows } = await client.query(query, [
    evento.clientUuid,
    evento.trabajadorId,
    evento.registroTiempoId,
    evento.tipoEvento,
    evento.latitud,
    evento.longitud,
    evento.esquemaVersion,
    JSON.stringify(evento.payload),
    evento.ocurridoEn,
  ]);
  return rows[0]?.id;
};

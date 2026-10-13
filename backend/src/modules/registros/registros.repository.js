const db = require('../../config/db');

class RegistrosRepository {
  async registrarIngreso({ trabajador_id, asignacion_id, ingreso_at, client_uuid, lat, lng }) {
    // Manejo de idempotencia vía client_uuid
    const queryCheck = `SELECT id, estado_validacion FROM registros_tiempo WHERE trabajador_id = $1 AND client_uuid = $2`;
    const check = await db.query(queryCheck, [trabajador_id, client_uuid]);
    if (check.rows.length > 0) {
      return { data: check.rows[0], repetido: true };
    }

    const query = `
      INSERT INTO registros_tiempo (trabajador_id, asignacion_id, ingreso_at, client_uuid, latitud, longitud, estado_validacion)
      VALUES ($1, $2, $3, $4, $5, $6, 'PENDIENTE')
      RETURNING id, estado_validacion;
    `;
    const { rows } = await db.query(query, [trabajador_id, asignacion_id, ingreso_at, client_uuid, lat, lng]);
    return { data: rows[0], repetido: false };
  }

  async registrarDescanso({ registro_tiempo_id, tipo_id, inicio_at, fin_at }) {
    const query = `
      INSERT INTO descansos (registro_tiempo_id, tipo_id, inicio_at, fin_at)
      VALUES ($1, $2, $3, $4)
      RETURNING id, inicio_at, fin_at;
    `;
    const { rows } = await db.query(query, [registro_tiempo_id, tipo_id, inicio_at, fin_at]);
    return rows[0];
  }

  async registrarSalida({ id, salida_at }) {
    const query = `
      UPDATE registros_tiempo
      SET salida_at = $2
      WHERE id = $1
      RETURNING id, ingreso_at, salida_at;
    `;
    const { rows } = await db.query(query, [id, salida_at]);
    return rows[0];
  }

  async guardarEventoBatch({ trabajador_id, client_uuid, tipo_evento, ocurrido_en, latitud, longitud, payload }) {
    const queryCheck = `SELECT id FROM eventos_diarios WHERE trabajador_id = $1 AND client_uuid = $2`;
    const check = await db.query(queryCheck, [trabajador_id, client_uuid]);
    if (check.rows.length > 0) {
      return { client_uuid, estado: 'DUPLICADO' };
    }

    const query = `
      INSERT INTO eventos_diarios (trabajador_id, client_uuid, tipo_evento, ocurrido_en, latitud, longitud, payload, origen, estado_atencion)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'MOVIL', 'PENDIENTE_REVISION')
      RETURNING id;
    `;
    const { rows } = await db.query(query, [trabajador_id, client_uuid, tipo_evento, ocurrido_en, latitud, longitud, JSON.stringify(payload || {})]);
    return { client_uuid, estado: 'CREADO', id: rows[0].id };
  }
}

module.exports = new RegistrosRepository();
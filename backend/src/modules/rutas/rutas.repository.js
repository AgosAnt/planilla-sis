const db = require('../../config/db');

class RutasRepository {
  async crearAsignacion({ ruta_id, trabajador_id, fecha_inicio, fecha_fin, asignado_por }) {
    const query = `
      INSERT INTO asignaciones_ruta (ruta_id, trabajador_id, fecha_inicio, fecha_fin, asignado_por, activa)
      VALUES ($1, $2, $3, $4, $5, true)
      RETURNING id, ruta_id, trabajador_id, activa;
    `;
    const { rows } = await db.query(query, [ruta_id, trabajador_id, fecha_inicio, fecha_fin, asignado_por]);
    return rows[0];
  }

  async crearAcuerdoTurno({ asignacion_id, turno_id, fecha }) {
    const query = `
      INSERT INTO acuerdos_turno (asignacion_id, turno_id, fecha, estado)
      VALUES ($1, $2, $3, 'PROPUESTO')
      RETURNING id, estado;
    `;
    const { rows } = await db.query(query, [asignacion_id, turno_id, fecha]);
    return rows[0];
  }

  async confirmarAcuerdo(acuerdoId, confirmadoPor) {
    const query = `
      UPDATE acuerdos_turno
      SET estado = 'CONFIRMADO', confirmado_por = $2, confirmado_at = NOW()
      WHERE id = $1
      RETURNING id, estado, confirmado_at;
    `;
    const { rows } = await db.query(query, [acuerdoId, confirmadoPor]);
    return rows[0];
  }
}

module.exports = new RutasRepository();
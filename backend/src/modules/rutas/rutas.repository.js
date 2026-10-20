import { conClaims } from '../../config/db.js';

export async function cerrarAsignacion(usuario, asignacionId, fechaFin, activa) {
  return await conClaims(usuario, async (client) => {
    const res = await client.query(
      `UPDATE asignaciones_rutas 
       SET fecha_fin = COALESCE($1, fecha_fin), 
           activa = COALESCE($2, activa)
       WHERE id = $3
       RETURNING *`,
      [fechaFin, activa, asignacionId]
    );
    return res.rows[0] || null;
  });
}

export async function proponerAcuerdoTurno(usuario, asignacionId, fecha, turnoId) {
  return await conClaims(usuario, async (client) => {
    const res = await client.query(
      `INSERT INTO acuerdos_turno (asignacion_id, fecha, turno_id, estado)
       VALUES ($1, $2, $3, 'PROPUESTO')
       RETURNING *`,
      [asignacionId, fecha, turnoId]
    );
    return res.rows[0];
  });
}

export async function obtenerCatalogosTurnos(usuario) {
  return await conClaims(usuario, async (client) => {
    const res = await client.query(`SELECT id, codigo, nombre, hora_inicio, hora_fin FROM turnos ORDER BY hora_inicio ASC`);
    return res.rows;
  });
}

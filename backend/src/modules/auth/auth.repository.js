import pool from '../../config/db.js';

// Campos del schema Usuario del contrato; el nombre del rol vive en la tabla roles (M002).
const COLUMNAS = 'p.id, p.email, p.nombres, p.apellidos, p.debe_cambiar_password, r.nombre AS rol';

export const buscarActivoPorEmail = async (email) => {
  const query = `
    SELECT ${COLUMNAS}, p.password_hash
    FROM perfiles p
    JOIN roles r ON r.id = p.rol_id
    WHERE p.email = $1 AND p.activo;
  `;
  const { rows } = await pool.query(query, [email]);
  return rows[0];
};

// Asignación activa y vigente hoy (fecha en la zona de operación) con su ruta y el turno acordado del día.
// La restricción sin_solapamiento_asignaciones (M003) garantiza que haya como máximo una.
export const buscarAsignacionVigente = async (trabajadorId, zona) => {
  const query = `
    SELECT a.id, a.fecha_inicio::text AS fecha_inicio, a.fecha_fin::text AS fecha_fin,
           r.id AS ruta_id, r.codigo AS ruta_codigo, r.nombre AS ruta_nombre,
           t.nombre AS turno_nombre,
           to_char(t.hora_inicio, 'HH24:MI') AS turno_hora_inicio,
           to_char(t.hora_fin, 'HH24:MI') AS turno_hora_fin
    FROM asignaciones_ruta a
    JOIN rutas r ON r.id = a.ruta_id
    LEFT JOIN acuerdos_turno ac ON ac.asignacion_id = a.id
      AND ac.fecha = (NOW() AT TIME ZONE $2)::date
      AND ac.estado IN ('ACEPTADO', 'CONFIRMADO')
    LEFT JOIN turnos t ON t.id = ac.turno_id
    WHERE a.trabajador_id = $1 AND a.activa
      AND a.fecha_inicio <= (NOW() AT TIME ZONE $2)::date
      AND (a.fecha_fin IS NULL OR a.fecha_fin >= (NOW() AT TIME ZONE $2)::date)
    LIMIT 1;
  `;
  const { rows } = await pool.query(query, [trabajadorId, zona]);
  return rows[0];
};

export const buscarActivoPorId = async (id) => {
  const query = `
    SELECT ${COLUMNAS}
    FROM perfiles p
    JOIN roles r ON r.id = p.rol_id
    WHERE p.id = $1 AND p.activo;
  `;
  const { rows } = await pool.query(query, [id]);
  return rows[0];
};

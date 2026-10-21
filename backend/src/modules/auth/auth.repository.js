import pool from '../../config/db.js';

// Campos del schema Usuario del contrato; el nombre del rol vive en la tabla roles (M002).
const COLUMNAS = 'p.id, p.email, p.nombres, p.apellidos, p.debe_cambiar_password, r.nombre AS rol';

export const buscarActivoPorEmail = async (email) => {
  const query = `
    SELECT ${COLUMNAS}, p.password_hash, p.bloqueado_hasta
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

// Para reautenticar o cambiar la contraseña del usuario de la sesión.
export const buscarCredencialesPorId = async (id) => {
  const query = `
    SELECT p.id, p.email, p.password_hash, p.bloqueado_hasta
    FROM perfiles p
    WHERE p.id = $1 AND p.activo;
  `;
  const { rows } = await pool.query(query, [id]);
  return rows[0];
};

// Suma un intento fallido y, desde el intento $2, bloquea 2^(intentos - $2) minutos, con tope de $3.
// Se calcula en un solo UPDATE para que dos intentos simultáneos no pierdan la cuenta.
export const registrarIntentoFallido = async (id, intentosAntesDeBloqueo, bloqueoMaximoMin) => {
  const query = `
    UPDATE perfiles
    SET intentos_fallidos = LEAST(intentos_fallidos + 1, 1000),
        bloqueado_hasta = CASE
          WHEN intentos_fallidos + 1 >= $2
          THEN NOW() + make_interval(mins => LEAST(power(2, LEAST(intentos_fallidos + 1 - $2, 10)), $3)::int)
          ELSE bloqueado_hasta
        END
    WHERE id = $1
    RETURNING intentos_fallidos, bloqueado_hasta;
  `;
  const { rows } = await pool.query(query, [id, intentosAntesDeBloqueo, bloqueoMaximoMin]);
  return rows[0];
};

export const reiniciarIntentos = async (id) => {
  const query = `
    UPDATE perfiles SET intentos_fallidos = 0, bloqueado_hasta = NULL
    WHERE id = $1 AND (intentos_fallidos <> 0 OR bloqueado_hasta IS NOT NULL);
  `;
  await pool.query(query, [id]);
};

// Cambio de contraseña: también quita la marca de contraseña temporal y el bloqueo.
export const actualizarPassword = async (client, id, passwordHash) => {
  const query = `
    UPDATE perfiles
    SET password_hash = $2, debe_cambiar_password = false, intentos_fallidos = 0, bloqueado_hasta = NULL
    WHERE id = $1 AND activo;
  `;
  const { rowCount } = await client.query(query, [id, passwordHash]);
  return rowCount === 1;
};

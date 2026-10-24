import pool from '../../config/db.js';

// Con el RLS de M010, app_user sin claims no ve perfiles. Antes de tener sesión (login y contador de intentos) se usan
// funciones SECURITY DEFINER de M010; el resto recibe el client de la transacción abierta por conClaims.

// Campos del schema Usuario del contrato; el nombre del rol vive en la tabla roles (M002).
const COLUMNAS = 'p.id, p.email, p.nombres, p.apellidos, p.debe_cambiar_password, r.nombre AS rol';

// Login: datos del perfil activo, con el hash y el bloqueo (app.credenciales_por_email, M010).
export const buscarActivoPorEmail = async (email) => {
  const { rows } = await pool.query('SELECT * FROM app.credenciales_por_email($1);', [email]);
  return rows[0];
};

// Un acierto reinicia el contador; un fallo lo suma, bloquea según los umbrales y audita el bloqueo
// (app.registrar_resultado_login, M010). Devuelve { intentos_fallidos, bloqueado_hasta }.
export const registrarResultadoLogin = async (perfilId, exito, intentosAntesDeBloqueo, bloqueoMaximoMin) => {
  const query = 'SELECT * FROM app.registrar_resultado_login($1, $2, $3, $4);';
  const { rows } = await pool.query(query, [perfilId, exito, intentosAntesDeBloqueo, bloqueoMaximoMin]);
  return rows[0];
};

// Asignación activa y vigente hoy (fecha en la zona de operación) con su ruta y el turno acordado del día.
// La restricción sin_solapamiento_asignaciones (M003) garantiza que haya como máximo una.
export const buscarAsignacionVigente = async (client, trabajadorId, zona) => {
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
  const { rows } = await client.query(query, [trabajadorId, zona]);
  return rows[0];
};

export const buscarActivoPorId = async (client, id) => {
  const query = `
    SELECT ${COLUMNAS}
    FROM perfiles p
    JOIN roles r ON r.id = p.rol_id
    WHERE p.id = $1 AND p.activo;
  `;
  const { rows } = await client.query(query, [id]);
  return rows[0];
};

// Para reautenticar o cambiar la contraseña del usuario de la sesión (el RLS solo le deja ver su propio perfil).
export const buscarCredencialesPorId = async (client, id) => {
  const query = `
    SELECT p.id, p.email, p.password_hash, p.bloqueado_hasta
    FROM perfiles p
    WHERE p.id = $1 AND p.activo;
  `;
  const { rows } = await client.query(query, [id]);
  return rows[0];
};

// Cambio de contraseña propia: también quita la marca de contraseña temporal y el bloqueo (app.cambiar_password, M010).
export const actualizarPassword = async (client, id, passwordHash) => {
  const { rows } = await client.query('SELECT app.cambiar_password($1, $2) AS actualizado;', [id, passwordHash]);
  return rows[0].actualizado;
};

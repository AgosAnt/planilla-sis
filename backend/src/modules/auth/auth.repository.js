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

// Puntos de la geocerca de la ruta (ruta_puntos, M003), en su orden. La app móvil los usa para decidir
// si deja marcar; el servidor vuelve a calcularlo al recibir el ingreso (dentro_de_geocerca).
export const buscarPuntosRuta = async (client, rutaId) => {
  const query = `
    SELECT nombre, latitud::float8 AS latitud, longitud::float8 AS longitud, radio_m
    FROM ruta_puntos
    WHERE ruta_id = $1
    ORDER BY orden;
  `;
  const { rows } = await client.query(query, [rutaId]);
  return rows;
};

// Jornada sin salida del trabajador (el índice registros_uno_abierto, M004, garantiza que haya como máximo una).
// Con ella la app de un teléfono nuevo o reinstalado sabe que el turno sigue abierto.
export const buscarJornadaAbierta = async (client, trabajadorId) => {
  const query = `
    SELECT id, ingreso_at
    FROM registros_tiempo
    WHERE trabajador_id = $1 AND salida_at IS NULL
    LIMIT 1;
  `;
  const { rows } = await client.query(query, [trabajadorId]);
  return rows[0] ?? null;
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

// Sesión nueva al iniciar sesión (sesiones_refresh, M002 y M011). La primera fila abre la familia: id = familia_id.
// Corre dentro de conClaims del usuario que acaba de autenticarse (política sesiones_propias, M010).
// Solo se guarda el hash del refresh token, nunca el token.
export const crearSesionRefresh = async (client, { id, perfilId, tokenHash, expiraAt, ip, userAgent }) => {
  const query = `
    INSERT INTO sesiones_refresh (id, familia_id, perfil_id, token_hash, expira_at, ip, user_agent)
    VALUES ($1, $1, $2, $3, $4, $5, $6);
  `;
  await client.query(query, [id, perfilId, tokenHash, expiraAt, ip, userAgent]);
};

// POST /auth/refresh: sin sesión, así que pasa por app.rotar_sesion_refresh (M011). Devuelve
// { resultado, perfil_id, familia_id, email, nombres, apellidos, rol, debe_cambiar_password }.
export const rotarSesionRefresh = async ({ tokenHash, nuevoHash, expiraAt, graciaSeg, ip, userAgent }) => {
  const query = 'SELECT * FROM app.rotar_sesion_refresh($1, $2, $3, $4, $5, $6);';
  const { rows } = await pool.query(query, [tokenHash, nuevoHash, expiraAt, graciaSeg, ip, userAgent]);
  return rows[0];
};

// Logout: revoca la sesión (toda la familia) del usuario de la sesión
export const revocarFamilia = async (client, familiaId) => {
  await client.query('UPDATE sesiones_refresh SET revocado_at = NOW() WHERE familia_id = $1 AND revocado_at IS NULL;', [familiaId]);
};

// Cambio de contraseña: revoca todas las sesiones del usuario, en todos sus dispositivos
export const revocarSesionesDe = async (client, perfilId) => {
  await client.query('UPDATE sesiones_refresh SET revocado_at = NOW() WHERE perfil_id = $1 AND revocado_at IS NULL;', [perfilId]);
};

// Cambio de contraseña propia: también quita la marca de contraseña temporal y el bloqueo (app.cambiar_password, M010).
export const actualizarPassword = async (client, id, passwordHash) => {
  const { rows } = await client.query('SELECT app.cambiar_password($1, $2) AS actualizado;', [id, passwordHash]);
  return rows[0].actualizado;
};

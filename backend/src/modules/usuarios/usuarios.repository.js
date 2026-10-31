// Todas las funciones reciben el client de la transacción abierta por conClaims.

// Datos que ve el administrador. Nunca password_hash ni mfa_secret.
const COLUMNAS_ADMIN = `
  p.id, p.email, p.nombres, p.apellidos, r.nombre AS rol, p.codigo_empleado, p.documento, p.activo,
  p.debe_cambiar_password, COALESCE(p.bloqueado_hasta > NOW(), false) AS bloqueado, p.creado_at
`;

// $1 = rol, $2 = activo, $3 = patrón de búsqueda (ILIKE) o null
const FILTROS = `
  ($1::text IS NULL OR r.nombre = $1)
  AND ($2::boolean IS NULL OR p.activo = $2)
  AND ($3::text IS NULL OR (p.nombres || ' ' || p.apellidos) ILIKE $3 OR p.email ILIKE $3 OR p.codigo_empleado ILIKE $3)
`;

// El texto buscado se toma literal: %, _ y \ no funcionan como comodines
const patron = (buscar) => (buscar ? `%${buscar.replace(/[\\%_]/g, '\\$&')}%` : null);

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

export const contarUsuarios = async (client, { rol, activo, buscar }) => {
  const query = `SELECT count(*)::int AS total FROM perfiles p JOIN roles r ON r.id = p.rol_id WHERE ${FILTROS};`;
  const { rows } = await client.query(query, [rol, activo, patron(buscar)]);
  return rows[0].total;
};

export const listarUsuarios = async (client, { rol, activo, buscar, limite, desplazamiento }) => {
  const query = `
    SELECT ${COLUMNAS_ADMIN}
    FROM perfiles p JOIN roles r ON r.id = p.rol_id
    WHERE ${FILTROS}
    ORDER BY p.apellidos, p.nombres
    LIMIT $4 OFFSET $5;
  `;
  const { rows } = await client.query(query, [rol, activo, patron(buscar), limite, desplazamiento]);
  return rows;
};

// bloquear = true para leer antes de un UPDATE dentro de la misma transacción.
export const buscarUsuario = async (client, id, { bloquear = false } = {}) => {
  const query = `
    SELECT ${COLUMNAS_ADMIN}
    FROM perfiles p JOIN roles r ON r.id = p.rol_id
    WHERE p.id = $1
    ${bloquear ? 'FOR UPDATE OF p' : ''};
  `;
  const { rows } = await client.query(query, [id]);
  return rows[0];
};

export const actualizarUsuario = async (client, id, { nombres, apellidos, rolId, activo, codigoEmpleado, documento }) => {
  const query = `
    UPDATE perfiles
    SET nombres = $2, apellidos = $3, rol_id = $4, activo = $5, codigo_empleado = $6, documento = $7
    WHERE id = $1;
  `;
  await client.query(query, [id, nombres, apellidos, rolId, activo, codigoEmpleado, documento]);
};

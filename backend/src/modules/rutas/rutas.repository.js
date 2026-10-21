// Todas las funciones reciben el client de la transacción abierta por conClaims.

const COLUMNAS = 'r.id, r.codigo, r.nombre, r.descripcion, r.supervisor_id, r.activa, r.creado_at';

// Visibilidad por rol (D.4): administrador ve todas; supervisor, las que supervisa;
// trabajador, las rutas donde tiene una asignación activa. $1 = rol, $2 = perfiles.id
const VISIBLE_PARA = `
  ($1 = 'administrador'
   OR ($1 = 'supervisor' AND r.supervisor_id = $2)
   OR ($1 = 'trabajador' AND EXISTS (
         SELECT 1 FROM asignaciones_ruta a
         WHERE a.ruta_id = r.id AND a.trabajador_id = $2 AND a.activa)))
`;

export const contarRutas = async (client, { rol, usuarioId }) => {
  const query = `SELECT count(*)::int AS total FROM rutas r WHERE ${VISIBLE_PARA};`;
  const { rows } = await client.query(query, [rol, usuarioId]);
  return rows[0].total;
};

export const listarRutas = async (client, { rol, usuarioId, limite, desplazamiento }) => {
  const query = `
    SELECT ${COLUMNAS}
    FROM rutas r
    WHERE ${VISIBLE_PARA}
    ORDER BY r.codigo
    LIMIT $3 OFFSET $4;
  `;
  const { rows } = await client.query(query, [rol, usuarioId, limite, desplazamiento]);
  return rows;
};

// bloquear = true para leer antes de un UPDATE dentro de la misma transacción.
export const buscarRuta = async (client, { rol, usuarioId, rutaId, bloquear = false }) => {
  const query = `
    SELECT ${COLUMNAS}
    FROM rutas r
    WHERE r.id = $3 AND ${VISIBLE_PARA}
    ${bloquear ? 'FOR UPDATE' : ''};
  `;
  const { rows } = await client.query(query, [rol, usuarioId, rutaId]);
  return rows[0];
};

export const esSupervisorActivo = async (client, perfilId) => {
  const query = `
    SELECT 1
    FROM perfiles p
    JOIN roles ro ON ro.id = p.rol_id
    WHERE p.id = $1 AND p.activo AND ro.nombre = 'supervisor';
  `;
  const { rowCount } = await client.query(query, [perfilId]);
  return rowCount > 0;
};

export const crearRuta = async (client, { codigo, nombre, descripcion, supervisorId, activa }) => {
  const query = `
    INSERT INTO rutas (codigo, nombre, descripcion, supervisor_id, activa)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, codigo, nombre, descripcion, supervisor_id, activa, creado_at;
  `;
  const { rows } = await client.query(query, [codigo, nombre, descripcion, supervisorId, activa]);
  return rows[0];
};

export const actualizarRuta = async (client, rutaId, { codigo, nombre, descripcion, supervisorId, activa }) => {
  const query = `
    UPDATE rutas
    SET codigo = $2, nombre = $3, descripcion = $4, supervisor_id = $5, activa = $6
    WHERE id = $1
    RETURNING id, codigo, nombre, descripcion, supervisor_id, activa, creado_at;
  `;
  const { rows } = await client.query(query, [rutaId, codigo, nombre, descripcion, supervisorId, activa]);
  return rows[0];
};

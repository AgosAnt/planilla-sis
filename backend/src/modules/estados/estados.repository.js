// Estados del trabajador (M007). Todas las funciones reciben el client de la transacción abierta por conClaims.

export const listarEstados = async (client) => {
  const { rows } = await client.query('SELECT id, codigo, nombre FROM estados_trabajador ORDER BY id;');
  return rows;
};

export const listarTiposDescanso = async (client) => {
  const { rows } = await client.query('SELECT id, nombre, remunerado FROM tipos_descanso ORDER BY id;');
  return rows;
};

export const buscarEstadoPorCodigo = async (client, codigo) => {
  const { rows } = await client.query('SELECT id, codigo, nombre FROM estados_trabajador WHERE codigo = $1;', [codigo]);
  return rows[0];
};

export const esTrabajador = async (client, perfilId) => {
  const query = `SELECT 1 FROM perfiles p JOIN roles r ON r.id = p.rol_id WHERE p.id = $1 AND r.nombre = 'trabajador';`;
  const { rowCount } = await client.query(query, [perfilId]);
  return rowCount > 0;
};

const COLUMNAS = `
  h.id, h.trabajador_id, json_build_object('id', e.id, 'codigo', e.codigo, 'nombre', e.nombre) AS estado,
  h.inicio_at, h.fin_at, h.motivo, h.cambiado_por
`;

// Estado vigente: el intervalo sin fin (la restricción sin_solapamiento_estados garantiza que haya uno como máximo)
export const estadoActual = async (client, trabajadorId, { bloquear = false } = {}) => {
  const query = `
    SELECT ${COLUMNAS} FROM historial_estado_trabajador h JOIN estados_trabajador e ON e.id = h.estado_id
    WHERE h.trabajador_id = $1 AND h.fin_at IS NULL
    ${bloquear ? 'FOR UPDATE OF h' : ''};
  `;
  const { rows } = await client.query(query, [trabajadorId]);
  return rows[0];
};

export const contarHistorial = async (client, trabajadorId) => {
  const { rows } = await client.query('SELECT count(*)::int AS total FROM historial_estado_trabajador WHERE trabajador_id = $1;', [trabajadorId]);
  return rows[0].total;
};

export const listarHistorial = async (client, trabajadorId, { limite, desplazamiento }) => {
  const query = `
    SELECT ${COLUMNAS} FROM historial_estado_trabajador h JOIN estados_trabajador e ON e.id = h.estado_id
    WHERE h.trabajador_id = $1
    ORDER BY h.inicio_at DESC
    LIMIT $2 OFFSET $3;
  `;
  const { rows } = await client.query(query, [trabajadorId, limite, desplazamiento]);
  return rows;
};

export const cerrarEstado = async (client, historialId, finAt) => {
  await client.query('UPDATE historial_estado_trabajador SET fin_at = $2 WHERE id = $1;', [historialId, finAt]);
};

export const crearEstado = async (client, { trabajadorId, estadoId, inicioAt, motivo, cambiadoPor }) => {
  const query = `
    INSERT INTO historial_estado_trabajador (trabajador_id, estado_id, inicio_at, motivo, cambiado_por)
    VALUES ($1, $2, $3, $4, $5) RETURNING id;
  `;
  const { rows } = await client.query(query, [trabajadorId, estadoId, inicioAt, motivo, cambiadoPor]);
  return rows[0].id;
};

export const buscarHistorial = async (client, historialId) => {
  const query = `SELECT ${COLUMNAS} FROM historial_estado_trabajador h JOIN estados_trabajador e ON e.id = h.estado_id WHERE h.id = $1;`;
  const { rows } = await client.query(query, [historialId]);
  return rows[0];
};

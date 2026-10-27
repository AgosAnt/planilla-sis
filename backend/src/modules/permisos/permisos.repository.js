// Todas las funciones reciben el client de la transacción abierta por conClaims (RLS de M010: solo lectura).

// Catálogo de M007 con los roles que tiene cada permiso
export const listarPermisos = async (client) => {
  const query = `
    SELECT p.codigo, p.descripcion,
           COALESCE(array_agg(r.nombre ORDER BY r.id) FILTER (WHERE r.id IS NOT NULL), '{}') AS roles
    FROM permisos p
    LEFT JOIN rol_permiso rp ON rp.permiso_id = p.id
    LEFT JOIN roles r ON r.id = rp.rol_id
    GROUP BY p.id
    ORDER BY p.id;
  `;
  const { rows } = await client.query(query);
  return rows;
};

export const permisosDeRol = async (client, rol) => {
  const query = `
    SELECT r.nombre AS rol, p.codigo AS permiso_codigo, p.descripcion
    FROM rol_permiso rp
    JOIN roles r ON r.id = rp.rol_id
    JOIN permisos p ON p.id = rp.permiso_id
    WHERE r.nombre = $1
    ORDER BY p.id;
  `;
  const { rows } = await client.query(query, [rol]);
  return rows;
};

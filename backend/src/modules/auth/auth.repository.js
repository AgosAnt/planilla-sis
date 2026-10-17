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

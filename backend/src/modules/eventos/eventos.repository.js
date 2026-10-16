import pool from '../../config/db.js';

export const obtenerEventos = async () => {
  const query = `
    SELECT id_evento, id_jornada, tipo_evento, descripcion, fecha_creacion
    FROM eventos
    ORDER BY id_evento DESC;
  `;
  const { rows } = await pool.query(query);
  return rows;
};

export const obtenerEventosPorJornada = async (idJornada) => {
  const query = `
    SELECT id_evento, id_jornada, tipo_evento, descripcion, fecha_creacion
    FROM eventos
    WHERE id_jornada = $1
    ORDER BY id_evento DESC;
  `;
  const { rows } = await pool.query(query, [parseInt(idJornada, 10)]);
  return rows;
};

export const crearEvento = async ({ idJornada, tipoEvento, descripcion }) => {
  const query = `
    INSERT INTO eventos (id_jornada, tipo_evento, descripcion)
    VALUES ($1, $2, $3)
    RETURNING id_evento, id_jornada, tipo_evento, descripcion, fecha_creacion;
  `;
  const { rows } = await pool.query(query, [
    parseInt(idJornada, 10),
    tipoEvento,
    descripcion || null,
  ]);
  return rows[0];
};
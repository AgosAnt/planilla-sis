import pool from '../../config/db.js';

export const obtenerRegistros = async () => {
  const query = `
    SELECT id_jornada, id_usuario, id_ruta, fecha, hora_entrada, hora_salida, estado 
    FROM jornadas 
    ORDER BY id_jornada DESC 
    LIMIT 20;
  `;
  const { rows } = await pool.query(query);
  return rows;
};

export const buscarJornadaPorId = async (idJornada) => {
  const query = `SELECT * FROM jornadas WHERE id_jornada = $1;`;
  const { rows } = await pool.query(query, [parseInt(idJornada, 10)]);
  return rows[0];
};

export const buscarJornadaActivaPorUsuario = async (usuarioId) => {
  const query = `
    SELECT * FROM jornadas 
    WHERE id_usuario = $1 AND estado = 'ACTIVA' 
    LIMIT 1;
  `;
  const { rows } = await pool.query(query, [parseInt(usuarioId, 10)]);
  return rows[0];
};

export const crearIngreso = async (usuarioId) => {
  const query = `
    INSERT INTO jornadas (id_usuario, fecha, hora_entrada, estado)
    VALUES ($1, CURRENT_DATE, CURRENT_TIMESTAMP, 'ACTIVA')
    RETURNING id_jornada, id_usuario, fecha, hora_entrada, estado;
  `;
  const { rows } = await pool.query(query, [parseInt(usuarioId, 10)]);
  return rows[0];
};

export const registrarSalida = async (idJornada) => {
  const query = `
    UPDATE jornadas 
    SET hora_salida = CURRENT_TIMESTAMP, 
        estado = 'FINALIZADA'
    WHERE id_jornada = $1
    RETURNING id_jornada, id_usuario, id_ruta, fecha, hora_entrada, hora_salida, estado;
  `;
  const { rows } = await pool.query(query, [parseInt(idJornada, 10)]);
  return rows[0];
};

export const actualizarRutaEnJornada = async (idJornada, idRuta) => {
  const query = `
    UPDATE jornadas 
    SET id_ruta = $2
    WHERE id_jornada = $1
    RETURNING id_jornada, id_usuario, id_ruta, fecha, hora_entrada, hora_salida, estado;
  `;
  const { rows } = await pool.query(query, [parseInt(idJornada, 10), parseInt(idRuta, 10)]);
  return rows[0];
};
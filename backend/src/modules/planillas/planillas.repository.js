import pool from '../../config/db.js';

export const obtenerJornadasPorRango = async (usuarioId, fechaInicio, fechaFin) => {
  const query = `
    SELECT 
      id_jornada,
      id_usuario,
      fecha,
      hora_entrada,
      hora_salida,
      EXTRACT(EPOCH FROM (hora_salida - hora_entrada)) / 3600 AS horas_trabajadas
    FROM jornadas
    WHERE id_usuario = $1
      AND estado = 'FINALIZADA'
      AND fecha BETWEEN $2 AND $3;
  `;
  const { rows } = await pool.query(query, [
    parseInt(usuarioId, 10),
    fechaInicio,
    fechaFin,
  ]);
  return rows;
};

export const guardarPlanilla = async ({
  usuarioId,
  periodo,
  horasNormales,
  horasExtras,
  totalPago,
  estadoAprobacion = 'PENDIENTE',
}) => {
  const query = `
    INSERT INTO planillas (id_usuario, periodo, horas_normales, horas_extras, total_pago, estado_aprobacion)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id_planilla, id_usuario, periodo, horas_normales, horas_extras, total_pago, estado_aprobacion;
  `;
  const { rows } = await pool.query(query, [
    parseInt(usuarioId, 10),
    periodo,
    horasNormales,
    horasExtras,
    totalPago,
    estadoAprobacion,
  ]);
  return rows[0];
};

export const obtenerPlanillas = async () => {
  const query = `
    SELECT id_planilla, id_usuario, periodo, horas_normales, horas_extras, total_pago, estado_aprobacion
    FROM planillas
    ORDER BY id_planilla DESC;
  `;
  const { rows } = await pool.query(query);
  return rows;
};

export const actualizarEstadoPlanilla = async (idPlanilla, estado) => {
  const query = `
    UPDATE planillas
    SET estado_aprobacion = $2
    WHERE id_planilla = $1
    RETURNING id_planilla, id_usuario, periodo, horas_normales, horas_extras, total_pago, estado_aprobacion;
  `;
  const { rows } = await pool.query(query, [parseInt(idPlanilla, 10), estado]);
  return rows[0];
};
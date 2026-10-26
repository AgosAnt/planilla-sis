// Aprobación y pagos de planillas. Todas las funciones reciben el client de la transacción abierta por conClaims.
// Los triggers de M005 impiden cambiar una planilla APROBADA o PAGADA y validan que cada pago sea igual al neto.

// Detalle en orden fijo, para el hash de integridad
export const detalleParaHash = async (client, planillaId) => {
  const query = `
    SELECT id, trabajador_id, horas_ordinarias::text AS horas_ordinarias, horas_extra_diurnas::text AS horas_extra_diurnas,
           horas_extra_nocturnas::text AS horas_extra_nocturnas, monto_bruto::text AS monto_bruto,
           total_bonificaciones::text AS total_bonificaciones, total_deducciones::text AS total_deducciones, neto::text AS neto
    FROM planilla_detalle WHERE planilla_id = $1 ORDER BY trabajador_id;
  `;
  const { rows } = await client.query(query, [planillaId]);
  return rows;
};

export const marcarAprobada = async (client, planillaId, usuarioId, hash) => {
  const query = `
    UPDATE planillas SET estado = 'APROBADA', aprobada_por = $2, aprobada_at = NOW(), hash_integridad = $3 WHERE id = $1
    RETURNING id, estado, aprobada_por, aprobada_at, hash_integridad;
  `;
  const { rows } = await client.query(query, [planillaId, usuarioId, hash]);
  return rows[0];
};

export const existeMetodoPago = async (client, metodoId) => {
  const { rowCount } = await client.query('SELECT 1 FROM metodos_pago WHERE id = $1;', [metodoId]);
  return rowCount > 0;
};

// Detalles de la planilla con su neto y si ya tienen un pago procesado
export const detallesDePlanilla = async (client, planillaId, detalleIds) => {
  const query = `
    SELECT d.id, d.neto::text AS neto,
           EXISTS (SELECT 1 FROM pagos pg WHERE pg.detalle_id = d.id AND pg.estado = 'PROCESADO') AS pagado
    FROM planilla_detalle d WHERE d.planilla_id = $1 AND d.id = ANY($2::uuid[]);
  `;
  const { rows } = await client.query(query, [planillaId, detalleIds]);
  return rows;
};

export const insertarPago = async (client, { detalleId, metodoId, referencia, monto, fechaPago, zona, registradoPor }) => {
  const query = `
    INSERT INTO pagos (detalle_id, metodo_pago_id, referencia_transaccion, monto_pagado, pagado_at, registrado_por)
    VALUES ($1, $2, $3, $4, ($5::date + time '12:00') AT TIME ZONE $6, $7)
    RETURNING id;
  `;
  const { rows } = await client.query(query, [detalleId, metodoId, referencia, monto, fechaPago, zona, registradoPor]);
  return rows[0].id;
};

export const contarDetallesSinPago = async (client, planillaId) => {
  const query = `
    SELECT count(*)::int AS pendientes FROM planilla_detalle d
    WHERE d.planilla_id = $1
      AND NOT EXISTS (SELECT 1 FROM pagos pg WHERE pg.detalle_id = d.id AND pg.estado = 'PROCESADO');
  `;
  const { rows } = await client.query(query, [planillaId]);
  return rows[0].pendientes;
};

export const marcarPagada = async (client, planillaId) => {
  await client.query("UPDATE planillas SET estado = 'PAGADA' WHERE id = $1;", [planillaId]);
};

export const contarPlanillasSinPagar = async (client, periodoId) => {
  const { rows } = await client.query("SELECT count(*)::int AS n FROM planillas WHERE periodo_id = $1 AND estado <> 'PAGADA';", [periodoId]);
  return rows[0].n;
};

export const listarPagos = async (client, planillaId) => {
  const query = `
    SELECT pg.id, pg.detalle_id, d.trabajador_id, p.nombres || ' ' || p.apellidos AS trabajador_nombre,
           m.nombre AS metodo, pg.estado, pg.referencia_transaccion, pg.monto_pagado::text AS monto_pagado,
           pg.pagado_at, pg.registrado_por
    FROM pagos pg
    JOIN planilla_detalle d ON d.id = pg.detalle_id
    JOIN perfiles p ON p.id = d.trabajador_id
    JOIN metodos_pago m ON m.id = pg.metodo_pago_id
    WHERE d.planilla_id = $1
    ORDER BY p.apellidos, p.nombres;
  `;
  const { rows } = await client.query(query, [planillaId]);
  return rows;
};

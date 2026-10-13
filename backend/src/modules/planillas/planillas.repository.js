const db = require('../../config/db');

class PlanillasRepository {
  async obtenerDatosCalculo(periodoId) {
    const query = `
      SELECT r.id AS registro_id, r.trabajador_id, r.ingreso_at, r.salida_at, COALESCE(t.valor_hora, 0) AS tarifa_hora
      FROM registros_tiempo r
      JOIN tarifas_trabajador t ON r.trabajador_id = t.trabajador_id AND t.vigente_hasta IS NULL
      WHERE r.estado_validacion = 'VALIDADO' AND r.salida_at IS NOT NULL;
    `;
    const { rows } = await db.query(query);
    return rows;
  }

  async guardarCalculo(planillaId, calculadaPor, detalle) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const updatePlanilla = `
        UPDATE planillas
        SET estado = 'CALCULADA', calculada_por = $2
        WHERE id = $1
        RETURNING id, estado;
      `;
      const resPlanilla = await client.query(updatePlanilla, [planillaId, calculadaPor]);

      for (const item of detalle) {
        const queryDetalle = `
          INSERT INTO planilla_detalle (planilla_id, trabajador_id, horas_ordinarias, horas_extra_diurnas, horas_extra_nocturnas, calculo_detalle, neto)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (planilla_id, trabajador_id) DO UPDATE
          SET horas_ordinarias = EXCLUDED.horas_ordinarias,
              horas_extra_diurnas = EXCLUDED.horas_extra_diurnas,
              calculo_detalle = EXCLUDED.calculo_detalle,
              neto = EXCLUDED.neto;
        `;
        await client.query(queryDetalle, [
          planillaId,
          item.trabajador_id,
          item.horas_ordinarias,
          item.horas_extra_diurnas,
          item.horas_extra_nocturnas,
          JSON.stringify(item.calculo_detalle),
          item.neto,
        ]);
      }

      await client.query('COMMIT');
      return resPlanilla.rows[0];
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async verificarPlanilla(planillaId, verificadaPor) {
    const query = `
      UPDATE planillas
      SET estado = 'VERIFICADA', verificada_por = $2
      WHERE id = $1 AND (calculada_por IS NULL OR calculada_por <> $2)
      RETURNING id, estado, verificada_por;
    `;
    const { rows } = await db.query(query, [planillaId, verificadaPor]);
    return rows[0] || null;
  }

  async aprobarPlanilla(planillaId, aprobadaPor) {
    const query = `
      UPDATE planillas
      SET estado = 'APROBADA', aprobada_por = $2
      WHERE id = $1 AND (calculada_por IS NULL OR calculada_por <> $2) AND (verificada_por IS NULL OR verificada_por <> $2)
      RETURNING id, estado, aprobada_por;
    `;
    const { rows } = await db.query(query, [planillaId, aprobadaPor]);
    return rows[0] || null;
  }

  async registrarPago(planillaId, { metodo_id, pagos }) {
    const query = `
      UPDATE planillas SET estado = 'PAGADA' WHERE id = $1 RETURNING id, estado;
    `;
    const { rows } = await db.query(query, [planillaId]);
    return rows[0];
  }
}

module.exports = new PlanillasRepository();
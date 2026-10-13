const planillasRepository = require('./planillas.repository');
const { calcularJornada } = require('./motorCalculo.service');

class PlanillasController {
  async calcular(req, res, next) {
    try {
      const { id } = req.params;
      const registros = await planillasRepository.obtenerDatosCalculo(id);

      const detalleCalculado = registros.map((r) => {
        const resMotor = calcularJornada({
          ingreso_at: r.ingreso_at,
          salida_at: r.salida_at,
          tarifa_hora: r.tarifa_hora,
        });

        return {
          trabajador_id: r.trabajador_id,
          horas_ordinarias: resMotor.horas_ordinarias,
          horas_extra_diurnas: resMotor.horas_extra_diurnas,
          horas_extra_nocturnas: resMotor.horas_extra_nocturnas,
          neto: resMotor.neto,
          calculo_detalle: resMotor,
        };
      });

      const resultado = await planillasRepository.guardarCalculo(id, req.user.id, detalleCalculado);
      return res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async verificar(req, res, next) {
    try {
      const { id } = req.params;
      const resVerif = await planillasRepository.verificarPlanilla(id, req.user.id);
      if (!resVerif) {
        return res.status(409).json({
          title: 'Violación de segregación de funciones o estado inválido',
          code: 'SEGREGACION_FUNCIONES',
          status: 409,
        });
      }
      return res.status(200).json(resVerif);
    } catch (error) {
      next(error);
    }
  }

  async aprobar(req, res, next) {
    try {
      const { id } = req.params;
      const resAprobar = await planillasRepository.aprobarPlanilla(id, req.user.id);
      if (!resAprobar) {
        return res.status(409).json({
          title: 'Violación de segregación de funciones o estado inválido',
          code: 'SEGREGACION_FUNCIONES',
          status: 409,
        });
      }
      return res.status(200).json({ ...resAprobar, hash_integridad: 'sha256:' + Date.now() });
    } catch (error) {
      next(error);
    }
  }

  async registrarPagos(req, res, next) {
    try {
      const { id } = req.params;
      const resPago = await planillasRepository.registrarPago(id, req.body);
      return res.status(201).json(resPago);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PlanillasController();
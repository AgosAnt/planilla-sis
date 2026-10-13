const registrosRepository = require('./registros.repository');

class RegistrosController {
  async ingreso(req, res, next) {
    try {
      const { client_uuid, asignacion_id, ingreso_at, ubicacion } = req.body;
      const result = await registrosRepository.registrarIngreso({
        trabajador_id: req.user.id,
        asignacion_id,
        ingreso_at,
        client_uuid,
        lat: ubicacion?.lat,
        lng: ubicacion?.lng,
      });

      const statusCode = result.repetido ? 200 : 201;
      return res.status(statusCode).json(result.data);
    } catch (error) {
      next(error);
    }
  }

  async descanso(req, res, next) {
    try {
      const { id } = req.params;
      const { tipo_id, inicio_at, fin_at } = req.body;
      const descanso = await registrosRepository.registrarDescanso({ registro_tiempo_id: id, tipo_id, inicio_at, fin_at });
      return res.status(201).json(descanso);
    } catch (error) {
      next(error);
    }
  }

  async salida(req, res, next) {
    try {
      const { id } = req.params;
      const { salida_at } = req.body;
      const registro = await registrosRepository.registrarSalida({ id, salida_at });
      return res.status(200).json(registro);
    } catch (error) {
      next(error);
    }
  }

  async syncBatch(req, res, next) {
    try {
      const { eventos } = req.body;
      if (!Array.isArray(eventos) || eventos.length > 100) {
        return res.status(413).json({ title: 'Lote demasiado grande (máximo 100 eventos)', status: 413 });
      }

      const resultados = [];
      for (const evt of eventos) {
        try {
          const resEvt = await registrosRepository.guardarEventoBatch({
            trabajador_id: req.user.id,
            client_uuid: evt.client_uuid,
            tipo_evento: evt.tipo_evento,
            ocurrido_en: evt.ocurrido_en,
            latitud: evt.latitud,
            longitud: evt.longitud,
            payload: evt.payload,
          });
          resultados.push(resEvt);
        } catch (err) {
          resultados.push({ client_uuid: evt.client_uuid, estado: 'RECHAZADO', code: 'PAYLOAD_INVALIDO' });
        }
      }

      return res.status(207).json({ resultados });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RegistrosController();
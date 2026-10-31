import * as descansosService from './eventos_descanso.service.js';

export const crearDescanso = async (req, res, next) => {
  try {
    const { descanso, creado } = await descansosService.registrarDescanso(req.usuario, req.params.id, req.body);
    res.status(creado ? 201 : 200).json(descanso);
  } catch (error) {
    next(error);
  }
};

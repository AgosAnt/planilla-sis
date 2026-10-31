import * as eventosService from './eventos_ruta.service.js';

// 207 Multi-Status: cada evento trae su propio estado (CREADO, DUPLICADO o RECHAZADO).
export const sincronizarEventos = async (req, res, next) => {
  try {
    const resultados = await eventosService.sincronizarEventos(req.usuario, req.body.eventos);
    res.status(207).json({ resultados });
  } catch (error) {
    next(error);
  }
};

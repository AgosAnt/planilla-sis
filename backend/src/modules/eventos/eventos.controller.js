import * as eventosService from './eventos.service.js';

export const obtenerEventos = async (req, res, next) => {
  try {
    res.status(200).json(await eventosService.listarEventos(req.usuario, req.filtros, req.paginacion));
  } catch (error) {
    next(error);
  }
};

export const atenderEvento = async (req, res, next) => {
  try {
    res.status(200).json(await eventosService.atenderEvento(req.usuario, req.params.id, req.body));
  } catch (error) {
    next(error);
  }
};

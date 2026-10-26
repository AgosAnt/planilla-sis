import * as aprobacionService from './aprobacion.service.js';

export const aprobarPlanilla = async (req, res, next) => {
  try {
    res.status(200).json(await aprobacionService.aprobarPlanilla(req.usuario, req.params.id, req.body));
  } catch (error) {
    next(error);
  }
};

export const registrarPagos = async (req, res, next) => {
  try {
    res.status(201).json(await aprobacionService.registrarPagos(req.usuario, req.params.id, req.body));
  } catch (error) {
    next(error);
  }
};

export const obtenerPagos = async (req, res, next) => {
  try {
    res.status(200).json(await aprobacionService.listarPagos(req.usuario, req.params.id));
  } catch (error) {
    next(error);
  }
};

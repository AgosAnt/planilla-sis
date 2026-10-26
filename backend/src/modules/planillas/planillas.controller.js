import * as planillasService from './planillas.service.js';

export const crearPeriodo = async (req, res, next) => {
  try {
    res.status(201).json(await planillasService.crearPeriodo(req.usuario, req.body));
  } catch (error) {
    next(error);
  }
};

export const obtenerPeriodos = async (req, res, next) => {
  try {
    res.status(200).json(await planillasService.listarPeriodos(req.usuario, req.paginacion));
  } catch (error) {
    next(error);
  }
};

export const crearPlanilla = async (req, res, next) => {
  try {
    res.status(201).json(await planillasService.crearPlanilla(req.usuario, req.body));
  } catch (error) {
    next(error);
  }
};

export const recalcularPlanilla = async (req, res, next) => {
  try {
    res.status(200).json(await planillasService.recalcularPlanilla(req.usuario, req.params.id));
  } catch (error) {
    next(error);
  }
};

export const obtenerPlanillas = async (req, res, next) => {
  try {
    res.status(200).json(await planillasService.listarPlanillas(req.usuario, req.query.periodo_id));
  } catch (error) {
    next(error);
  }
};

export const obtenerPlanilla = async (req, res, next) => {
  try {
    res.status(200).json(await planillasService.obtenerPlanilla(req.usuario, req.params.id, req.paginacion));
  } catch (error) {
    next(error);
  }
};

export const obtenerCalculoPeriodo = async (req, res, next) => {
  try {
    res.status(200).json(await planillasService.obtenerCalculoPeriodo(req.usuario, req.params.periodoId, req.rutaId, req.paginacion));
  } catch (error) {
    next(error);
  }
};

export const verificarPlanilla = async (req, res, next) => {
  try {
    res.status(200).json(await planillasService.verificarPlanilla(req.usuario, req.params.id, req.body));
  } catch (error) {
    next(error);
  }
};

export const obtenerMiCalculo = async (req, res, next) => {
  try {
    res.status(200).json(await planillasService.miCalculo(req.usuario, req.query.desde, req.query.hasta));
  } catch (error) {
    next(error);
  }
};

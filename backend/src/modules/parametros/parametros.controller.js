import * as parametrosService from './parametros.service.js';

export const obtenerParametros = async (req, res, next) => {
  try {
    res.status(200).json(await parametrosService.obtenerParametros(req.usuario));
  } catch (error) {
    next(error);
  }
};

export const actualizarParametros = async (req, res, next) => {
  try {
    res.status(200).json(await parametrosService.actualizarParametros(req.usuario, req.body));
  } catch (error) {
    next(error);
  }
};

export const obtenerFeriados = async (req, res, next) => {
  try {
    res.status(200).json(await parametrosService.listarFeriados(req.usuario, req.anio));
  } catch (error) {
    next(error);
  }
};

export const crearFeriado = async (req, res, next) => {
  try {
    res.status(201).json(await parametrosService.crearFeriado(req.usuario, req.body));
  } catch (error) {
    next(error);
  }
};

export const borrarFeriado = async (req, res, next) => {
  try {
    await parametrosService.borrarFeriado(req.usuario, req.params.fecha);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const obtenerTarifas = async (req, res, next) => {
  try {
    res.status(200).json(await parametrosService.listarTarifas(req.usuario, req.params.trabajadorId));
  } catch (error) {
    next(error);
  }
};

export const crearTarifa = async (req, res, next) => {
  try {
    res.status(201).json(await parametrosService.crearTarifa(req.usuario, req.params.trabajadorId, req.body));
  } catch (error) {
    next(error);
  }
};

import * as estadosService from './estados.service.js';

export const obtenerEstados = async (req, res, next) => {
  try {
    res.status(200).json(await estadosService.listarEstados(req.usuario));
  } catch (error) {
    next(error);
  }
};

export const obtenerTiposDescanso = async (req, res, next) => {
  try {
    res.status(200).json(await estadosService.listarTiposDescanso(req.usuario));
  } catch (error) {
    next(error);
  }
};

export const obtenerEstadoActual = async (req, res, next) => {
  try {
    res.status(200).json(await estadosService.obtenerEstadoActual(req.usuario, req.params.trabajadorId));
  } catch (error) {
    next(error);
  }
};

export const cambiarEstado = async (req, res, next) => {
  try {
    res.status(201).json(await estadosService.cambiarEstado(req.usuario, req.params.trabajadorId, req.body));
  } catch (error) {
    next(error);
  }
};

export const obtenerHistorial = async (req, res, next) => {
  try {
    res.status(200).json(await estadosService.listarHistorial(req.usuario, req.params.trabajadorId, req.paginacion));
  } catch (error) {
    next(error);
  }
};

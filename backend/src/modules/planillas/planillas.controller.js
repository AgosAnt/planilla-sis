import * as motorCalculoService from './motorCalculo.service.js';

// Los errores pasan a errorHandler: problem+json y sin detalles internos en los 500.

export const generarPlanilla = async (req, res, next) => {
  try {
    const resultado = await motorCalculoService.calcularYGenerarPlanilla(req.body);
    res.status(201).json(resultado);
  } catch (error) {
    next(error);
  }
};

export const obtenerPlanillas = async (req, res, next) => {
  try {
    const planillas = await motorCalculoService.listarPlanillas();
    res.status(200).json(planillas);
  } catch (error) {
    next(error);
  }
};

export const cambiarEstado = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const resultado = await motorCalculoService.cambiarEstadoPlanilla(id, estado);
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
};

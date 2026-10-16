import * as motorCalculoService from './motorCalculo.service.js';

export const generarPlanilla = async (req, res) => {
  try {
    const resultado = await motorCalculoService.calcularYGenerarPlanilla(req.body);
    res.status(201).json(resultado);
  } catch (error) {
    console.error('[Error generarPlanilla]:', error);
    const status = error.status || 500;
    res.status(status).json({
      error: 'Error al generar la planilla',
      detalle: error.message,
    });
  }
};

export const obtenerPlanillas = async (req, res) => {
  try {
    const planillas = await motorCalculoService.listarPlanillas();
    res.status(200).json(planillas);
  } catch (error) {
    console.error('[Error obtenerPlanillas]:', error);
    res.status(500).json({
      error: 'Error al consultar las planillas',
      detalle: error.message,
    });
  }
};

export const cambiarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const resultado = await motorCalculoService.cambiarEstadoPlanilla(id, estado);
    res.status(200).json(resultado);
  } catch (error) {
    console.error('[Error cambiarEstado]:', error);
    const status = error.status || 500;
    res.status(status).json({
      error: 'Error al actualizar el estado de la planilla',
      detalle: error.message,
    });
  }
};
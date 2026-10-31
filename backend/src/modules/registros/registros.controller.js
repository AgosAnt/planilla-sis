import * as registrosService from './registros.service.js';

export const obtenerRegistros = async (req, res, next) => {
  try {
    const pagina = await registrosService.listarRegistros(req.usuario, req.filtros, req.paginacion);
    res.status(200).json(pagina);
  } catch (error) {
    next(error);
  }
};

export const registrarIngreso = async (req, res, next) => {
  try {
    const { registro, creado } = await registrosService.registrarIngreso(req.usuario, req.body);
    res.status(creado ? 201 : 200).json(registro);
  } catch (error) {
    next(error);
  }
};

export const registrarSalida = async (req, res, next) => {
  try {
    const registro = await registrosService.registrarSalida(req.usuario, req.params.id, req.body);
    res.status(200).json(registro);
  } catch (error) {
    next(error);
  }
};

export const validarRegistro = async (req, res, next) => {
  try {
    const registro = await registrosService.validarRegistro(req.usuario, req.params.id, req.body);
    res.status(200).json(registro);
  } catch (error) {
    next(error);
  }
};

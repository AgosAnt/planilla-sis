import * as registrosService from './registros.service.js';
import { crearError } from '../../middlewares/errorHandler.js';

// Los errores pasan a errorHandler: problem+json y sin detalles internos en los 500.

export const obtenerRegistros = async (req, res, next) => {
  try {
    const registros = await registrosService.listarRegistros();
    res.status(200).json(registros);
  } catch (error) {
    next(error);
  }
};

export const crearRegistro = async (req, res, next) => {
  try {
    const { usuarioId } = req.body;

    if (!usuarioId) {
      throw crearError(400, 'VALIDACION', 'Falta el campo usuarioId en el body');
    }

    const nuevoRegistro = await registrosService.registrarIngreso(usuarioId);
    res.status(201).json(nuevoRegistro);
  } catch (error) {
    next(error);
  }
};

export const marcarSalida = async (req, res, next) => {
  try {
    const { id } = req.params;
    const registro = await registrosService.registrarSalida(id);
    res.status(200).json(registro);
  } catch (error) {
    next(error);
  }
};

export const asignarRuta = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rutaId } = req.body;

    if (!rutaId) {
      throw crearError(400, 'VALIDACION', 'Falta el campo rutaId en el body');
    }

    const registro = await registrosService.asignarRutaAJornada(id, rutaId);
    res.status(200).json(registro);
  } catch (error) {
    next(error);
  }
};

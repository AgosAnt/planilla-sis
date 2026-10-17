import * as rutasService from './rutas.service.js';

export const obtenerRutas = async (req, res, next) => {
  try {
    const pagina = await rutasService.listarRutas(req.usuario, req.paginacion);
    res.status(200).json(pagina);
  } catch (error) {
    next(error);
  }
};

export const obtenerRuta = async (req, res, next) => {
  try {
    const ruta = await rutasService.obtenerRuta(req.usuario, req.params.rutaId);
    res.status(200).json(ruta);
  } catch (error) {
    next(error);
  }
};

export const crearRuta = async (req, res, next) => {
  try {
    const nuevaRuta = await rutasService.crearRuta(req.usuario, req.body);
    res.status(201).json(nuevaRuta);
  } catch (error) {
    next(error);
  }
};

export const actualizarRuta = async (req, res, next) => {
  try {
    const ruta = await rutasService.actualizarRuta(req.usuario, req.params.rutaId, req.body);
    res.status(200).json(ruta);
  } catch (error) {
    next(error);
  }
};

import * as asignacionesService from './asignaciones.service.js';

export const crearAsignacion = async (req, res, next) => {
  try {
    const asignacion = await asignacionesService.crearAsignacion(req.usuario, req.params.rutaId, req.body);
    res.status(201).json(asignacion);
  } catch (error) {
    next(error);
  }
};

export const obtenerAsignaciones = async (req, res, next) => {
  try {
    const pagina = await asignacionesService.listarAsignaciones(req.usuario, req.params.rutaId, req.paginacion);
    res.status(200).json(pagina);
  } catch (error) {
    next(error);
  }
};

export const actualizarAsignacion = async (req, res, next) => {
  try {
    const asignacion = await asignacionesService.actualizarAsignacion(req.usuario, req.params.id, req.body);
    res.status(200).json(asignacion);
  } catch (error) {
    next(error);
  }
};

export const proponerAcuerdo = async (req, res, next) => {
  try {
    const acuerdo = await asignacionesService.proponerAcuerdo(req.usuario, req.params.id, req.body);
    res.status(201).json(acuerdo);
  } catch (error) {
    next(error);
  }
};

export const obtenerAcuerdos = async (req, res, next) => {
  try {
    const pagina = await asignacionesService.listarAcuerdos(req.usuario, req.filtros, req.paginacion);
    res.status(200).json(pagina);
  } catch (error) {
    next(error);
  }
};

export const responderAcuerdo = async (req, res, next) => {
  try {
    const acuerdo = await asignacionesService.responderAcuerdo(req.usuario, req.params.id, req.body);
    res.status(200).json(acuerdo);
  } catch (error) {
    next(error);
  }
};

export const confirmarAcuerdo = async (req, res, next) => {
  try {
    const acuerdo = await asignacionesService.confirmarAcuerdo(req.usuario, req.params.id);
    res.status(200).json(acuerdo);
  } catch (error) {
    next(error);
  }
};

export const obtenerTurnos = async (req, res, next) => {
  try {
    res.status(200).json(await asignacionesService.listarTurnos(req.usuario));
  } catch (error) {
    next(error);
  }
};

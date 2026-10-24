import * as usuariosService from './usuarios.service.js';

export const crearUsuario = async (req, res, next) => {
  try {
    const usuario = await usuariosService.crearUsuario(req.usuario, req.body);
    res.status(201).json(usuario);
  } catch (error) {
    next(error);
  }
};

export const obtenerUsuarios = async (req, res, next) => {
  try {
    const pagina = await usuariosService.listarUsuarios(req.usuario, req.filtros, req.paginacion);
    res.status(200).json(pagina);
  } catch (error) {
    next(error);
  }
};

export const obtenerUsuario = async (req, res, next) => {
  try {
    const usuario = await usuariosService.obtenerUsuario(req.usuario, req.params.id);
    res.status(200).json(usuario);
  } catch (error) {
    next(error);
  }
};

export const actualizarUsuario = async (req, res, next) => {
  try {
    const usuario = await usuariosService.actualizarUsuario(req.usuario, req.params.id, req.body);
    res.status(200).json(usuario);
  } catch (error) {
    next(error);
  }
};

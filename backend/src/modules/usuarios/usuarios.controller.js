import * as usuariosService from './usuarios.service.js';

export const crearUsuario = async (req, res, next) => {
  try {
    const usuario = await usuariosService.crearUsuario(req.usuario, req.body);
    res.status(201).json(usuario);
  } catch (error) {
    next(error);
  }
};

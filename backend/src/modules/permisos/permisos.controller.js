import * as permisosService from './permisos.service.js';

export const obtenerPermisos = async (req, res, next) => {
  try {
    res.status(200).json(await permisosService.listarPermisos(req.usuario));
  } catch (error) {
    next(error);
  }
};

export const obtenerPermisosDeRol = async (req, res, next) => {
  try {
    res.status(200).json(await permisosService.permisosDeRol(req.usuario, req.params.rol));
  } catch (error) {
    next(error);
  }
};

import * as authService from './auth.service.js';

export const iniciarSesion = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const resultado = await authService.login(email, password);
    return res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
};

export const renovarSesion = async (req, res, next) => {
  try {
    return res.status(200).json({ mensaje: 'Sesión renovada' });
  } catch (error) {
    next(error);
  }
};

export const cerrarSesion = async (req, res, next) => {
  try {
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const obtenerPerfil = async (req, res, next) => {
  try {
    return res.status(200).json({ id: req.user?.id || 'uuid' });
  } catch (error) {
    next(error);
  }
};
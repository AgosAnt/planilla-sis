import * as authService from './auth.service.js';
import { COOKIE_ACCESS, opcionesCookieAccess } from '../../config/sesion.js';
import { generarTokenCsrf } from '../../middlewares/csrf.js';
import { crearError } from '../../middlewares/errorHandler.js';

const esMovil = (req) => req.get('X-Client-Type') === 'mobile';

// E-1: la web recibe el token solo en una cookie HttpOnly y el csrf_token en el cuerpo;
// el móvil (X-Client-Type: mobile) recibe el access_token en el cuerpo.
export const iniciarSesion = async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    const sesion = await authService.iniciarSesion(email, password);

    if (esMovil(req)) {
      return res.status(200).json({ user: sesion.usuario, access_token: sesion.token, expira_en: sesion.expiraEn });
    }

    res.cookie(COOKIE_ACCESS, sesion.token, { ...opcionesCookieAccess, maxAge: sesion.expiraEn * 1000 });
    return res.status(200).json({
      user: sesion.usuario,
      csrf_token: generarTokenCsrf(sesion.jti),
      expira_en: sesion.expiraEn,
    });
  } catch (error) {
    next(error);
  }
};

// Pendiente: rotación de refresh tokens con sesiones_refresh (ADR-001).
export const renovarSesion = async (req, res, next) => {
  next(crearError(501, 'NO_IMPLEMENTADO', 'La renovación de sesión aún no está disponible; vuelve a iniciar sesión.'));
};

// Borra la cookie web. El JWT sigue siendo válido hasta su exp mientras no exista revocación en sesiones_refresh.
export const cerrarSesion = async (req, res, next) => {
  try {
    res.clearCookie(COOKIE_ACCESS, opcionesCookieAccess);
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const obtenerPerfil = async (req, res, next) => {
  try {
    const usuario = await authService.obtenerPerfil(req.usuario.id);
    return res.status(200).json(usuario);
  } catch (error) {
    next(error);
  }
};

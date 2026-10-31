import { isIP } from 'node:net';
import * as authService from './auth.service.js';
import {
  COOKIE_ACCESS, COOKIE_REFRESH, opcionesCookieAccess, opcionesCookieRefresh,
} from '../../config/sesion.js';
import { generarTokenCsrf } from '../../middlewares/csrf.js';
import { crearError } from '../../middlewares/errorHandler.js';

const esMovil = (req) => req.get('X-Client-Type') === 'mobile';

// El frontal de Azure manda X-Forwarded-For como "ip:puerto" ("[ipv6]:puerto"); la columna es inet y solo acepta
// la IP. Si no es una IP válida queda vacía: nunca debe impedir el inicio de sesión.
const ipDe = (req) => {
  const ip = (req.ip ?? '').replace(/^\[(.+)\]:\d+$/, '$1').replace(/^(\d+\.\d+\.\d+\.\d+):\d+$/, '$1');
  return isIP(ip) ? ip : null;
};

// Dispositivo de la sesión (queda en sesiones_refresh para saber desde dónde se abrió)
const contextoDe = (req) => ({ ip: ipDe(req), userAgent: req.get('User-Agent') ?? null });

// Secure cuando la petición llegó por HTTPS (Azure); en la LAN o en local por HTTP la cookie sigue funcionando
const ponerCookies = (req, res, sesion) => {
  res.cookie(COOKIE_ACCESS, sesion.token, { ...opcionesCookieAccess, secure: req.secure, maxAge: sesion.expiraEn * 1000 });
  res.cookie(COOKIE_REFRESH, sesion.refreshToken, { ...opcionesCookieRefresh, secure: req.secure, maxAge: sesion.refreshExpiraEn * 1000 });
};

const borrarCookies = (req, res) => {
  res.clearCookie(COOKIE_ACCESS, { ...opcionesCookieAccess, secure: req.secure });
  res.clearCookie(COOKIE_REFRESH, { ...opcionesCookieRefresh, secure: req.secure });
};

// E-1: la web recibe los tokens solo en cookies HttpOnly (psis_access y psis_refresh) y el csrf_token en el cuerpo;
// el móvil (X-Client-Type: mobile) recibe access_token y refresh_token en el cuerpo.
export const iniciarSesion = async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    const sesion = await authService.iniciarSesion(email, password, contextoDe(req));

    if (esMovil(req)) {
      return res.status(200).json({
        user: sesion.usuario,
        access_token: sesion.token,
        refresh_token: sesion.refreshToken,
        expira_en: sesion.expiraEn,
      });
    }

    ponerCookies(req, res, sesion);
    return res.status(200).json({
      user: sesion.usuario,
      csrf_token: generarTokenCsrf(sesion.jti),
      expira_en: sesion.expiraEn,
    });
  } catch (error) {
    next(error);
  }
};

// POST /auth/refresh (ADR-001): el móvil manda refresh_token en el cuerpo; la web, la cookie psis_refresh.
// El token CSRF de la web no cambia: la sesión (jti) es la misma.
export const renovarSesion = async (req, res, next) => {
  const movil = esMovil(req);
  try {
    const refreshToken = movil ? req.body?.refresh_token : req.cookies?.[COOKIE_REFRESH];
    const sesion = await authService.renovarSesion(refreshToken, contextoDe(req));

    if (movil) {
      return res.status(200).json({
        access_token_emitido: true,
        expira_en: sesion.expiraEn,
        access_token: sesion.token,
        refresh_token: sesion.refreshToken,
      });
    }
    ponerCookies(req, res, sesion);
    return res.status(200).json({ access_token_emitido: true, expira_en: sesion.expiraEn });
  } catch (error) {
    // Refresh que ya no sirve: la web deja de enviarlo (en 409 la cookie nueva ya la puso la otra pestaña)
    if (!movil && error.status === 401) borrarCookies(req, res);
    next(error);
  }
};

// Revoca el refresh de la sesión en la base y deja de aceptar su access token; en la web borra ambas cookies.
export const cerrarSesion = async (req, res, next) => {
  try {
    await authService.cerrarSesion(req.usuario);
    borrarCookies(req, res);
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
};

// B.4: el token CSRF vive solo en memoria de la web; al recargar la página se rehidrata desde aquí.
// Otro sitio no puede leer esta respuesta (política de mismo origen), así que no sirve para un ataque CSRF.
export const obtenerCsrf = async (req, res, next) => {
  try {
    if (!req.usuario.sesionId) {
      throw crearError(401, 'TOKEN_INVALIDO', 'La sesión no tiene identificador; vuelve a iniciar sesión.');
    }
    return res.status(200).json({ csrf_token: generarTokenCsrf(req.usuario.sesionId) });
  } catch (error) {
    next(error);
  }
};

// POST /auth/reauth: confirma la contraseña y entrega un token corto para aprobar planillas y registrar pagos.
export const reautenticar = async (req, res, next) => {
  try {
    const resultado = await authService.reautenticar(req.usuario, req.body?.password);
    return res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
};

// POST /auth/password: después del cambio se vuelve a iniciar sesión, porque el token actual puede llevar
// la marca de contraseña temporal y todas las sesiones quedan revocadas. En la web se borran las cookies;
// el móvil descarta sus tokens.
export const cambiarPassword = async (req, res, next) => {
  try {
    await authService.cambiarPassword(req.usuario, req.body);
    borrarCookies(req, res);
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const obtenerPerfil = async (req, res, next) => {
  try {
    const usuario = await authService.obtenerPerfil(req.usuario);
    return res.status(200).json(usuario);
  } catch (error) {
    next(error);
  }
};

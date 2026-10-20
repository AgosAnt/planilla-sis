import { sesion, limpiarSesion } from './estado.js';

const BASE = '/api/v1';
const METODOS_SEGUROS = ['GET', 'HEAD'];

export class ErrorApi extends Error {
  constructor(status, problema) {
    super(problema?.detail || `Error ${status}`);
    this.status = status;
    this.code = problema?.code;
  }
}

let alExpirar = () => {};
export const alExpirarSesion = (funcion) => {
  alExpirar = funcion;
};

// fetch con la cookie de sesión (mismo origen) y X-CSRF-Token en las escrituras (F.2).
export const api = async (metodo, ruta, cuerpo) => {
  const cabeceras = { Accept: 'application/json' };
  if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json';
  if (!METODOS_SEGUROS.includes(metodo) && sesion.csrf) cabeceras['X-CSRF-Token'] = sesion.csrf;

  const respuesta = await fetch(BASE + ruta, {
    method: metodo,
    headers: cabeceras,
    credentials: 'same-origin',
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  const datos = respuesta.status === 204 ? null : await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    // Sesión vencida en medio del uso: se limpia y se vuelve al login
    if (respuesta.status === 401 && sesion.usuario) {
      limpiarSesion();
      alExpirar();
    }
    throw new ErrorApi(respuesta.status, datos);
  }
  return datos;
};

export const iniciarSesion = async (email, password) => {
  const datos = await api('POST', '/auth/session', { email, password });
  sesion.usuario = datos.user;
  sesion.csrf = datos.csrf_token;
  return datos.user;
};

// Al cargar la página: si la cookie sigue vigente, recupera perfil y CSRF; si no, queda sin sesión.
export const restaurarSesion = async () => {
  try {
    const usuario = await api('GET', '/me');
    const { csrf_token: csrf } = await api('GET', '/auth/csrf');
    sesion.usuario = usuario;
    sesion.csrf = csrf;
  } catch (error) {
    if (error.status !== 401) throw error;
  }
  return sesion.usuario;
};

export const cerrarSesion = async () => {
  try {
    await api('POST', '/auth/logout');
  } finally {
    limpiarSesion();
  }
};

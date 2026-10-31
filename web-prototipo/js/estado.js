// B.4: localStorage solo para preferencias no sensibles, con prefijo y versión.
// Siempre con try/catch: el almacenamiento puede estar bloqueado o vacío (modo privado).
const PREFIJO = 'psis:v1:';

export const preferencias = {
  leer(clave, porDefecto) {
    try {
      const valor = localStorage.getItem(PREFIJO + clave);
      return valor === null ? porDefecto : JSON.parse(valor);
    } catch {
      return porDefecto;
    }
  },
  guardar(clave, valor) {
    try {
      localStorage.setItem(PREFIJO + clave, JSON.stringify(valor));
    } catch {
      // Sin almacenamiento: la preferencia dura solo esta visita
    }
  },
};

// Sesión solo en memoria (B.4). El JWT vive en la cookie HttpOnly psis_access, que JavaScript no puede
// leer: aquí solo quedan el perfil (de /me) y el token CSRF, que se pierden al recargar y se rehidratan.
export const sesion = { usuario: null, csrf: null };

export const limpiarSesion = () => {
  sesion.usuario = null;
  sesion.csrf = null;
  try {
    sessionStorage.clear();
  } catch {
    // Nada que limpiar
  }
};

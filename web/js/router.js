import { h, mensajeError } from './dom.js';
import { sesion } from './estado.js';

// Router de la SPA con la History API (B.3): rutas limpias, pushState/replaceState y popstate,
// guardas por sesión y rol, y sin datos sensibles en history.state ni en la URL.
const rutas = [];
let contenedor = null;
let despuesDeRenderizar = () => {};
let renderActual = 0;

// definirRuta('/rutas/:rutaId', vista, { publica, roles })
export const definirRuta = (camino, vista, opciones = {}) => {
  const claves = [];
  const patron = new RegExp(`^${camino.replace(/:(\w+)/g, (_, clave) => {
    claves.push(clave);
    return '([^/]+)';
  })}/?$`);
  rutas.push({ patron, claves, vista, publica: false, roles: null, ...opciones });
};

export const navegar = (destino, { reemplazar = false } = {}) => {
  const url = new URL(destino, window.location.origin);
  if (url.origin !== window.location.origin) return; // evita open redirect
  window.history[reemplazar ? 'replaceState' : 'pushState']({}, '', url.pathname + url.search);
  renderizar();
};

// Solo rutas internas como destino después del login (evita open redirect con ?siguiente=)
export const destinoSeguro = (valor, porDefecto) =>
  typeof valor === 'string' && valor.startsWith('/') && !valor.startsWith('//') ? valor : porDefecto;

const buscarRuta = (camino) => {
  for (const ruta of rutas) {
    const coincidencia = ruta.patron.exec(camino);
    if (coincidencia) {
      const params = Object.fromEntries(ruta.claves.map((clave, i) => [clave, decodeURIComponent(coincidencia[i + 1])]));
      return { ruta, params };
    }
  }
  return null;
};

const vistaNoEncontrada = () =>
  h('section', {}, h('h1', {}, 'Página no encontrada'), h('p', {}, h('a', { href: '/panel', 'data-link': true }, 'Volver al panel')));

const vistaSinPermiso = () =>
  h('section', {},
    h('h1', {}, 'Acceso denegado'),
    h('p', {}, 'Esta web es para administradores y supervisores. Los trabajadores usan la app móvil.'));

export const renderizar = async () => {
  const numero = ++renderActual;
  const { pathname, search } = window.location;
  const encontrada = buscarRuta(pathname);

  // Guardas (solo experiencia de usuario: la autorización real está en la API)
  if (encontrada && !encontrada.ruta.publica && !sesion.usuario) {
    navegar(`/login?siguiente=${encodeURIComponent(pathname + search)}`, { reemplazar: true });
    return;
  }

  let vista;
  try {
    if (!encontrada) vista = vistaNoEncontrada();
    else if (encontrada.ruta.roles && !encontrada.ruta.roles.includes(sesion.usuario?.rol)) vista = vistaSinPermiso();
    else vista = await encontrada.ruta.vista({ params: encontrada.params, query: new URLSearchParams(search) });
  } catch (error) {
    vista = h('section', {}, h('h1', {}, 'Algo salió mal'), mensajeError(error.message));
  }

  if (numero !== renderActual || !vista) return; // llegó otra navegación mientras se cargaba esta vista
  contenedor.replaceChildren(vista);
  document.title = `${vista.querySelector('h1')?.textContent ?? 'Inicio'} · planilla-sis`;
  contenedor.focus();
  despuesDeRenderizar(pathname);
};

export const iniciarRouter = (elemento, { alRenderizar } = {}) => {
  contenedor = elemento;
  if (alRenderizar) despuesDeRenderizar = alRenderizar;

  // Enlaces internos con data-link: navegación sin recargar la página
  document.addEventListener('click', (evento) => {
    const enlace = evento.target.closest('a[data-link]');
    if (!enlace || evento.defaultPrevented || evento.button !== 0) return;
    if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return; // nueva pestaña: lo maneja el navegador
    evento.preventDefault();
    navegar(enlace.getAttribute('href'));
  });

  // Botones atrás y adelante del navegador
  window.addEventListener('popstate', renderizar);
  renderizar();
};

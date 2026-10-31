import { definirRuta, iniciarRouter, navegar } from './router.js';
import { restaurarSesion, cerrarSesion, alExpirarSesion } from './api.js';
import { sesion, preferencias } from './estado.js';
import { vistaLogin } from './vistas/login.js';
import { vistaPanel } from './vistas/panel.js';
import { vistaRutas } from './vistas/rutas.js';
import { vistaRutaNueva } from './vistas/rutaNueva.js';
import { vistaRutaDetalle } from './vistas/rutaDetalle.js';

// La web es para administradores y supervisores; los trabajadores usan la app móvil (C.1)
const ROLES_WEB = ['administrador', 'supervisor'];

definirRuta('/login', vistaLogin, { publica: true });
definirRuta('/', () => { navegar('/panel', { reemplazar: true }); return null; });
definirRuta('/panel', vistaPanel, { roles: ROLES_WEB });
definirRuta('/rutas', vistaRutas, { roles: ROLES_WEB });
definirRuta('/rutas/nueva', vistaRutaNueva, { roles: ROLES_WEB }); // antes de /rutas/:rutaId
definirRuta('/rutas/:rutaId', vistaRutaDetalle, { roles: ROLES_WEB });

// --- Tema (preferencia en localStorage) ---
const botonTema = document.getElementById('btn-tema');
const aplicarTema = (tema) => {
  document.documentElement.dataset.tema = tema;
  botonTema.textContent = tema === 'oscuro' ? 'Tema claro' : 'Tema oscuro';
};
const temaDelSistema = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
aplicarTema(preferencias.leer('tema', temaDelSistema));
botonTema.addEventListener('click', () => {
  const nuevo = document.documentElement.dataset.tema === 'oscuro' ? 'claro' : 'oscuro';
  preferencias.guardar('tema', nuevo);
  aplicarTema(nuevo);
});

// --- Barra superior según la sesión ---
const menu = document.getElementById('menu');
const usuarioActual = document.getElementById('usuario-actual');
const botonSalir = document.getElementById('btn-salir');

const actualizarBarra = (camino) => {
  const conSesion = Boolean(sesion.usuario);
  menu.hidden = !conSesion;
  botonSalir.hidden = !conSesion;
  usuarioActual.textContent = conSesion ? `${sesion.usuario.nombres} · ${sesion.usuario.rol}` : '';
  for (const enlace of menu.querySelectorAll('a')) {
    const href = enlace.getAttribute('href');
    if (camino === href || camino.startsWith(`${href}/`)) enlace.setAttribute('aria-current', 'page');
    else enlace.removeAttribute('aria-current');
  }
};

botonSalir.addEventListener('click', async () => {
  botonSalir.disabled = true;
  try {
    await cerrarSesion();
  } finally {
    botonSalir.disabled = false;
    navegar('/login', { reemplazar: true });
  }
});

alExpirarSesion(() => {
  const { pathname, search } = window.location;
  navegar(`/login?siguiente=${encodeURIComponent(pathname + search)}`, { reemplazar: true });
});

// --- Arranque: rehidratar la sesión desde la cookie y pintar la ruta actual ---
const vista = document.getElementById('vista');
try {
  await restaurarSesion();
} catch {
  // API no disponible: el router mostrará el login y el error aparecerá al intentar entrar
}
iniciarRouter(vista, { alRenderizar: actualizarBarra });

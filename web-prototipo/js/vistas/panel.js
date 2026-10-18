import { h } from '../dom.js';
import { api } from '../api.js';
import { sesion, preferencias } from '../estado.js';

export const vistaPanel = async () => {
  const { total } = await api('GET', '/rutas?page_size=1');
  const usuario = sesion.usuario;

  return h('section', {},
    h('h1', {}, `Hola, ${usuario.nombres}`),
    h('div', { class: 'rejilla' },
      h('article', { class: 'tarjeta' },
        h('h2', {}, 'Rutas visibles para ti'),
        h('p', { class: 'cifra' }, total),
        h('a', { href: '/rutas', 'data-link': true }, 'Ver rutas')),
      h('article', { class: 'tarjeta' },
        h('h2', {}, 'Tu perfil'),
        h('p', {}, `${usuario.nombres} ${usuario.apellidos}`),
        h('p', {}, `Rol: ${usuario.rol}`),
        h('p', {}, usuario.email))),
    // Explica cómo se maneja el estado (útil para la demostración del prototipo)
    h('article', { class: 'tarjeta' },
      h('h2', {}, 'Estado de la sesión en este navegador'),
      h('ul', { class: 'lista-estado' },
        h('li', {}, 'Sesión: cookie ', h('code', {}, 'psis_access'), ' con HttpOnly y SameSite=Lax. JavaScript no puede leerla.'),
        h('li', {}, 'Token CSRF: solo en memoria; se recupera de ', h('code', {}, '/api/v1/auth/csrf'), ' al recargar.'),
        h('li', {}, 'Preferencias en localStorage: tema ', h('code', {}, preferencias.leer('tema', 'claro')),
          ', filas por página ', h('code', {}, preferencias.leer('rutas:page_size', 10)), '.'))));
};

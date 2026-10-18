import { h, formatearFecha } from '../dom.js';
import { api } from '../api.js';
import { sesion, preferencias } from '../estado.js';
import { navegar } from '../router.js';

const TAMANOS = [10, 25, 50];

const etiquetaEstado = (activa) =>
  h('span', { class: `etiqueta ${activa ? 'etiqueta-activa' : 'etiqueta-inactiva'}` }, activa ? 'Activa' : 'Inactiva');

// Listado dinámico desde PostgreSQL. La página va en la URL (?page=) para poder compartirla y volver con
// atrás/adelante (B.3); las filas por página son una preferencia en localStorage (B.4).
export const vistaRutas = async ({ query }) => {
  const pagina = Math.max(1, Number.parseInt(query.get('page'), 10) || 1);
  const tamano = TAMANOS.includes(preferencias.leer('rutas:page_size', 10)) ? preferencias.leer('rutas:page_size', 10) : 10;
  const { items, total } = await api('GET', `/rutas?page=${pagina}&page_size=${tamano}`);
  const paginas = Math.max(1, Math.ceil(total / tamano));
  const puedeCrear = ['administrador', 'supervisor'].includes(sesion.usuario.rol);

  const filas = items.map((ruta) =>
    h('tr', {},
      h('td', {}, h('a', { href: `/rutas/${encodeURIComponent(ruta.id)}`, 'data-link': true }, ruta.codigo)),
      h('td', {}, ruta.nombre),
      h('td', {}, etiquetaEstado(ruta.activa)),
      h('td', {}, formatearFecha(ruta.creado_at))));

  const selectorTamano = h('select', {
    onchange: (evento) => {
      preferencias.guardar('rutas:page_size', Number(evento.target.value));
      navegar('/rutas?page=1');
    },
  }, TAMANOS.map((n) => h('option', { value: n, selected: n === tamano }, n)));

  return h('section', {},
    h('div', { class: 'encabezado' },
      h('h1', {}, 'Rutas'),
      puedeCrear && h('a', { class: 'boton', href: '/rutas/nueva', 'data-link': true }, 'Nueva ruta')),
    items.length === 0
      ? h('p', { class: 'mensaje mensaje-info' }, 'No hay rutas para mostrar.')
      : h('div', { class: 'tabla-contenedor' },
        h('table', {},
          h('thead', {}, h('tr', {}, h('th', {}, 'Código'), h('th', {}, 'Nombre'), h('th', {}, 'Estado'), h('th', {}, 'Creada'))),
          h('tbody', {}, filas))),
    h('nav', { class: 'paginacion', 'aria-label': 'Paginación' },
      h('button', { type: 'button', class: 'boton boton-secundario', disabled: pagina <= 1, onclick: () => navegar(`/rutas?page=${pagina - 1}`) }, 'Anterior'),
      h('span', {}, `Página ${pagina} de ${paginas} · ${total} rutas`),
      h('button', { type: 'button', class: 'boton boton-secundario', disabled: pagina >= paginas, onclick: () => navegar(`/rutas?page=${pagina + 1}`) }, 'Siguiente'),
      h('label', {}, 'Filas por página', selectorTamano)));
};

import { h, mensajeError, formatearFecha } from '../dom.js';
import { api } from '../api.js';
import { renderizar } from '../router.js';

export const vistaRutaDetalle = async ({ params }) => {
  let ruta;
  try {
    ruta = await api('GET', `/rutas/${encodeURIComponent(params.rutaId)}`);
  } catch (error) {
    if (error.status === 404 || error.status === 400) {
      return h('section', {}, h('h1', {}, 'Ruta no encontrada'), h('p', {}, h('a', { href: '/rutas', 'data-link': true }, 'Volver a rutas')));
    }
    throw error;
  }

  const zonaError = h('div', { 'aria-live': 'polite' });

  // PATCH con X-CSRF-Token (lo agrega api.js): baja o reactivación lógica
  const cambiarEstado = async (evento) => {
    evento.target.disabled = true;
    try {
      await api('PATCH', `/rutas/${encodeURIComponent(ruta.id)}`, { activa: !ruta.activa });
      renderizar();
    } catch (error) {
      zonaError.replaceChildren(mensajeError(error.message));
      evento.target.disabled = false;
    }
  };

  return h('section', {},
    h('p', {}, h('a', { href: '/rutas', 'data-link': true }, '← Rutas')),
    h('div', { class: 'encabezado' },
      h('h1', {}, `${ruta.codigo} · ${ruta.nombre}`),
      h('button', { type: 'button', class: 'boton boton-secundario', onclick: cambiarEstado }, ruta.activa ? 'Dar de baja' : 'Reactivar')),
    zonaError,
    h('article', { class: 'tarjeta' },
      h('dl', { class: 'detalle' },
        h('dt', {}, 'Código'), h('dd', {}, ruta.codigo),
        h('dt', {}, 'Nombre'), h('dd', {}, ruta.nombre),
        h('dt', {}, 'Descripción'), h('dd', {}, ruta.descripcion ?? '—'),
        h('dt', {}, 'Estado'), h('dd', {}, ruta.activa ? 'Activa' : 'Inactiva'),
        h('dt', {}, 'Supervisor'), h('dd', {}, ruta.supervisor_id ? 'Asignado' : 'Sin supervisor'),
        h('dt', {}, 'Creada'), h('dd', {}, formatearFecha(ruta.creado_at)))));
};

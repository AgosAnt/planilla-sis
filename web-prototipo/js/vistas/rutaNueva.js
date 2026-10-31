import { h, mensajeError } from '../dom.js';
import { api } from '../api.js';
import { navegar } from '../router.js';

export const vistaRutaNueva = () => {
  const zonaError = h('div', { 'aria-live': 'polite' });
  const boton = h('button', { type: 'submit', class: 'boton' }, 'Crear ruta');

  // POST con X-CSRF-Token (lo agrega api.js). La validación definitiva la hace la API.
  const alEnviar = async (evento) => {
    evento.preventDefault();
    const datos = new FormData(evento.target);
    boton.disabled = true;
    zonaError.replaceChildren();
    try {
      const ruta = await api('POST', '/rutas', {
        codigo: datos.get('codigo'),
        nombre: datos.get('nombre'),
        descripcion: datos.get('descripcion') || null,
      });
      navegar(`/rutas/${encodeURIComponent(ruta.id)}`, { reemplazar: true });
    } catch (error) {
      zonaError.replaceChildren(mensajeError(error.message));
      boton.disabled = false;
    }
  };

  return h('section', {},
    h('p', {}, h('a', { href: '/rutas', 'data-link': true }, '← Rutas')),
    h('h1', {}, 'Nueva ruta'),
    h('form', { class: 'formulario tarjeta', onsubmit: alEnviar },
      h('label', {}, 'Código', h('input', { name: 'codigo', required: true, maxlength: 50 })),
      h('label', {}, 'Nombre', h('input', { name: 'nombre', required: true, maxlength: 100 })),
      h('label', {}, 'Descripción', h('textarea', { name: 'descripcion', rows: 3, maxlength: 1000 })),
      zonaError,
      boton));
};

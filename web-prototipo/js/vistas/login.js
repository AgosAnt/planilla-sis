import { h, mensajeError } from '../dom.js';
import { iniciarSesion } from '../api.js';
import { sesion } from '../estado.js';
import { navegar, destinoSeguro } from '../router.js';

export const vistaLogin = ({ query }) => {
  const siguiente = destinoSeguro(query.get('siguiente'), '/panel');
  if (sesion.usuario) {
    navegar(siguiente, { reemplazar: true });
    return null;
  }

  const zonaError = h('div', { 'aria-live': 'polite' });
  const boton = h('button', { type: 'submit', class: 'boton' }, 'Iniciar sesión');

  const alEnviar = async (evento) => {
    evento.preventDefault();
    const datos = new FormData(evento.target);
    boton.disabled = true;
    zonaError.replaceChildren();
    try {
      await iniciarSesion(datos.get('email'), datos.get('password'));
      navegar(siguiente, { reemplazar: true });
    } catch (error) {
      zonaError.replaceChildren(mensajeError(error.status === 401 ? 'Correo o contraseña incorrectos.' : error.message));
      boton.disabled = false;
    }
  };

  return h('section', { class: 'tarjeta' },
    h('h1', {}, 'Iniciar sesión'),
    h('form', { class: 'formulario', onsubmit: alEnviar },
      h('label', {}, 'Correo', h('input', { name: 'email', type: 'email', autocomplete: 'username', required: true })),
      h('label', {}, 'Contraseña', h('input', { name: 'password', type: 'password', autocomplete: 'current-password', required: true })),
      zonaError,
      boton));
};

// Crea elementos sin innerHTML: todo texto (incluido lo que viene de la API) se inserta como texto (F.2, XSS).
export const h = (etiqueta, atributos = {}, ...hijos) => {
  const el = document.createElement(etiqueta);
  for (const [clave, valor] of Object.entries(atributos)) {
    if (valor === false || valor === null || valor === undefined) continue;
    if (clave.startsWith('on') && typeof valor === 'function') {
      el.addEventListener(clave.slice(2), valor);
    } else if (clave === 'class') {
      el.className = valor;
    } else {
      el.setAttribute(clave, valor === true ? '' : String(valor));
    }
  }
  for (const hijo of hijos.flat()) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    el.append(hijo instanceof Node ? hijo : String(hijo));
  }
  return el;
};

export const mensajeError = (texto) => h('p', { class: 'mensaje mensaje-error', role: 'alert' }, texto);

export const formatearFecha = (iso) =>
  iso ? new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)) : '—';

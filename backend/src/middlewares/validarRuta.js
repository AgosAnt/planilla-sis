import { esUuid, responderValidacion } from './validadores.js';

const MAX_DESCRIPCION = 1000;

const esTextoEntre = (valor, max) => typeof valor === 'string' && valor.trim().length > 0 && valor.trim().length <= max;

// Valida los campos presentes de RutaRequest (M003). Devuelve { error } o { datos } con solo
// los campos permitidos y el texto recortado.
const normalizarCampos = (body) => {
  const datos = {};

  if (body.codigo !== undefined) {
    if (!esTextoEntre(body.codigo, 50)) return { error: 'El campo "codigo" debe ser texto de 1 a 50 caracteres.' };
    datos.codigo = body.codigo.trim();
  }
  if (body.nombre !== undefined) {
    if (!esTextoEntre(body.nombre, 100)) return { error: 'El campo "nombre" debe ser texto de 1 a 100 caracteres.' };
    datos.nombre = body.nombre.trim();
  }
  if (body.descripcion !== undefined) {
    if (body.descripcion !== null && (typeof body.descripcion !== 'string' || body.descripcion.length > MAX_DESCRIPCION)) {
      return { error: `El campo "descripcion" debe ser texto de hasta ${MAX_DESCRIPCION} caracteres o null.` };
    }
    datos.descripcion = body.descripcion === null ? null : body.descripcion.trim() || null;
  }
  if (body.supervisor_id !== undefined) {
    if (body.supervisor_id !== null && !esUuid(body.supervisor_id)) {
      return { error: 'El campo "supervisor_id" debe ser un UUID o null.' };
    }
    datos.supervisor_id = body.supervisor_id;
  }
  if (body.activa !== undefined) {
    if (typeof body.activa !== 'boolean') return { error: 'El campo "activa" debe ser booleano.' };
    datos.activa = body.activa;
  }
  return { datos };
};

export const validarRutaId = (req, res, next) => {
  if (!esUuid(req.params.rutaId)) {
    return responderValidacion(res, 'El "rutaId" debe ser un UUID.');
  }
  next();
};

// POST: codigo y nombre obligatorios.
export const validarCrearRuta = (req, res, next) => {
  const body = req.body ?? {};
  if (body.codigo === undefined || body.nombre === undefined) {
    return responderValidacion(res, 'Los campos "codigo" y "nombre" son obligatorios.');
  }
  const { error, datos } = normalizarCampos(body);
  if (error) return responderValidacion(res, error);
  req.body = datos;
  next();
};

const MAX_PUNTOS = 20;
const RADIO_MIN = 10; // mismos límites que chk_ruta_puntos_radio (M012)
const RADIO_MAX = 5000;

// PUT /rutas/{rutaId}/puntos: { puntos: [{ nombre, latitud, longitud, radio_m }] } (0 a 20; el orden es el de la lista)
export const validarPuntos = (req, res, next) => {
  const { puntos } = req.body ?? {};
  if (!Array.isArray(puntos) || puntos.length > MAX_PUNTOS) {
    return responderValidacion(res, `El campo "puntos" debe ser una lista de 0 a ${MAX_PUNTOS} puntos.`);
  }
  const limpios = [];
  for (const [i, punto] of puntos.entries()) {
    const { nombre, latitud, longitud, radio_m } = punto ?? {};
    if (!esTextoEntre(nombre, 100)) {
      return responderValidacion(res, `Punto ${i + 1}: "nombre" debe ser texto de 1 a 100 caracteres.`);
    }
    if (typeof latitud !== 'number' || !Number.isFinite(latitud) || Math.abs(latitud) > 90
        || typeof longitud !== 'number' || !Number.isFinite(longitud) || Math.abs(longitud) > 180) {
      return responderValidacion(res, `Punto ${i + 1}: "latitud" (-90 a 90) y "longitud" (-180 a 180) deben ser números.`);
    }
    if (!Number.isInteger(radio_m) || radio_m < RADIO_MIN || radio_m > RADIO_MAX) {
      return responderValidacion(res, `Punto ${i + 1}: "radio_m" debe ser un entero de ${RADIO_MIN} a ${RADIO_MAX} metros.`);
    }
    limpios.push({ nombre: nombre.trim(), latitud, longitud, radio_m });
  }
  req.body = { puntos: limpios };
  next();
};

// PATCH: solo lo que cambia, al menos un campo.
export const validarActualizarRuta = (req, res, next) => {
  const { error, datos } = normalizarCampos(req.body ?? {});
  if (error) return responderValidacion(res, error);
  if (Object.keys(datos).length === 0) {
    return responderValidacion(res, 'Envía al menos un campo a modificar: codigo, nombre, descripcion, supervisor_id o activa.');
  }
  req.body = datos;
  next();
};

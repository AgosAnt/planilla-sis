import { esUuid, esFechaIso, responderValidacion } from './validadores.js';

export const validarTrabajadorEstado = (req, res, next) => {
  if (!esUuid(req.params.trabajadorId)) return responderValidacion(res, 'El "trabajadorId" debe ser un UUID.');
  next();
};

// CambioEstadoTrabajadorRequest: { estado_codigo, inicio_at, motivo? }
export const validarCambioEstado = (req, res, next) => {
  const { estado_codigo, inicio_at, motivo = null } = req.body ?? {};
  if (typeof estado_codigo !== 'string' || !/^[A-Z_]{2,30}$/.test(estado_codigo)) {
    return responderValidacion(res, 'El campo "estado_codigo" es requerido (por ejemplo VACACIONES); ver GET /catalogos/estados-trabajador.');
  }
  if (!esFechaIso(inicio_at)) {
    return responderValidacion(res, 'El campo "inicio_at" es requerido en ISO 8601 con zona (ej. 2026-11-16T06:00:00-06:00).');
  }
  if (motivo !== null && (typeof motivo !== 'string' || motivo.length > 1000)) {
    return responderValidacion(res, 'El campo "motivo" debe ser texto de hasta 1000 caracteres.');
  }
  req.body = { estado_codigo, inicio_at, motivo: motivo?.trim() || null };
  next();
};

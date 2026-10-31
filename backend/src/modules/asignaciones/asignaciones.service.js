import { conClaims } from '../../config/db.js';
import { ZONA_OPERACION } from '../../config/negocio.js';
import { crearError } from '../../middlewares/errorHandler.js';
import { registrarAuditoria } from '../auditoria/auditoria.repository.js';
import * as asignacionesRepo from './asignaciones.repository.js';

const SOLAPAMIENTO = '23P01'; // exclusion_violation: sin_solapamiento_asignaciones (M003)
const DUPLICADO = '23505'; // unique_violation: un acuerdo por asignación y fecha (M003)

const visibilidad = (usuario) => ({ rol: usuario.rol, usuarioId: usuario.id });

const aAcuerdo = (fila) => (fila?.id
  ? {
      id: fila.id,
      asignacion_id: fila.asignacion_id,
      fecha: fila.fecha,
      turno: { id: fila.turno_id, nombre: fila.turno_nombre, hora_inicio: fila.turno_hora_inicio, hora_fin: fila.turno_hora_fin },
      estado: fila.estado,
      confirmado_por: fila.confirmado_por,
      confirmado_at: fila.confirmado_at,
    }
  : null);

const aAsignacion = (fila, acuerdo) => ({
  id: fila.id,
  ruta_id: fila.ruta_id,
  trabajador_id: fila.trabajador_id,
  trabajador_nombre: fila.trabajador_nombre,
  fecha_inicio: fila.fecha_inicio,
  fecha_fin: fila.fecha_fin,
  activa: fila.activa,
  acuerdo_turno: aAcuerdo(acuerdo),
});

const traducirErrorBd = (error) => {
  if (error.code === SOLAPAMIENTO) {
    return crearError(409, 'ASIGNACION_SOLAPADA', 'El trabajador ya tiene otra asignación en esas fechas');
  }
  if (error.code === DUPLICADO) {
    return crearError(409, 'ACUERDO_EXISTENTE', 'Ya hay un turno acordado para esa asignación en esa fecha');
  }
  return error;
};

const validarTurno = async (client, turnoId) => {
  if (!(await asignacionesRepo.existeTurno(client, turnoId))) {
    throw crearError(422, 'TURNO_INVALIDO', 'El turno no existe');
  }
};

// POST /rutas/{rutaId}/asignaciones: asigna un trabajador a la ruta y propone su turno del primer día.
export const crearAsignacion = (usuario, rutaId, datos) =>
  conClaims(usuario, async (client) => {
    const ruta = await asignacionesRepo.buscarRutaGestionable(client, { ...visibilidad(usuario), rutaId });
    if (!ruta) {
      throw crearError(404, 'RUTA_NO_ENCONTRADA', 'La ruta no existe');
    }
    if (!ruta.activa) {
      throw crearError(422, 'RUTA_INACTIVA', 'No se puede asignar trabajadores a una ruta inactiva');
    }
    if (!(await asignacionesRepo.esTrabajadorActivo(client, datos.trabajador_id))) {
      throw crearError(422, 'TRABAJADOR_INVALIDO', 'trabajador_id no corresponde a un trabajador activo');
    }
    await validarTurno(client, datos.turno_id);

    let asignacionId;
    let acuerdoId;
    try {
      asignacionId = await asignacionesRepo.crearAsignacion(client, {
        rutaId,
        trabajadorId: datos.trabajador_id,
        asignadoPor: usuario.id,
        fechaInicio: datos.fecha_inicio,
        fechaFin: datos.fecha_fin,
      });
      acuerdoId = await asignacionesRepo.crearAcuerdo(client, {
        asignacionId,
        turnoId: datos.turno_id,
        fecha: datos.fecha_inicio,
      });
    } catch (error) {
      throw traducirErrorBd(error);
    }

    const asignacion = aAsignacion(
      await asignacionesRepo.buscarAsignacion(client, asignacionId),
      await asignacionesRepo.buscarAcuerdo(client, acuerdoId),
    );
    await registrarAuditoria(client, {
      actor: usuario,
      entidad: 'asignaciones_ruta',
      entidadId: asignacionId,
      accion: 'INSERT',
      datosDespues: asignacion,
    });
    return asignacion;
  });

// GET /rutas/{rutaId}/asignaciones
export const listarAsignaciones = (usuario, rutaId, { page, pageSize }) =>
  conClaims(usuario, async (client) => {
    const ruta = await asignacionesRepo.buscarRutaGestionable(client, { ...visibilidad(usuario), rutaId });
    if (!ruta) {
      throw crearError(404, 'RUTA_NO_ENCONTRADA', 'La ruta no existe');
    }
    const total = await asignacionesRepo.contarAsignaciones(client, rutaId);
    const filas = await asignacionesRepo.listarAsignaciones(client, {
      rutaId,
      zona: ZONA_OPERACION,
      limite: pageSize,
      desplazamiento: (page - 1) * pageSize,
    });
    return { items: filas.map((fila) => aAsignacion(fila, fila.acuerdo)), page, page_size: pageSize, total };
  });

// PATCH /asignaciones/{id}: cierre (fecha_fin) o baja (activa = false). Reactivar puede chocar con otra asignación.
export const actualizarAsignacion = (usuario, asignacionId, cambios) =>
  conClaims(usuario, async (client) => {
    const actual = await asignacionesRepo.buscarAsignacionGestionable(client, {
      ...visibilidad(usuario), asignacionId, bloquear: true,
    });
    if (!actual) {
      throw crearError(404, 'ASIGNACION_NO_ENCONTRADA', 'La asignación no existe');
    }
    const fechaFin = cambios.fecha_fin !== undefined ? cambios.fecha_fin : actual.fecha_fin;
    if (fechaFin !== null && fechaFin < actual.fecha_inicio) {
      throw crearError(422, 'FECHAS_INVALIDAS', 'fecha_fin no puede ser anterior a fecha_inicio');
    }
    try {
      await asignacionesRepo.actualizarAsignacion(client, asignacionId, {
        fechaFin,
        activa: cambios.activa ?? actual.activa,
      });
    } catch (error) {
      throw traducirErrorBd(error);
    }

    const asignacion = aAsignacion(await asignacionesRepo.buscarAsignacion(client, asignacionId), null);
    await registrarAuditoria(client, {
      actor: usuario,
      entidad: 'asignaciones_ruta',
      entidadId: asignacionId,
      accion: 'UPDATE',
      datosAntes: actual,
      datosDespues: asignacion,
    });
    return asignacion;
  });

// POST /asignaciones/{id}/acuerdos: propone el turno de un día dentro de la vigencia de la asignación.
export const proponerAcuerdo = (usuario, asignacionId, datos) =>
  conClaims(usuario, async (client) => {
    const asignacion = await asignacionesRepo.buscarAsignacionGestionable(client, { ...visibilidad(usuario), asignacionId });
    if (!asignacion) {
      throw crearError(404, 'ASIGNACION_NO_ENCONTRADA', 'La asignación no existe');
    }
    const fueraDeVigencia = datos.fecha < asignacion.fecha_inicio
      || (asignacion.fecha_fin !== null && datos.fecha > asignacion.fecha_fin);
    if (!asignacion.activa || fueraDeVigencia) {
      throw crearError(422, 'FECHA_FUERA_DE_ASIGNACION', 'La asignación no está activa en esa fecha');
    }
    await validarTurno(client, datos.turno_id);

    let acuerdoId;
    try {
      acuerdoId = await asignacionesRepo.crearAcuerdo(client, { asignacionId, turnoId: datos.turno_id, fecha: datos.fecha });
    } catch (error) {
      throw traducirErrorBd(error);
    }
    const acuerdo = aAcuerdo(await asignacionesRepo.buscarAcuerdo(client, acuerdoId));
    await registrarAuditoria(client, {
      actor: usuario,
      entidad: 'acuerdos_turno',
      entidadId: acuerdoId,
      accion: 'INSERT',
      datosDespues: acuerdo,
    });
    return acuerdo;
  });

// GET /acuerdos-turno: el trabajador ve los suyos (la app móvil los usa para aceptar o rechazar).
export const listarAcuerdos = (usuario, filtros, { page, pageSize }) =>
  conClaims(usuario, async (client) => {
    const filtro = { ...visibilidad(usuario), ...filtros };
    const total = await asignacionesRepo.contarAcuerdos(client, filtro);
    const filas = await asignacionesRepo.listarAcuerdos(client, {
      ...filtro,
      limite: pageSize,
      desplazamiento: (page - 1) * pageSize,
    });
    const items = filas.map((fila) => ({ ...aAcuerdo(fila), trabajador_id: fila.trabajador_id, ruta_id: fila.ruta_id }));
    return { items, page, page_size: pageSize, total };
  });

// Cambia el estado de un acuerdo validando quién puede y desde qué estado.
const cambiarEstadoAcuerdo = (usuario, acuerdoId, { puede, desde, estado, confirmar }) =>
  conClaims(usuario, async (client) => {
    const actual = await asignacionesRepo.buscarAcuerdo(client, acuerdoId, { bloquear: true });
    if (!actual || !puede(actual)) {
      throw crearError(404, 'ACUERDO_NO_ENCONTRADO', 'El acuerdo de turno no existe');
    }
    if (actual.estado !== desde) {
      throw crearError(409, 'TRANSICION_INVALIDA', `Solo se puede pasar a ${estado} un acuerdo ${desde}; este está ${actual.estado}`);
    }
    await asignacionesRepo.actualizarEstadoAcuerdo(client, acuerdoId, {
      estado,
      confirmadoPor: confirmar ? usuario.id : null,
    });
    const acuerdo = aAcuerdo(await asignacionesRepo.buscarAcuerdo(client, acuerdoId));
    await registrarAuditoria(client, {
      actor: usuario,
      entidad: 'acuerdos_turno',
      entidadId: acuerdoId,
      accion: 'UPDATE',
      datosAntes: { estado: actual.estado },
      datosDespues: { estado: acuerdo.estado },
    });
    return acuerdo;
  });

// PATCH /acuerdos-turno/{id}/respuesta: solo el trabajador de la asignación, desde PROPUESTO.
export const responderAcuerdo = (usuario, acuerdoId, { estado }) =>
  cambiarEstadoAcuerdo(usuario, acuerdoId, {
    puede: (acuerdo) => acuerdo.trabajador_id === usuario.id,
    desde: 'PROPUESTO',
    estado,
  });

// POST /acuerdos-turno/{id}/confirmar: el administrador o el supervisor de la ruta, desde ACEPTADO.
export const confirmarAcuerdo = (usuario, acuerdoId) =>
  cambiarEstadoAcuerdo(usuario, acuerdoId, {
    puede: (acuerdo) => usuario.rol === 'administrador' || acuerdo.supervisor_id === usuario.id,
    desde: 'ACEPTADO',
    estado: 'CONFIRMADO',
    confirmar: true,
  });

// GET /catalogos/turnos
export const listarTurnos = (usuario) => conClaims(usuario, (client) => asignacionesRepo.listarTurnos(client));

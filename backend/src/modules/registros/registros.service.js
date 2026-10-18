import { conClaims } from '../../config/db.js';
import { ZONA_OPERACION, TOLERANCIA_FUTURO_MS } from '../../config/negocio.js';
import { crearError } from '../../middlewares/errorHandler.js';
import { registrarAuditoria } from '../auditoria/auditoria.repository.js';
import * as registrosRepo from './registros.repository.js';

const visibilidad = (usuario) => ({ rol: usuario.rol, usuarioId: usuario.id });
const mismoInstante = (a, b) => new Date(a).getTime() === new Date(b).getTime();

const rechazarSiEsFutura = (fecha, campo) => {
  if (fecha.getTime() - Date.now() > TOLERANCIA_FUTURO_MS) {
    throw crearError(422, 'FECHA_FUTURA', `${campo} está en el futuro; revisa la hora del dispositivo`);
  }
};

// GET /registros-tiempo: cada rol ve solo lo suyo; filtros por trabajador, fechas (zona de operación) y estado
export const listarRegistros = (usuario, filtros, { page, pageSize }) =>
  conClaims(usuario, async (client) => {
    const filtro = { ...visibilidad(usuario), ...filtros, zona: ZONA_OPERACION };
    const total = await registrosRepo.contarRegistros(client, filtro);
    const items = await registrosRepo.listarRegistros(client, {
      ...filtro,
      limite: pageSize,
      desplazamiento: (page - 1) * pageSize,
    });
    return { items, page, page_size: pageSize, total };
  });

// POST /registros-tiempo/ingreso (E-4). Devuelve { registro, creado }; creado = false en un reintento idéntico.
export const registrarIngreso = (usuario, datos) =>
  conClaims(usuario, async (client) => {
    const ingreso = new Date(datos.ingreso_at);
    rechazarSiEsFutura(ingreso, 'ingreso_at');

    // Reintento del móvil con el mismo client_uuid: mismo contenido -> 200; distinto -> 409
    const previo = await registrosRepo.buscarPorClientUuid(client, usuario.id, datos.client_uuid);
    if (previo) {
      if (previo.asignacion_id === datos.asignacion_id && mismoInstante(previo.ingreso_at, ingreso)) {
        return { registro: { id: previo.id, estado_validacion: previo.estado_validacion }, creado: false };
      }
      throw crearError(409, 'CLIENT_UUID_REUTILIZADO', 'client_uuid ya se usó con datos distintos');
    }

    const asignacion = await registrosRepo.buscarAsignacionVigente(client, {
      asignacionId: datos.asignacion_id,
      trabajadorId: usuario.id,
      ingresoAt: ingreso,
      zona: ZONA_OPERACION,
    });
    if (!asignacion) {
      throw crearError(422, 'ASIGNACION_NO_ACTIVA', 'La asignación no existe, no es tuya o no está vigente en esa fecha');
    }

    if (await registrosRepo.existeRegistroAbierto(client, usuario.id)) {
      throw crearError(409, 'REGISTRO_ABIERTO', 'Ya tienes un ingreso sin salida; registra la salida primero');
    }

    // H-12: dos jornadas del mismo trabajador no pueden solaparse (se pagarían horas dobles)
    const salidaAnterior = await registrosRepo.ultimaSalida(client, usuario.id);
    if (salidaAnterior && ingreso < salidaAnterior) {
      throw crearError(422, 'SOLAPA_JORNADA_ANTERIOR', 'El ingreso es anterior a la salida de tu jornada anterior');
    }

    // El servidor guarda la hora del dispositivo y la de recepción (recibido_en); el desfase queda para el supervisor
    const dispositivo = { ...(datos.dispositivo ?? {}), desfase_segundos: Math.round((Date.now() - ingreso.getTime()) / 1000) };

    let registro;
    try {
      registro = await registrosRepo.crearIngreso(client, {
        trabajadorId: usuario.id,
        asignacionId: asignacion.id,
        ingresoAt: ingreso,
        lat: datos.ubicacion?.lat ?? null,
        lng: datos.ubicacion?.lng ?? null,
        precision: datos.ubicacion?.precision_m ?? null,
        dispositivo,
        clientUuid: datos.client_uuid,
      });
    } catch (error) {
      // Carrera con otra petición: índice registros_uno_abierto o UNIQUE(trabajador_id, client_uuid)
      if (error.code === '23505') {
        throw crearError(409, 'REGISTRO_ABIERTO', 'Ya existe un ingreso sin salida o con ese client_uuid');
      }
      throw error;
    }

    const turno = await registrosRepo.buscarTurno(client, { asignacionId: asignacion.id, ingresoAt: ingreso, zona: ZONA_OPERACION });
    const respuesta = { id: registro.id, estado_validacion: registro.estado_validacion };
    if (turno) respuesta.turno = turno;
    if (datos.ubicacion) {
      const dentro = await registrosRepo.dentroDeGeocerca(client, { rutaId: asignacion.ruta_id, ...datos.ubicacion });
      if (dentro !== null) respuesta.dentro_de_geocerca = dentro;
    }
    return { registro: respuesta, creado: true };
  });

// PATCH /registros-tiempo/{id}/salida: solo el trabajador dueño y mientras el registro siga PENDIENTE
export const registrarSalida = (usuario, registroId, datos) =>
  conClaims(usuario, async (client) => {
    const salida = new Date(datos.salida_at);

    const registro = await registrosRepo.buscarRegistro(client, { ...visibilidad(usuario), registroId });
    if (!registro || registro.trabajador_id !== usuario.id) {
      throw crearError(404, 'REGISTRO_NO_ENCONTRADO', 'El registro de tiempo no existe');
    }

    // Reintento idéntico -> mismo resultado; otra hora -> conflicto
    if (registro.salida_at) {
      if (mismoInstante(registro.salida_at, salida)) {
        return { id: registro.id, salida_at: registro.salida_at, estado_validacion: registro.estado_validacion };
      }
      throw crearError(409, 'SALIDA_YA_REGISTRADA', 'La salida de este registro ya fue registrada');
    }

    if (registro.estado_validacion !== 'PENDIENTE' ||
        !(await registrosRepo.buscarRegistro(client, { ...visibilidad(usuario), registroId, bloquear: true }))) {
      throw crearError(409, 'ESTADO_INVALIDO', 'El registro ya fue validado y no admite cambios');
    }

    rechazarSiEsFutura(salida, 'salida_at');
    if (salida <= registro.ingreso_at) {
      throw crearError(422, 'RANGO_INVALIDO', 'salida_at debe ser posterior al ingreso');
    }
    const finDescansos = await registrosRepo.ultimoFinDescanso(client, registroId);
    if (finDescansos && salida < finDescansos) {
      throw crearError(422, 'DESCANSO_POSTERIOR_A_SALIDA', 'Hay un descanso que termina después de esta salida');
    }

    return registrosRepo.registrarSalida(client, registroId, {
      salidaAt: salida,
      lat: datos.ubicacion?.lat ?? null,
      lng: datos.ubicacion?.lng ?? null,
    });
  });

// PATCH /registros-tiempo/{id}/validacion: supervisor de ese trabajador o administrador (CU-10)
export const validarRegistro = (usuario, registroId, { estado_validacion: estado, observaciones }) =>
  conClaims(usuario, async (client) => {
    if (estado === 'RECHAZADA' && !observaciones) {
      throw crearError(422, 'OBSERVACIONES_REQUERIDAS', 'Para rechazar un registro hay que indicar el motivo en observaciones');
    }

    const registro = await registrosRepo.buscarRegistro(client, { ...visibilidad(usuario), registroId, bloquear: true });
    if (!registro) {
      throw crearError(404, 'REGISTRO_NO_ENCONTRADO', 'El registro de tiempo no existe');
    }
    if (!registro.salida_at) {
      throw crearError(409, 'REGISTRO_ABIERTO', 'No se puede validar una jornada sin salida');
    }
    if (!['PENDIENTE', 'CORREGIDA'].includes(registro.estado_validacion)) {
      throw crearError(409, 'ESTADO_INVALIDO', `El registro ya está ${registro.estado_validacion}`);
    }

    const validado = await registrosRepo.validarRegistro(client, registroId, { estado, observaciones, validadoPor: usuario.id });

    await registrarAuditoria(client, {
      actor: usuario,
      entidad: 'registros_tiempo',
      entidadId: registroId,
      accion: estado === 'APROBADA' ? 'APROBAR' : 'RECHAZAR',
      datosAntes: { estado_validacion: registro.estado_validacion },
      datosDespues: { estado_validacion: estado, observaciones },
    });

    return validado;
  });

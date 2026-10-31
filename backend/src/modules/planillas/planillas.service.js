import { conClaims } from '../../config/db.js';
import { ZONA_OPERACION } from '../../config/negocio.js';
import { crearError } from '../../middlewares/errorHandler.js';
import { registrarAuditoria } from '../auditoria/auditoria.repository.js';
import * as planillasRepo from './planillas.repository.js';
import { calcularTrabajador } from './motorCalculo.js';

const DUPLICADO = '23505';
const SEGREGACION = '23514'; // chk_segreg_* de M005: quien calcula, verifica y aprueba deben ser distintos

// ------------------------------- Períodos -------------------------------
export const crearPeriodo = (admin, datos) =>
  conClaims(admin, async (client) => {
    let periodo;
    try {
      periodo = await planillasRepo.crearPeriodo(client, {
        codigo: datos.codigo, fechaInicio: datos.fecha_inicio, fechaFin: datos.fecha_fin,
      });
    } catch (error) {
      if (error.code === DUPLICADO) {
        throw crearError(409, 'PERIODO_DUPLICADO', 'Ya existe un período con ese código o esas fechas');
      }
      throw error;
    }
    await registrarAuditoria(client, { actor: admin, entidad: 'periodos_planilla', entidadId: periodo.id, accion: 'INSERT', datosDespues: periodo });
    return periodo;
  });

export const listarPeriodos = (usuario, { page, pageSize }) =>
  conClaims(usuario, async (client) => {
    const total = await planillasRepo.contarPeriodos(client);
    const items = await planillasRepo.listarPeriodos(client, { limite: pageSize, desplazamiento: (page - 1) * pageSize });
    return { items, page, page_size: pageSize, total };
  });

// ------------------------------- Cálculo -------------------------------
// El supervisor solo calcula planillas de rutas a su cargo: el RLS solo le deja ver las jornadas de sus
// trabajadores, así que una planilla general calculada por él quedaría incompleta. La general la calcula el admin.
const validarQuienCalcula = async (client, usuario, rutaId) => {
  if (usuario.rol === 'administrador') return;
  if (rutaId === null) {
    throw crearError(403, 'PLANILLA_GENERAL_SOLO_ADMIN', 'La planilla general (sin ruta) la calcula el administrador');
  }
  const { rows } = await client.query('SELECT app.gestiona_ruta($1) AS gestiona;', [rutaId]);
  if (!rows[0].gestiona) {
    throw crearError(404, 'RUTA_NO_ENCONTRADA', 'La ruta no existe o no está a tu cargo');
  }
};

// Lee todo lo necesario, calcula a cada trabajador con el motor y reemplaza el detalle de la planilla.
const calcularYGuardar = async (client, planilla, periodo) => {
  const jornadas = await planillasRepo.jornadasDelPeriodo(client, {
    fechaInicio: periodo.fecha_inicio, fechaFin: periodo.fecha_fin, rutaId: planilla.ruta_id, zona: ZONA_OPERACION,
  });

  // Regla 13: solo jornadas aprobadas o corregidas; si queda alguna pendiente o sin salida, no se calcula
  const pendientes = jornadas.filter((j) => j.estado_validacion === 'PENDIENTE' || j.salida_at === null);
  if (pendientes.length > 0) {
    const ejemplos = pendientes.slice(0, 10).map((j) => j.id).join(', ');
    throw crearError(409, 'JORNADAS_PENDIENTES',
      `Hay ${pendientes.length} jornada(s) pendiente(s) de validar o sin salida en el período; valídalas antes de calcular: ${ejemplos}`);
  }

  const ids = jornadas.map((j) => j.id);
  const descansos = await planillasRepo.descansosDe(client, ids);
  const turnos = new Map((await planillasRepo.turnosDe(client, ids, ZONA_OPERACION)).map((t) => [t.registro_id, t.hora_inicio]));
  const trabajadorIds = [...new Set(jornadas.map((j) => j.trabajador_id))];
  const tarifas = await planillasRepo.tarifasDe(client, trabajadorIds);
  const parametros = await planillasRepo.parametrosDePago(client);
  const feriados = new Map((await planillasRepo.feriadosEntre(client, periodo.fecha_inicio, periodo.fecha_fin))
    .map((f) => [f.fecha, { medio_dia: f.medio_dia }]));

  const resultados = [];
  const sinTarifa = [];
  for (const trabajadorId of trabajadorIds) {
    const suyas = jornadas
      .filter((j) => j.trabajador_id === trabajadorId)
      .map((j) => ({
        id: j.id, ingreso_at: j.ingreso_at, salida_at: j.salida_at, turno_hora_inicio: turnos.get(j.id) ?? null,
        descansos: descansos.filter((d) => d.registro_tiempo_id === j.id),
      }));
    try {
      resultados.push({
        trabajadorId,
        r: calcularTrabajador({
          jornadas: suyas, tarifas: tarifas.filter((t) => t.trabajador_id === trabajadorId), parametros, feriados, zona: ZONA_OPERACION,
        }),
      });
    } catch (error) {
      if (error.code !== 'SIN_TARIFA') throw error;
      sinTarifa.push(trabajadorId);
    }
  }
  if (sinTarifa.length > 0) {
    throw crearError(422, 'TARIFA_FALTANTE',
      `${sinTarifa.length} trabajador(es) sin tarifa vigente en el período: ${sinTarifa.join(', ')}. Regístrala en /trabajadores/{id}/tarifas`);
  }

  await planillasRepo.borrarDetalle(client, planilla.id);
  for (const { trabajadorId, r } of resultados) {
    const detalleId = await planillasRepo.insertarDetalle(client, planilla.id, trabajadorId, r);
    await planillasRepo.insertarConceptos(client, detalleId, r.conceptos);
  }
  return resultados.length;
};

// POST /planillas: crea la planilla del período (general o de una ruta) y la calcula en la misma transacción.
export const crearPlanilla = (usuario, datos) =>
  conClaims(usuario, async (client) => {
    const periodo = await planillasRepo.buscarPeriodo(client, datos.periodo_id, { bloquear: true });
    if (!periodo) throw crearError(404, 'PERIODO_NO_ENCONTRADO', 'El período no existe');
    if (['CERRADO', 'PAGADO'].includes(periodo.estado)) {
      throw crearError(409, 'PERIODO_CERRADO', `El período está ${periodo.estado}`);
    }
    await validarQuienCalcula(client, usuario, datos.ruta_id);

    let planillaId;
    try {
      planillaId = await planillasRepo.crearPlanilla(client, { periodoId: periodo.id, rutaId: datos.ruta_id, calculadaPor: usuario.id });
    } catch (error) {
      if (error.code === DUPLICADO) {
        throw crearError(409, 'PLANILLA_EXISTENTE', 'Ya existe la planilla de ese período para esa ruta; usa /planillas/{id}/calcular');
      }
      throw error;
    }
    const planilla = await planillasRepo.buscarPlanilla(client, planillaId);
    const trabajadores = await calcularYGuardar(client, planilla, periodo);
    if (periodo.estado === 'BORRADOR') await planillasRepo.actualizarEstadoPeriodo(client, periodo.id, 'EN_CALCULO');

    const calculada = await planillasRepo.buscarPlanilla(client, planillaId);
    await registrarAuditoria(client, {
      actor: usuario, entidad: 'planillas', entidadId: planillaId, accion: 'INSERT', datosDespues: { ...calculada, trabajadores },
    });
    return calculada;
  });

// POST /planillas/{id}/calcular: recalcula mientras siga CALCULADA (después de verificar ya no cambia).
export const recalcularPlanilla = (usuario, planillaId) =>
  conClaims(usuario, async (client) => {
    const planilla = await planillasRepo.buscarPlanilla(client, planillaId, { bloquear: true });
    if (!planilla) throw crearError(404, 'PLANILLA_NO_ENCONTRADA', 'La planilla no existe');
    if (planilla.estado !== 'CALCULADA') {
      throw crearError(409, 'PLANILLA_NO_RECALCULABLE', `La planilla está ${planilla.estado}; solo se recalcula mientras está CALCULADA`);
    }
    await validarQuienCalcula(client, usuario, planilla.ruta_id);
    const periodo = await planillasRepo.buscarPeriodo(client, planilla.periodo_id);
    const trabajadores = await calcularYGuardar(client, planilla, periodo);
    try {
      await planillasRepo.marcarCalculada(client, planillaId, usuario.id);
    } catch (error) {
      if (error.code === SEGREGACION) throw crearError(409, 'SEGREGACION_FUNCIONES', 'Quien calcula no puede ser quien verificó o aprobó');
      throw error;
    }
    const calculada = await planillasRepo.buscarPlanilla(client, planillaId);
    await registrarAuditoria(client, {
      actor: usuario, entidad: 'planillas', entidadId: planillaId, accion: 'UPDATE', datosDespues: { ...calculada, trabajadores },
    });
    return calculada;
  });

// Planilla con su resumen y el detalle paginado (para la web)
const armarCalculo = async (client, periodo, planilla, { page, pageSize }) => {
  const resumen = await planillasRepo.resumenDetalle(client, planilla.id);
  const detalle = await planillasRepo.listarDetalle(client, planilla.id, { limite: pageSize, desplazamiento: (page - 1) * pageSize });
  return {
    periodo: { id: periodo.id, codigo: periodo.codigo, desde: periodo.fecha_inicio, hasta: periodo.fecha_fin, estado: periodo.estado },
    planilla,
    resumen,
    detalle,
    page,
    page_size: pageSize,
    total: resumen.trabajadores,
  };
};

// GET /planillas/periodos/{periodoId}/calculo?ruta_id=: la planilla del período (general si no se indica ruta)
export const obtenerCalculoPeriodo = (usuario, periodoId, rutaId, paginacion) =>
  conClaims(usuario, async (client) => {
    const periodo = await planillasRepo.buscarPeriodo(client, periodoId);
    if (!periodo) throw crearError(404, 'PERIODO_NO_ENCONTRADO', 'El período no existe');
    const planilla = await planillasRepo.buscarPlanillaDePeriodo(client, periodoId, rutaId);
    if (!planilla) throw crearError(404, 'PLANILLA_NO_ENCONTRADA', 'Ese período todavía no tiene planilla calculada');
    return armarCalculo(client, periodo, planilla, paginacion);
  });

// GET /planillas/{id}
export const obtenerPlanilla = (usuario, planillaId, paginacion) =>
  conClaims(usuario, async (client) => {
    const planilla = await planillasRepo.buscarPlanilla(client, planillaId);
    if (!planilla) throw crearError(404, 'PLANILLA_NO_ENCONTRADA', 'La planilla no existe');
    const periodo = await planillasRepo.buscarPeriodo(client, planilla.periodo_id);
    return armarCalculo(client, periodo, planilla, paginacion);
  });

// GET /planillas?periodo_id=
export const listarPlanillas = (usuario, periodoId) =>
  conClaims(usuario, async (client) => {
    const periodo = await planillasRepo.buscarPeriodo(client, periodoId);
    if (!periodo) throw crearError(404, 'PERIODO_NO_ENCONTRADO', 'El período no existe');
    return { periodo, items: await planillasRepo.listarPlanillas(client, periodoId) };
  });

// POST /planillas/{id}/verificar: revisión independiente por un supervisor distinto de quien calculó.
export const verificarPlanilla = (supervisor, planillaId, datos) =>
  conClaims(supervisor, async (client) => {
    const planilla = await planillasRepo.buscarPlanilla(client, planillaId, { bloquear: true });
    if (!planilla) throw crearError(404, 'PLANILLA_NO_ENCONTRADA', 'La planilla no existe');
    if (planilla.estado !== 'CALCULADA') {
      throw crearError(409, 'TRANSICION_INVALIDA', `Solo se verifica una planilla CALCULADA; esta está ${planilla.estado}`);
    }
    if (planilla.calculada_por === supervisor.id) {
      throw crearError(409, 'SEGREGACION_FUNCIONES', 'Quien calculó la planilla no puede verificarla');
    }
    if ((await planillasRepo.contarDetalle(client, planillaId)) === 0) {
      throw crearError(422, 'PLANILLA_VACIA', 'La planilla no tiene trabajadores; recalcúlala antes de verificar');
    }
    const verificada = await planillasRepo.marcarVerificada(client, planillaId, supervisor.id);
    await registrarAuditoria(client, {
      actor: supervisor, entidad: 'planillas', entidadId: planillaId, accion: 'VERIFICAR',
      datosAntes: { estado: planilla.estado },
      datosDespues: { estado: verificada.estado, observaciones: datos.observaciones, excepciones_revisadas: datos.excepciones_revisadas },
    });
    return verificada;
  });

// GET /me/calculo?desde&hasta: horas propias de jornadas aprobadas (sin montos: la tarifa no la ve el trabajador).
export const miCalculo = (trabajador, desde, hasta) =>
  conClaims(trabajador, async (client) => {
    const jornadas = await planillasRepo.jornadasDelPeriodo(client, {
      fechaInicio: desde, fechaFin: hasta, rutaId: null, trabajadorId: trabajador.id, zona: ZONA_OPERACION,
    });
    const aprobadas = jornadas.filter((j) => j.salida_at !== null && j.estado_validacion !== 'PENDIENTE');
    const ids = aprobadas.map((j) => j.id);
    const descansos = await planillasRepo.descansosDe(client, ids);
    const turnos = new Map((await planillasRepo.turnosDe(client, ids, ZONA_OPERACION)).map((t) => [t.registro_id, t.hora_inicio]));
    const parametros = await planillasRepo.parametrosDePago(client);
    const feriados = new Map((await planillasRepo.feriadosEntre(client, desde, hasta)).map((f) => [f.fecha, { medio_dia: f.medio_dia }]));
    // Tarifa simbólica: aquí solo interesan las horas
    const r = calcularTrabajador({
      jornadas: aprobadas.map((j) => ({
        id: j.id, ingreso_at: j.ingreso_at, salida_at: j.salida_at, turno_hora_inicio: turnos.get(j.id) ?? null,
        descansos: descansos.filter((d) => d.registro_tiempo_id === j.id),
      })),
      tarifas: [{ monto_hora: '0.00', monto_hora_extra: null, vigente_desde: '0001-01-01', vigente_hasta: null }],
      parametros, feriados, zona: ZONA_OPERACION,
    });
    return {
      desde,
      hasta,
      horas_ordinarias: r.horas_ordinarias,
      horas_extra_diurnas: r.horas_extra_diurnas,
      horas_extra_nocturnas: r.horas_extra_nocturnas,
      jornadas_contadas: aprobadas.length,
      jornadas_pendientes: jornadas.length - aprobadas.length,
    };
  });

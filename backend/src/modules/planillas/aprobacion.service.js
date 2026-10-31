import { createHash } from 'node:crypto';
import { conClaims } from '../../config/db.js';
import { ZONA_OPERACION } from '../../config/negocio.js';
import { crearError } from '../../middlewares/errorHandler.js';
import { registrarAuditoria } from '../auditoria/auditoria.repository.js';
import * as planillasRepo from './planillas.repository.js';
import * as aprobacionRepo from './aprobacion.repository.js';

const SEGREGACION = '23514'; // chk_segreg_* de M005
const PAGO_DUPLICADO = '23505'; // pagos_uno_procesado_por_detalle (M005)

const aCentavos = (texto) => Math.round(Number(texto) * 100);
const aTexto = (centavos) => (centavos / 100).toFixed(2);

// SHA-256 del detalle aprobado: si alguien lo alterara después, el hash ya no coincidiría
const hashIntegridad = (planilla, detalle) =>
  createHash('sha256')
    .update(JSON.stringify({ planilla_id: planilla.id, periodo_id: planilla.periodo_id, ruta_id: planilla.ruta_id, detalle }))
    .digest('hex');

// POST /planillas/{id}/aprobar (administrador con reautenticación): VERIFICADA -> APROBADA.
// total_esperado obliga al aprobador a confirmar el total que vio; desde aquí los montos no cambian (RN-07).
export const aprobarPlanilla = (admin, planillaId, datos) =>
  conClaims(admin, async (client) => {
    const planilla = await planillasRepo.buscarPlanilla(client, planillaId, { bloquear: true });
    if (!planilla) throw crearError(404, 'PLANILLA_NO_ENCONTRADA', 'La planilla no existe');
    if (planilla.estado !== 'VERIFICADA') {
      throw crearError(409, 'TRANSICION_INVALIDA', `Solo se aprueba una planilla VERIFICADA; esta está ${planilla.estado}`);
    }
    if (admin.id === planilla.calculada_por || admin.id === planilla.verificada_por) {
      throw crearError(409, 'SEGREGACION_FUNCIONES', 'Quien aprueba no puede ser quien calculó ni quien verificó la planilla');
    }

    const detalle = await aprobacionRepo.detalleParaHash(client, planillaId);
    const total = detalle.reduce((suma, d) => suma + aCentavos(d.neto), 0);
    if (aCentavos(datos.total_esperado) !== total) {
      throw crearError(409, 'TOTAL_NO_COINCIDE', `El total indicado (${datos.total_esperado}) no coincide con el neto de la planilla (${aTexto(total)})`);
    }

    const hash = hashIntegridad(planilla, detalle);
    let aprobada;
    try {
      aprobada = await aprobacionRepo.marcarAprobada(client, planillaId, admin.id, hash);
    } catch (error) {
      if (error.code === SEGREGACION) throw crearError(409, 'SEGREGACION_FUNCIONES', 'Quien aprueba no puede haber calculado ni verificado');
      throw error;
    }
    await registrarAuditoria(client, {
      actor: admin, entidad: 'planillas', entidadId: planillaId, accion: 'APROBAR',
      datosAntes: { estado: planilla.estado },
      datosDespues: { estado: aprobada.estado, total_neto: aTexto(total), hash_integridad: hash, comentario: datos.comentario ?? null },
    });
    return aprobada;
  });

// POST /planillas/{id}/pagos (administrador con reautenticación): un pago por trabajador, por el neto exacto.
// Cuando todos los trabajadores tienen pago, la planilla pasa a PAGADA (y el período, si todas sus planillas lo están).
export const registrarPagos = (admin, planillaId, datos) =>
  conClaims(admin, async (client) => {
    const planilla = await planillasRepo.buscarPlanilla(client, planillaId, { bloquear: true });
    if (!planilla) throw crearError(404, 'PLANILLA_NO_ENCONTRADA', 'La planilla no existe');
    if (planilla.estado === 'PAGADA') throw crearError(409, 'PLANILLA_PAGADA', 'La planilla ya está pagada');
    if (planilla.estado !== 'APROBADA') {
      throw crearError(409, 'TRANSICION_INVALIDA', `Solo se registran pagos de una planilla APROBADA; esta está ${planilla.estado}`);
    }
    if (!(await aprobacionRepo.existeMetodoPago(client, datos.metodo_id))) {
      throw crearError(422, 'METODO_PAGO_INVALIDO', 'El método de pago no existe');
    }

    const detalles = new Map((await aprobacionRepo.detallesDePlanilla(client, planillaId, datos.pagos.map((p) => p.detalle_id)))
      .map((d) => [d.id, d]));
    for (const pago of datos.pagos) {
      const detalle = detalles.get(pago.detalle_id);
      if (!detalle) throw crearError(422, 'DETALLE_AJENO', `El detalle ${pago.detalle_id} no pertenece a esta planilla`);
      if (detalle.pagado) throw crearError(409, 'PAGO_DUPLICADO', `El detalle ${pago.detalle_id} ya tiene un pago registrado`);
      if (aCentavos(pago.monto) !== aCentavos(detalle.neto)) {
        throw crearError(422, 'MONTO_DISTINTO_DEL_NETO', `El pago del detalle ${pago.detalle_id} (${pago.monto}) debe ser igual al neto (${detalle.neto})`);
      }
    }

    for (const pago of datos.pagos) {
      try {
        await aprobacionRepo.insertarPago(client, {
          detalleId: pago.detalle_id, metodoId: datos.metodo_id, referencia: pago.referencia ?? null, monto: pago.monto,
          fechaPago: datos.fecha_pago, zona: ZONA_OPERACION, registradoPor: admin.id,
        });
      } catch (error) {
        if (error.code === PAGO_DUPLICADO) throw crearError(409, 'PAGO_DUPLICADO', 'Uno de los trabajadores ya tiene un pago registrado');
        throw error;
      }
    }

    let estado = planilla.estado;
    if ((await aprobacionRepo.contarDetallesSinPago(client, planillaId)) === 0) {
      await aprobacionRepo.marcarPagada(client, planillaId);
      estado = 'PAGADA';
      if ((await aprobacionRepo.contarPlanillasSinPagar(client, planilla.periodo_id)) === 0) {
        await planillasRepo.actualizarEstadoPeriodo(client, planilla.periodo_id, 'PAGADO');
      }
    }

    const totalPagado = aTexto(datos.pagos.reduce((suma, p) => suma + aCentavos(p.monto), 0));
    await registrarAuditoria(client, {
      actor: admin, entidad: 'planillas', entidadId: planillaId, accion: 'PAGAR',
      datosDespues: { estado, pagos_registrados: datos.pagos.length, total_pagado: totalPagado, metodo_id: datos.metodo_id, fecha_pago: datos.fecha_pago },
    });
    return { planilla_id: planillaId, estado, pagos_registrados: datos.pagos.length, total_pagado: totalPagado };
  });

// GET /planillas/{id}/pagos
export const listarPagos = (admin, planillaId) =>
  conClaims(admin, async (client) => {
    const planilla = await planillasRepo.buscarPlanilla(client, planillaId);
    if (!planilla) throw crearError(404, 'PLANILLA_NO_ENCONTRADA', 'La planilla no existe');
    return { planilla_id: planillaId, estado: planilla.estado, items: await aprobacionRepo.listarPagos(client, planillaId) };
  });

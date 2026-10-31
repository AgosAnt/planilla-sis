import { conClaims } from '../../config/db.js';
import { crearError } from '../../middlewares/errorHandler.js';
import { registrarAuditoria } from '../auditoria/auditoria.repository.js';
import * as parametrosRepo from './parametros.repository.js';

const SOLAPAMIENTO = '23P01'; // sin_solapamiento_tarifas (M005)
const DUPLICADO = '23505';

// ------------------------------- Parámetros de pago -------------------------------
export const obtenerParametros = (usuario) => conClaims(usuario, (client) => parametrosRepo.obtenerParametros(client));

export const actualizarParametros = (admin, cambios) =>
  conClaims(admin, async (client) => {
    const antes = await parametrosRepo.obtenerParametros(client, { bloquear: true });
    await parametrosRepo.actualizarParametros(client, cambios);
    const despues = await parametrosRepo.obtenerParametros(client);
    await registrarAuditoria(client, {
      actor: admin, entidad: 'parametros_pago', entidadId: '1', accion: 'UPDATE', datosAntes: antes, datosDespues: despues,
    });
    return despues;
  });

// ------------------------------- Feriados -------------------------------
export const listarFeriados = (usuario, anio) => conClaims(usuario, (client) => parametrosRepo.listarFeriados(client, anio));

export const crearFeriado = (admin, datos) =>
  conClaims(admin, async (client) => {
    let feriado;
    try {
      feriado = await parametrosRepo.crearFeriado(client, { fecha: datos.fecha, nombre: datos.nombre, medioDia: datos.medio_dia });
    } catch (error) {
      if (error.code === DUPLICADO) throw crearError(409, 'FERIADO_EXISTENTE', 'Ya hay un feriado en esa fecha');
      throw error;
    }
    await registrarAuditoria(client, { actor: admin, entidad: 'feriados', entidadId: feriado.fecha, accion: 'INSERT', datosDespues: feriado });
    return feriado;
  });

export const borrarFeriado = (admin, fecha) =>
  conClaims(admin, async (client) => {
    const feriado = await parametrosRepo.borrarFeriado(client, fecha);
    if (!feriado) throw crearError(404, 'FERIADO_NO_ENCONTRADO', 'No hay feriado en esa fecha');
    await registrarAuditoria(client, { actor: admin, entidad: 'feriados', entidadId: fecha, accion: 'DELETE', datosAntes: feriado });
  });

// ------------------------------- Tarifas -------------------------------
export const listarTarifas = (usuario, trabajadorId) =>
  conClaims(usuario, (client) => parametrosRepo.listarTarifas(client, trabajadorId));

// Nueva tarifa desde una fecha: cierra la vigente el día anterior (las tarifas no se editan, se reemplazan).
export const crearTarifa = (admin, trabajadorId, datos) =>
  conClaims(admin, async (client) => {
    if (!(await parametrosRepo.esTrabajadorActivo(client, trabajadorId))) {
      throw crearError(422, 'TRABAJADOR_INVALIDO', 'trabajadorId no corresponde a un trabajador activo');
    }
    const abierta = await parametrosRepo.tarifaAbierta(client, trabajadorId);
    if (abierta && abierta.vigente_desde >= datos.vigente_desde) {
      throw crearError(409, 'TARIFA_SOLAPADA', `La tarifa vigente empieza el ${abierta.vigente_desde}; la nueva debe empezar después`);
    }
    let tarifa;
    try {
      if (abierta) {
        const diaAnterior = new Date(`${datos.vigente_desde}T00:00:00Z`);
        diaAnterior.setUTCDate(diaAnterior.getUTCDate() - 1);
        await parametrosRepo.cerrarTarifa(client, abierta.id, diaAnterior.toISOString().slice(0, 10));
      }
      tarifa = await parametrosRepo.crearTarifa(client, {
        trabajadorId, montoHora: datos.monto_hora, montoHoraExtra: datos.monto_hora_extra, vigenteDesde: datos.vigente_desde,
      });
    } catch (error) {
      if (error.code === SOLAPAMIENTO) throw crearError(409, 'TARIFA_SOLAPADA', 'La tarifa se cruza con otra del trabajador');
      throw error;
    }
    await registrarAuditoria(client, {
      actor: admin, entidad: 'tarifas_trabajador', entidadId: tarifa.id, accion: 'INSERT', datosAntes: abierta ?? null, datosDespues: tarifa,
    });
    return tarifa;
  });

import { conClaims } from '../../config/db.js';
import { TOLERANCIA_FUTURO_MS } from '../../config/negocio.js';
import { crearError } from '../../middlewares/errorHandler.js';
import { registrarAuditoria } from '../auditoria/auditoria.repository.js';
import * as estadosRepo from './estados.repository.js';

const SOLAPAMIENTO = '23P01'; // sin_solapamiento_estados (M007)

// ------------------------------- Catálogos -------------------------------
export const listarEstados = (usuario) => conClaims(usuario, (client) => estadosRepo.listarEstados(client));
export const listarTiposDescanso = (usuario) => conClaims(usuario, (client) => estadosRepo.listarTiposDescanso(client));

// El trabajador solo se ve a sí mismo; el supervisor, a los trabajadores de sus rutas; el administrador, a todos.
const validarAcceso = async (client, usuario, trabajadorId) => {
  if (usuario.rol === 'trabajador' && usuario.id !== trabajadorId) {
    throw crearError(404, 'TRABAJADOR_NO_ENCONTRADO', 'El trabajador no existe');
  }
  if (usuario.rol === 'supervisor') {
    const { rows } = await client.query('SELECT app.supervisa_trabajador($1) AS supervisa;', [trabajadorId]);
    if (!rows[0].supervisa) throw crearError(404, 'TRABAJADOR_NO_ENCONTRADO', 'El trabajador no existe o no está en tus rutas');
  }
  if (!(await estadosRepo.esTrabajador(client, trabajadorId))) {
    throw crearError(404, 'TRABAJADOR_NO_ENCONTRADO', 'El trabajador no existe');
  }
};

// GET /trabajadores/{id}/estado
export const obtenerEstadoActual = (usuario, trabajadorId) =>
  conClaims(usuario, async (client) => {
    await validarAcceso(client, usuario, trabajadorId);
    const actual = await estadosRepo.estadoActual(client, trabajadorId);
    if (!actual) throw crearError(404, 'SIN_ESTADO_REGISTRADO', 'El trabajador todavía no tiene estados registrados');
    return actual;
  });

// GET /trabajadores/{id}/estados/historial
export const listarHistorial = (usuario, trabajadorId, { page, pageSize }) =>
  conClaims(usuario, async (client) => {
    await validarAcceso(client, usuario, trabajadorId);
    const total = await estadosRepo.contarHistorial(client, trabajadorId);
    const items = await estadosRepo.listarHistorial(client, trabajadorId, { limite: pageSize, desplazamiento: (page - 1) * pageSize });
    return { items, page, page_size: pageSize, total };
  });

// POST /trabajadores/{id}/estado (CU-03): cierra el estado vigente en inicio_at y abre el nuevo, en una transacción.
export const cambiarEstado = (usuario, trabajadorId, datos) =>
  conClaims(usuario, async (client) => {
    await validarAcceso(client, usuario, trabajadorId);
    const estado = await estadosRepo.buscarEstadoPorCodigo(client, datos.estado_codigo);
    if (!estado) throw crearError(422, 'ESTADO_INVALIDO', 'El estado no existe; ver GET /catalogos/estados-trabajador');
    const inicio = new Date(datos.inicio_at);
    if (inicio.getTime() - Date.now() > TOLERANCIA_FUTURO_MS) {
      throw crearError(422, 'FECHA_FUTURA', 'inicio_at está en el futuro');
    }

    const actual = await estadosRepo.estadoActual(client, trabajadorId, { bloquear: true });
    if (actual) {
      if (actual.estado.id === estado.id) throw crearError(409, 'ESTADO_SIN_CAMBIO', `El trabajador ya está en ${estado.codigo}`);
      if (inicio <= new Date(actual.inicio_at)) {
        throw crearError(422, 'INICIO_ANTERIOR_AL_ESTADO_ACTUAL', 'inicio_at debe ser posterior al inicio del estado vigente');
      }
    }

    let nuevoId;
    try {
      if (actual) await estadosRepo.cerrarEstado(client, actual.id, inicio.toISOString());
      nuevoId = await estadosRepo.crearEstado(client, {
        trabajadorId, estadoId: estado.id, inicioAt: inicio.toISOString(), motivo: datos.motivo, cambiadoPor: usuario.id,
      });
    } catch (error) {
      if (error.code === SOLAPAMIENTO) throw crearError(409, 'ESTADO_SOLAPADO', 'El intervalo se cruza con otro estado del trabajador');
      throw error;
    }
    const nuevo = await estadosRepo.buscarHistorial(client, nuevoId);
    await registrarAuditoria(client, {
      actor: usuario, entidad: 'historial_estado_trabajador', entidadId: nuevoId, accion: 'INSERT',
      datosAntes: actual ? { estado: actual.estado.codigo, inicio_at: actual.inicio_at } : null,
      datosDespues: { estado: estado.codigo, inicio_at: nuevo.inicio_at, motivo: datos.motivo },
    });
    return nuevo;
  });

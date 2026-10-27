import { conClaims } from '../../config/db.js';
import { crearError } from '../../middlewares/errorHandler.js';
import { registrarAuditoria } from '../auditoria/auditoria.repository.js';
import * as rutasRepo from './rutas.repository.js';

const CODIGO_DUPLICADO = '23505'; // unique_violation (rutas.codigo es UNIQUE)

const visibilidad = (usuario) => ({ rol: usuario.rol, usuarioId: usuario.id });

const conCodigoUnico = async (operacion) => {
  try {
    return await operacion();
  } catch (error) {
    if (error.code === CODIGO_DUPLICADO) {
      throw crearError(409, 'CODIGO_DUPLICADO', 'Ya existe una ruta con ese código');
    }
    throw error;
  }
};

// Un supervisor solo gestiona rutas a su cargo; el administrador puede asignar cualquier supervisor activo.
const validarSupervisor = async (client, usuario, supervisorId) => {
  if (usuario.rol === 'supervisor' && supervisorId !== usuario.id) {
    throw crearError(403, 'SUPERVISOR_AJENO', 'Un supervisor solo puede gestionar rutas a su cargo');
  }
  if (supervisorId !== null && !(await rutasRepo.esSupervisorActivo(client, supervisorId))) {
    throw crearError(422, 'SUPERVISOR_INVALIDO', 'supervisor_id no corresponde a un supervisor activo');
  }
};

export const listarRutas = (usuario, { page, pageSize }) =>
  conClaims(usuario, async (client) => {
    const filtro = visibilidad(usuario);
    const total = await rutasRepo.contarRutas(client, filtro);
    const items = await rutasRepo.listarRutas(client, {
      ...filtro,
      limite: pageSize,
      desplazamiento: (page - 1) * pageSize,
    });
    return { items, page, page_size: pageSize, total };
  });

export const obtenerRuta = (usuario, rutaId) =>
  conClaims(usuario, async (client) => {
    const ruta = await rutasRepo.buscarRuta(client, { ...visibilidad(usuario), rutaId });
    if (!ruta) {
      throw crearError(404, 'RUTA_NO_ENCONTRADA', 'La ruta no existe');
    }
    return ruta;
  });

export const crearRuta = (usuario, datos) =>
  conClaims(usuario, async (client) => {
    // Si un supervisor no indica supervisor_id, la ruta queda a su cargo
    const supervisorId = datos.supervisor_id !== undefined
      ? datos.supervisor_id
      : usuario.rol === 'supervisor' ? usuario.id : null;
    await validarSupervisor(client, usuario, supervisorId);

    return conCodigoUnico(() => rutasRepo.crearRuta(client, {
      codigo: datos.codigo,
      nombre: datos.nombre,
      descripcion: datos.descripcion ?? null,
      supervisorId,
      activa: datos.activa ?? true,
    }));
  });

// PATCH parcial: solo cambia lo enviado. La baja es lógica (activa = false).
export const actualizarRuta = (usuario, rutaId, cambios) =>
  conClaims(usuario, async (client) => {
    const actual = await rutasRepo.buscarRuta(client, { ...visibilidad(usuario), rutaId, bloquear: true });
    if (!actual) {
      throw crearError(404, 'RUTA_NO_ENCONTRADA', 'La ruta no existe');
    }

    if (cambios.supervisor_id !== undefined) {
      await validarSupervisor(client, usuario, cambios.supervisor_id);
    }

    return conCodigoUnico(() => rutasRepo.actualizarRuta(client, rutaId, {
      codigo: cambios.codigo ?? actual.codigo,
      nombre: cambios.nombre ?? actual.nombre,
      descripcion: cambios.descripcion !== undefined ? cambios.descripcion : actual.descripcion,
      supervisorId: cambios.supervisor_id !== undefined ? cambios.supervisor_id : actual.supervisor_id,
      activa: cambios.activa ?? actual.activa,
    }));
  });

// GET /rutas/{rutaId}/puntos: la geocerca que usa la app móvil para dejar marcar (y el servidor para dentro_de_geocerca).
export const obtenerPuntos = (usuario, rutaId) =>
  conClaims(usuario, async (client) => {
    const ruta = await rutasRepo.buscarRuta(client, { ...visibilidad(usuario), rutaId });
    if (!ruta) {
      throw crearError(404, 'RUTA_NO_ENCONTRADA', 'La ruta no existe');
    }
    return { ruta_id: rutaId, puntos: await rutasRepo.listarPuntos(client, rutaId) };
  });

// PUT /rutas/{rutaId}/puntos: reemplaza la geocerca completa. Una lista vacía la quita (la app deja marcar en
// cualquier lugar). Administrador, o el supervisor de la ruta (también lo exige el RLS de M010).
export const reemplazarPuntos = (usuario, rutaId, puntos) =>
  conClaims(usuario, async (client) => {
    const ruta = await rutasRepo.buscarRuta(client, { ...visibilidad(usuario), rutaId, bloquear: true });
    if (!ruta) {
      throw crearError(404, 'RUTA_NO_ENCONTRADA', 'La ruta no existe');
    }
    const antes = await rutasRepo.listarPuntos(client, rutaId);
    await rutasRepo.reemplazarPuntos(client, rutaId, puntos);
    const despues = await rutasRepo.listarPuntos(client, rutaId);
    await registrarAuditoria(client, {
      actor: usuario, entidad: 'ruta_puntos', entidadId: rutaId, accion: 'UPDATE',
      datosAntes: { puntos: antes }, datosDespues: { puntos: despues },
    });
    return { ruta_id: rutaId, puntos: despues };
  });

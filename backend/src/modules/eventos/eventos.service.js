import { conClaims } from '../../config/db.js';
import { ZONA_OPERACION } from '../../config/negocio.js';
import { crearError } from '../../middlewares/errorHandler.js';
import { registrarAuditoria } from '../auditoria/auditoria.repository.js';
import * as eventosRepo from './eventos.repository.js';

// PENDIENTE_REVISION -> EN_ATENCION -> ATENDIDO o DESCARTADO (también directo desde PENDIENTE_REVISION).
// ATENDIDO y DESCARTADO son finales.
const TRANSICIONES = {
  PENDIENTE_REVISION: ['EN_ATENCION', 'ATENDIDO', 'DESCARTADO'],
  EN_ATENCION: ['ATENDIDO', 'DESCARTADO'],
};

// GET /eventos: cada rol ve lo que el RLS le permite (trabajador: los suyos; supervisor: de sus trabajadores; admin: todos)
export const listarEventos = (usuario, filtros, { page, pageSize }) =>
  conClaims(usuario, async (client) => {
    const filtro = { ...filtros, zona: ZONA_OPERACION };
    const total = await eventosRepo.contarEventos(client, filtro);
    const items = await eventosRepo.listarEventos(client, { ...filtro, limite: pageSize, desplazamiento: (page - 1) * pageSize });
    return { items, page, page_size: pageSize, total };
  });

// PATCH /eventos/{id}/atencion: el supervisor del trabajador o el administrador registran la atención.
export const atenderEvento = (usuario, eventoId, { estado_atencion: estado }) =>
  conClaims(usuario, async (client) => {
    const evento = await eventosRepo.buscarEvento(client, eventoId, { bloquear: true });
    if (!evento) throw crearError(404, 'EVENTO_NO_ENCONTRADO', 'El evento no existe');
    if (!(TRANSICIONES[evento.estado_atencion] ?? []).includes(estado)) {
      throw crearError(409, 'TRANSICION_INVALIDA', `El evento está ${evento.estado_atencion}; no puede pasar a ${estado}`);
    }
    await eventosRepo.actualizarAtencion(client, eventoId, { estado, atendidoPor: usuario.id });
    const atendido = await eventosRepo.buscarEvento(client, eventoId);
    await registrarAuditoria(client, {
      actor: usuario, entidad: 'eventos_diarios', entidadId: eventoId, accion: 'UPDATE',
      datosAntes: { estado_atencion: evento.estado_atencion },
      datosDespues: { estado_atencion: atendido.estado_atencion, tipo_evento: atendido.tipo_evento },
    });
    return atendido;
  });

import { conClaims } from '../../config/db.js';
import { esUuid, esFechaIso, esEnteroEnRango } from '../../middlewares/validadores.js';
import * as eventosRepo from './eventos_ruta.repository.js';

// Mismo dominio que el CHECK de eventos_diarios.tipo_evento (M004)
const TIPOS_EVENTO = ['EMERGENCIA', 'VISITA_FALLIDA', 'PROBLEMA_VEHICULO', 'CAMBIO_ESTADO', 'NOTA', 'OTRO'];
const MAX_BYTES_PAYLOAD = 32 * 1024; // D.3, regla 4

const esObjetoPlano = (valor) => typeof valor === 'object' && valor !== null && !Array.isArray(valor);
const esCoordenada = (valor, limite) => typeof valor === 'number' && Number.isFinite(valor) && Math.abs(valor) <= limite;
const vacio = (valor) => valor === undefined || valor === null;

// Devuelve el código de rechazo, o null si el evento es válido (EventoRequest del contrato).
const validarEvento = (evento) => {
  if (!esObjetoPlano(evento)) return 'EVENTO_INVALIDO';
  if (!esUuid(evento.client_uuid)) return 'CLIENT_UUID_INVALIDO';
  if (!TIPOS_EVENTO.includes(evento.tipo_evento)) return 'TIPO_EVENTO_INVALIDO';
  if (!esEnteroEnRango(evento.esquema_version, 1, 32767)) return 'ESQUEMA_VERSION_INVALIDA';
  if (!esFechaIso(evento.ocurrido_en)) return 'OCURRIDO_EN_INVALIDO';
  if (!vacio(evento.registro_tiempo_id) && !esUuid(evento.registro_tiempo_id)) return 'REGISTRO_INVALIDO';

  const sinLatitud = vacio(evento.latitud);
  if (sinLatitud !== vacio(evento.longitud)) return 'UBICACION_INVALIDA';
  if (!sinLatitud && (!esCoordenada(evento.latitud, 90) || !esCoordenada(evento.longitud, 180))) {
    return 'UBICACION_INVALIDA';
  }

  if (!vacio(evento.payload)) {
    if (!esObjetoPlano(evento.payload)) return 'PAYLOAD_INVALIDO';
    if (Buffer.byteLength(JSON.stringify(evento.payload)) > MAX_BYTES_PAYLOAD) return 'PAYLOAD_DEMASIADO_GRANDE';
  }
  return null;
};

// Errores de datos de PostgreSQL (clases 22 y 23): rechazan solo ese evento, no el lote.
const esErrorDeDatos = (error) => typeof error.code === 'string' && /^2[23]/.test(error.code);

const procesarEvento = async (client, usuario, evento) => {
  const codigo = validarEvento(evento);
  if (codigo) {
    const clientUuid = esObjetoPlano(evento) && typeof evento.client_uuid === 'string' ? evento.client_uuid : null;
    return { client_uuid: clientUuid, estado: 'RECHAZADO', code: codigo };
  }

  const existente = await eventosRepo.buscarIdPorClientUuid(client, usuario.id, evento.client_uuid);
  if (existente) {
    return { client_uuid: evento.client_uuid, estado: 'DUPLICADO', id: existente };
  }

  // H-14: el evento solo puede apuntar a un registro de tiempo del mismo trabajador
  const registroId = evento.registro_tiempo_id ?? null;
  if (registroId && !(await eventosRepo.existeRegistroDelTrabajador(client, registroId, usuario.id))) {
    return { client_uuid: evento.client_uuid, estado: 'RECHAZADO', code: 'REGISTRO_NO_ENCONTRADO' };
  }

  // Savepoint: si este INSERT falla, la transacción sigue viva para el resto del lote
  await client.query('SAVEPOINT evento');
  try {
    const id = await eventosRepo.crearEvento(client, {
      clientUuid: evento.client_uuid,
      trabajadorId: usuario.id,
      registroTiempoId: registroId,
      tipoEvento: evento.tipo_evento,
      latitud: evento.latitud ?? null,
      longitud: evento.longitud ?? null,
      esquemaVersion: evento.esquema_version,
      payload: evento.payload ?? {},
      ocurridoEn: evento.ocurrido_en,
    });
    await client.query('RELEASE SAVEPOINT evento');

    if (id) {
      return { client_uuid: evento.client_uuid, estado: 'CREADO', id };
    }
    // Otra petición insertó el mismo client_uuid entre la búsqueda y el INSERT
    const idConcurrente = await eventosRepo.buscarIdPorClientUuid(client, usuario.id, evento.client_uuid);
    return { client_uuid: evento.client_uuid, estado: 'DUPLICADO', id: idConcurrente };
  } catch (error) {
    await client.query('ROLLBACK TO SAVEPOINT evento');
    if (esErrorDeDatos(error)) {
      return { client_uuid: evento.client_uuid, estado: 'RECHAZADO', code: 'DATOS_INVALIDOS' };
    }
    throw error;
  }
};

// Procesa el lote en orden, en una sola transacción con los claims del trabajador.
export const sincronizarEventos = (usuario, eventos) =>
  conClaims(usuario, async (client) => {
    const resultados = [];
    for (const evento of eventos) {
      resultados.push(await procesarEvento(client, usuario, evento));
    }
    return resultados;
  });

import { conClaims } from '../../config/db.js';
import { crearError } from '../../middlewares/errorHandler.js';
import * as descansosRepo from './eventos_descanso.repository.js';

const aRespuesta = (fila) => ({
  id: fila.id,
  registro_tiempo_id: fila.registro_tiempo_id,
  inicio_at: fila.inicio_at,
  fin_at: fila.fin_at,
});

const mismoDescanso = (fila, { tipoId, inicio, fin }) =>
  fila.tipo_id === tipoId &&
  new Date(fila.inicio_at).getTime() === inicio.getTime() &&
  new Date(fila.fin_at).getTime() === fin.getTime();

// Devuelve { descanso, creado }. creado = false cuando es un reintento idéntico (idempotencia).
export const registrarDescanso = (usuario, registroId, { client_uuid, tipo_id, inicio_at, fin_at }) =>
  conClaims(usuario, async (client) => {
    const inicio = new Date(inicio_at);
    const fin = new Date(fin_at);

    if (fin <= inicio) {
      throw crearError(422, 'RANGO_INVALIDO', 'fin_at debe ser posterior a inicio_at');
    }

    // Pertenencia: solo el trabajador dueño del registro (404 en vez de 403, F.2)
    const registro = await descansosRepo.buscarRegistroDelTrabajador(client, registroId, usuario.id);
    if (!registro) {
      throw crearError(404, 'REGISTRO_NO_ENCONTRADO', 'El registro de tiempo no existe');
    }

    // Reintento del móvil con el mismo client_uuid
    const buscarReintento = async () => {
      const previo = await descansosRepo.buscarPorClientUuid(client, registroId, client_uuid);
      if (!previo) return null;
      if (mismoDescanso(previo, { tipoId: tipo_id, inicio, fin })) {
        return { descanso: aRespuesta(previo), creado: false };
      }
      throw crearError(409, 'CLIENT_UUID_REUTILIZADO', 'client_uuid ya se usó con datos distintos');
    };

    // Un reintento de algo ya guardado responde 200 aunque el registro ya esté validado
    const reintento = await buscarReintento();
    if (reintento) return reintento;

    if (registro.estado_validacion !== 'PENDIENTE' || !(await descansosRepo.bloquearRegistro(client, registroId))) {
      throw crearError(409, 'ESTADO_INVALIDO', 'El registro de tiempo ya fue validado y no admite descansos');
    }

    // Con el registro bloqueado, otra petición con el mismo client_uuid pudo terminar mientras esperábamos
    const reintentoConcurrente = await buscarReintento();
    if (reintentoConcurrente) return reintentoConcurrente;

    if (inicio < registro.ingreso_at || (registro.salida_at && fin > registro.salida_at)) {
      throw crearError(422, 'FUERA_DE_JORNADA', 'El descanso debe quedar entre el ingreso y la salida del registro');
    }

    if (!(await descansosRepo.existeTipoDescanso(client, tipo_id))) {
      throw crearError(422, 'TIPO_DESCANSO_INVALIDO', 'tipo_id no existe en el catálogo de tipos de descanso');
    }

    if (await descansosRepo.existeSolapamiento(client, registroId, inicio, fin)) {
      throw crearError(422, 'DESCANSO_SOLAPADO', 'El descanso se solapa con otro del mismo registro');
    }

    const nuevo = await descansosRepo.crearDescanso(client, {
      registroId,
      clientUuid: client_uuid,
      tipoId: tipo_id,
      inicioAt: inicio,
      finAt: fin,
    });

    return { descanso: aRespuesta(nuevo), creado: true };
  });

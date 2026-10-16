import * as eventosRepo from './eventos.repository.js';

export const listarEventos = async () => {
  const filas = await eventosRepo.obtenerEventos();
  return filas.map((f) => ({
    id: f.id_evento,
    jornadaId: f.id_jornada,
    tipoEvento: f.tipo_evento,
    descripcion: f.descripcion,
    fechaCreacion: f.fecha_creacion,
  }));
};

export const listarEventosPorJornada = async (jornadaId) => {
  if (!jornadaId) {
    const error = new Error('El ID de jornada es requerido');
    error.status = 400;
    throw error;
  }
  const filas = await eventosRepo.obtenerEventosPorJornada(jornadaId);
  return filas.map((f) => ({
    id: f.id_evento,
    jornadaId: f.id_jornada,
    tipoEvento: f.tipo_evento,
    descripcion: f.descripcion,
    fechaCreacion: f.fecha_creacion,
  }));
};

export const registrarEvento = async ({ jornadaId, tipoEvento, descripcion }) => {
  if (!jornadaId || !tipoEvento) {
    const error = new Error('jornadaId y tipoEvento son campos obligatorios');
    error.status = 400;
    throw error;
  }

  const evento = await eventosRepo.crearEvento({
    idJornada: jornadaId,
    tipoEvento,
    descripcion,
  });

  return {
    id: evento.id_evento,
    jornadaId: evento.id_jornada,
    tipoEvento: evento.tipo_evento,
    descripcion: evento.descripcion,
    fechaCreacion: evento.fecha_creacion,
  };
};
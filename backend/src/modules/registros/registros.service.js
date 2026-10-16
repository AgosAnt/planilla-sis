import * as registrosRepo from './registros.repository.js';

export const listarRegistros = async () => {
  const filas = await registrosRepo.obtenerRegistros();

  return filas.map((fila) => ({
    id: fila.id_jornada,
    usuarioId: fila.id_usuario,
    rutaId: fila.id_ruta,
    fecha: fila.fecha,
    horaEntrada: fila.hora_entrada,
    horaSalida: fila.hora_salida,
    estado: fila.estado,
  }));
};

export const registrarIngreso = async (usuarioId) => {
  if (!usuarioId) {
    const error = new Error('El ID de usuario es obligatorio');
    error.status = 400;
    throw error;
  }

  const jornadaActiva = await registrosRepo.buscarJornadaActivaPorUsuario(usuarioId);
  if (jornadaActiva) {
    const error = new Error('El usuario ya cuenta con una jornada activa');
    error.status = 400;
    throw error;
  }

  const nuevoRegistro = await registrosRepo.crearIngreso(usuarioId);

  return {
    id: nuevoRegistro.id_jornada,
    usuarioId: nuevoRegistro.id_usuario,
    fecha: nuevoRegistro.fecha,
    horaEntrada: nuevoRegistro.hora_entrada,
    estado: nuevoRegistro.estado,
  };
};

export const registrarSalida = async (idJornada) => {
  if (!idJornada) {
    const error = new Error('El ID de la jornada es obligatorio');
    error.status = 400;
    throw error;
  }

  const jornada = await registrosRepo.buscarJornadaPorId(idJornada);
  if (!jornada) {
    const error = new Error('Jornada no encontrada');
    error.status = 404;
    throw error;
  }

  if (jornada.estado === 'FINALIZADA') {
    const error = new Error('La jornada ya se encuentra finalizada');
    error.status = 400;
    throw error;
  }

  const registroActualizado = await registrosRepo.registrarSalida(idJornada);

  return {
    id: registroActualizado.id_jornada,
    usuarioId: registroActualizado.id_usuario,
    rutaId: registroActualizado.id_ruta,
    fecha: registroActualizado.fecha,
    horaEntrada: registroActualizado.hora_entrada,
    horaSalida: registroActualizado.hora_salida,
    estado: registroActualizado.estado,
  };
};

export const asignarRutaAJornada = async (idJornada, rutaId) => {
  if (!idJornada || !rutaId) {
    const error = new Error('El ID de la jornada y el ID de la ruta son obligatorios');
    error.status = 400;
    throw error;
  }

  const jornada = await registrosRepo.buscarJornadaPorId(idJornada);
  if (!jornada) {
    const error = new Error('Jornada no encontrada');
    error.status = 404;
    throw error;
  }

  const registroActualizado = await registrosRepo.actualizarRutaEnJornada(idJornada, rutaId);

  return {
    id: registroActualizado.id_jornada,
    usuarioId: registroActualizado.id_usuario,
    rutaId: registroActualizado.id_ruta,
    fecha: registroActualizado.fecha,
    horaEntrada: registroActualizado.hora_entrada,
    horaSalida: registroActualizado.hora_salida,
    estado: registroActualizado.estado,
  };
};
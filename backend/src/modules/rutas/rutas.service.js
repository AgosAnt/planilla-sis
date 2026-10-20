import * as repository from './rutas.repository.js';

export async function cerrarAsignacion(usuario, asignacionId, datos) {
  const asignacion = await repository.cerrarAsignacion(usuario, asignacionId, datos.fecha_fin, datos.activa);
  if (!asignacion) {
    const err = new Error('No se encontró la asignación especificada');
    err.status = 404;
    err.code = 'ASIGNACION_NO_ENCONTRADA';
    throw err;
  }
  return asignacion;
}

export async function proponerAcuerdoTurno(usuario, asignacionId, datos) {
  try {
    return await repository.proponerAcuerdoTurno(usuario, asignacionId, datos.fecha, datos.turno_id);
  } catch (error) {
    if (error.code === '23505') {
      const err = new Error('Ya existe un acuerdo de turno propuesto para esta fecha');
      err.status = 409;
      err.code = 'ACUERDO_EXISTENTE';
      throw err;
    }
    if (error.code === '23P01') {
      const err = new Error('El trabajador ya tiene una asignación activa en el rango de fechas');
      err.status = 409;
      err.code = 'ASIGNACION_SOLAPADA';
      throw err;
    }
    throw error;
  }
}

export async function listarTurnos(usuario) {
  return await repository.obtenerCatalogosTurnos(usuario);
}

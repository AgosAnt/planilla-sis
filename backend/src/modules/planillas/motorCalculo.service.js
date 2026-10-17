import * as planillasRepo from './planillas.repository.js';

export const calcularYGenerarPlanilla = async ({ usuarioId, fechaInicio, fechaFin, tarifaHora = 10 }) => {
  if (!usuarioId || !fechaInicio || !fechaFin) {
    const error = new Error('El usuarioId, fechaInicio y fechaFin son obligatorios');
    error.status = 400;
    throw error;
  }

  // 1. Consultar jornadas
  const jornadas = await planillasRepo.obtenerJornadasPorRango(usuarioId, fechaInicio, fechaFin);

  // 2. Sumar horas
  const totalHorasRaw = jornadas.reduce((acum, f) => acum + parseFloat(f.horas_trabajadas || 0), 0);
  const horasNormales = parseFloat(totalHorasRaw.toFixed(2));
  const horasExtras = 0;
  const totalPago = parseFloat((horasNormales * tarifaHora).toFixed(2));
  const periodo = `${fechaInicio} - ${fechaFin}`;

  // 3. Guardar en BD
  const planillaGuardada = await planillasRepo.guardarPlanilla({
    usuarioId,
    periodo,
    horasNormales,
    horasExtras,
    totalPago,
    estadoAprobacion: 'PENDIENTE',
  });

  return {
    id: planillaGuardada.id_planilla,
    usuarioId: planillaGuardada.id_usuario,
    periodo: planillaGuardada.periodo,
    horasNormales: parseFloat(planillaGuardada.horas_normales),
    horasExtras: parseFloat(planillaGuardada.horas_extras),
    totalPago: parseFloat(planillaGuardada.total_pago),
    estadoAprobacion: planillaGuardada.estado_aprobacion,
  };
};

export const listarPlanillas = async () => {
  const filas = await planillasRepo.obtenerPlanillas();
  return filas.map((f) => ({
    id: f.id_planilla,
    usuarioId: f.id_usuario,
    periodo: f.periodo,
    horasNormales: parseFloat(f.horas_normales),
    horasExtras: parseFloat(f.horas_extras),
    totalPago: parseFloat(f.total_pago),
    estadoAprobacion: f.estado_aprobacion,
  }));
};

export const cambiarEstadoPlanilla = async (idPlanilla, estado) => {
  const estadosValidos = ['PENDIENTE', 'APROBADA', 'RECHAZADA'];
  if (!estado || !estadosValidos.includes(estado.toUpperCase())) {
    const error = new Error(`Estado no válido. Estados permitidos: ${estadosValidos.join(', ')}`);
    error.status = 400;
    throw error;
  }

  const planilla = await planillasRepo.actualizarEstadoPlanilla(idPlanilla, estado.toUpperCase());
  if (!planilla) {
    const error = new Error('Planilla no encontrada');
    error.status = 404;
    throw error;
  }

  return {
    id: planilla.id_planilla,
    usuarioId: planilla.id_usuario,
    periodo: planilla.periodo,
    horasNormales: parseFloat(planilla.horas_normales),
    horasExtras: parseFloat(planilla.horas_extras),
    totalPago: parseFloat(planilla.total_pago),
    estadoAprobacion: planilla.estado_aprobacion,
  };
};
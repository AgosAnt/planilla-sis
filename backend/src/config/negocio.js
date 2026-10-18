// Parámetros de operación (D-2): la base guarda timestamptz en UTC; la zona solo se usa para interpretar
// fechas de calendario (filtros desde/hasta, vigencia de asignaciones, fecha del acuerdo de turno).
export const ZONA_OPERACION = process.env.ZONA_OPERACION || 'America/Guatemala';

// El servidor no confía en la hora del dispositivo (E-4): se rechazan marcas más adelantadas que esto.
export const TOLERANCIA_FUTURO_MS = 5 * 60 * 1000;

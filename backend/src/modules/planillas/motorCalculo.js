// Motor de cálculo de la planilla (docs/reglas-calculo.md). Funciones puras, sin base de datos: reciben las jornadas,
// descansos, turnos, tarifas, parámetros y feriados ya leídos, y devuelven horas y montos.
// El dinero se maneja en centavos enteros y se redondea (mitad hacia arriba) solo en los totales de cada trabajador.

const MIN_POR_HORA = 60;
const LIMITE_ORDINARIO = { DIURNA: 8 * 60, MIXTA: 7 * 60, NOCTURNA: 6 * 60 }; // arts. 116 y 117
const MINUTOS_NOCTURNOS_PARA_NOCTURNA = 4 * 60; // art. 117: 4 h o más de noche = jornada nocturna
const BONIFICACION_POR_PERIODO = { QUINCENAL: 1 / 2, MENSUAL: 1, SEMANAL: 12 / 52 };

// '20.00' -> 2000 ; '4.83' -> 483 (centésimas exactas, sin errores de coma flotante)
const aCentesimas = (texto) => {
  const [enteros, decimales = ''] = String(texto).split('.');
  return Number(enteros) * 100 + Number((decimales + '00').slice(0, 2));
};
const aTexto = (centavos) => (centavos / 100).toFixed(2);
const horasTexto = (minutos) => (minutos / MIN_POR_HORA).toFixed(2);

// ---------------------------------------------------------------------------
// Hora local de la zona de operación
// ---------------------------------------------------------------------------
const formateadores = new Map();
const partesLocales = (ms, zona) => {
  if (!formateadores.has(zona)) {
    formateadores.set(zona, new Intl.DateTimeFormat('en-CA', {
      timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }));
  }
  const p = Object.fromEntries(formateadores.get(zona).formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { fecha: `${p.year}-${p.month}-${p.day}`, minutos: Number(p.hour) * 60 + Number(p.minute) };
};

// Instante UTC de una fecha local ('YYYY-MM-DD') y minutos desde la medianoche local
export const instanteLocal = (fecha, minutos, zona) => {
  const [a, m, d] = fecha.split('-').map(Number);
  const supuesto = Date.UTC(a, m - 1, d, 0, minutos);
  const local = partesLocales(supuesto, zona);
  const [la, lm, ld] = local.fecha.split('-').map(Number);
  const desfase = Date.UTC(la, lm - 1, ld, 0, local.minutos) - supuesto;
  return supuesto - desfase;
};

const fechaLocal = (ms, zona) => partesLocales(ms, zona).fecha;
const esNoche = (minutosDelDia) => minutosDelDia >= 18 * 60 || minutosDelDia < 6 * 60; // 18:00 a 06:00
const truncarAlMinuto = (ms) => Math.floor(ms / 60000) * 60000; // regla 8: exacto, al minuto
const esDomingo = (fecha) => new Date(`${fecha}T12:00:00Z`).getUTCDay() === 0;

// Próximo corte de reloj local (06:00, 12:00, 18:00 o medianoche) después de ms
const proximoCorte = (ms, zona) => {
  const { fecha, minutos } = partesLocales(ms, zona);
  for (const corte of [6 * 60, 12 * 60, 18 * 60]) {
    if (minutos < corte) return instanteLocal(fecha, corte, zona);
  }
  const siguiente = new Date(`${fecha}T12:00:00Z`);
  siguiente.setUTCDate(siguiente.getUTCDate() + 1);
  return instanteLocal(siguiente.toISOString().slice(0, 10), 0, zona);
};

// ---------------------------------------------------------------------------
// Una jornada
// ---------------------------------------------------------------------------
/**
 * jornada: { id, ingreso_at, salida_at, turno_hora_inicio ('HH:MM' o null), descansos: [{ inicio_at, fin_at, remunerado }] }
 * parametros: { minutos_tolerancia_llegada, minutos_almuerzo_pagado, horas_maximas_dia }
 * feriados: Map fecha -> { medio_dia }
 * Devuelve la fecha, el tipo, los minutos por categoría y las alertas.
 */
export const calcularJornada = (jornada, parametros, feriados, zona) => {
  const alertas = [];
  const ingreso = truncarAlMinuto(new Date(jornada.ingreso_at).getTime());
  const salida = truncarAlMinuto(new Date(jornada.salida_at).getTime());
  const fecha = fechaLocal(ingreso, zona); // regla 1: la jornada pertenece al día de su ingreso

  // Regla 7: con turno acordado, hasta la tolerancia (o antes del turno) se cuenta desde el inicio del turno
  let inicio = ingreso;
  if (jornada.turno_hora_inicio) {
    const [h, m] = jornada.turno_hora_inicio.split(':').map(Number);
    const inicioTurno = instanteLocal(fecha, h * 60 + m, zona);
    const tolerancia = Number(parametros.minutos_tolerancia_llegada) * 60000;
    if (ingreso <= inicioTurno + tolerancia) inicio = inicioTurno;
  } else {
    alertas.push('SIN_TURNO_ACORDADO');
  }

  const vacia = { ord_dia: 0, ord_noche: 0, extra_dia: 0, extra_noche: 0 };
  if (salida <= inicio) {
    return { fecha, tipo: 'DIURNA', inicio_contado: new Date(inicio).toISOString(), minutos: vacia, minutos_nocturnos: 0, alertas };
  }

  // Regla 6: del almuerzo (descansos no remunerados) se pagan los primeros minutos; el exceso se descuenta
  let almuerzoDisponible = Number(parametros.minutos_almuerzo_pagado) * 60000;
  const excesos = jornada.descansos
    .filter((d) => !d.remunerado)
    .map((d) => [truncarAlMinuto(new Date(d.inicio_at).getTime()), truncarAlMinuto(new Date(d.fin_at ?? jornada.salida_at).getTime())])
    .map(([a, b]) => [Math.max(a, inicio), Math.min(b, salida)])
    .filter(([a, b]) => b > a)
    .sort((x, y) => x[0] - y[0])
    .map(([a, b]) => {
      const pagado = Math.min(b - a, almuerzoDisponible);
      almuerzoDisponible -= pagado;
      return [a + pagado, b];
    })
    .filter(([a, b]) => b > a);

  // Tramos efectivos: [inicio, salida] menos los excesos de almuerzo
  const tramos = [];
  let cursor = inicio;
  for (const [a, b] of excesos) {
    if (a > cursor) tramos.push([cursor, a]);
    cursor = Math.max(cursor, b);
  }
  if (salida > cursor) tramos.push([cursor, salida]);

  // Partir los tramos en los cortes de reloj (06:00, 12:00, 18:00, medianoche)
  const piezas = [];
  for (const [a, b] of tramos) {
    let desde = a;
    while (desde < b) {
      const hasta = Math.min(b, proximoCorte(desde, zona));
      piezas.push({ desde, minutos: (hasta - desde) / 60000, noche: esNoche(partesLocales(desde, zona).minutos) });
      desde = hasta;
    }
  }

  const efectivos = piezas.reduce((t, p) => t + p.minutos, 0);
  const nocturnos = piezas.filter((p) => p.noche).reduce((t, p) => t + p.minutos, 0);
  const tipo = nocturnos === 0 ? 'DIURNA' : nocturnos < MINUTOS_NOCTURNOS_PARA_NOCTURNA ? 'MIXTA' : 'NOCTURNA';

  // Regla 9: domingo o feriado completo, todo es extra; feriado de medio día, desde las 12:00 de esa fecha
  const feriado = feriados.get(fecha);
  const todoExtra = esDomingo(fecha) || (feriado && !feriado.medio_dia);
  const mediodia = feriado?.medio_dia ? instanteLocal(fecha, 12 * 60, zona) : null;
  if (esDomingo(fecha)) alertas.push('DOMINGO');
  if (feriado) alertas.push(feriado.medio_dia ? 'FERIADO_MEDIO_DIA' : 'FERIADO');

  // Reglas 3 y 5: las primeras horas efectivas hasta el límite son ordinarias; el resto, extra
  const minutos = { ...vacia };
  let ordinariosDisponibles = LIMITE_ORDINARIO[tipo];
  for (const p of piezas) {
    const forzarExtra = todoExtra || (mediodia !== null && p.desde >= mediodia);
    const ordinarios = forzarExtra ? 0 : Math.min(p.minutos, ordinariosDisponibles);
    ordinariosDisponibles -= ordinarios;
    minutos[p.noche ? 'ord_noche' : 'ord_dia'] += ordinarios;
    minutos[p.noche ? 'extra_noche' : 'extra_dia'] += p.minutos - ordinarios;
  }

  // Regla 10: más de las horas máximas se paga, pero queda como excepción para el supervisor
  if (efectivos > Number(parametros.horas_maximas_dia) * 60) alertas.push('JORNADA_MAYOR_AL_MAXIMO');

  return { fecha, tipo, inicio_contado: new Date(inicio).toISOString(), minutos, minutos_nocturnos: nocturnos, alertas };
};

// Tarifa vigente en la fecha (vigente_desde <= fecha <= vigente_hasta, o sin fin)
const tarifaVigente = (tarifas, fecha) =>
  tarifas.find((t) => t.vigente_desde <= fecha && (t.vigente_hasta === null || t.vigente_hasta >= fecha));

// ---------------------------------------------------------------------------
// Un trabajador en el período
// ---------------------------------------------------------------------------
/**
 * Devuelve las horas, los montos en texto con 2 decimales y el desglose (calculo_detalle).
 * Lanza { code: 'SIN_TARIFA', fecha } si alguna jornada no tiene tarifa vigente.
 */
export const calcularTrabajador = ({ jornadas, tarifas, parametros, feriados, zona }) => {
  const factorExtra = aCentesimas(parametros.factor_hora_extra);
  const factorNoche = aCentesimas(parametros.factor_hora_nocturna);
  let unidades = 0; // minutos x centavos x centésimas de factor
  const totales = { ord_dia: 0, ord_noche: 0, extra_dia: 0, extra_noche: 0 };
  const alertas = new Set();
  const desglose = [];

  for (const jornada of [...jornadas].sort((a, b) => new Date(a.ingreso_at) - new Date(b.ingreso_at))) {
    const r = calcularJornada(jornada, parametros, feriados, zona);
    const tarifa = tarifaVigente(tarifas, r.fecha);
    if (!tarifa) {
      const error = new Error(`Sin tarifa vigente el ${r.fecha}`);
      error.code = 'SIN_TARIFA';
      error.fecha = r.fecha;
      throw error;
    }
    const hora = aCentesimas(tarifa.monto_hora);
    const extra = tarifa.monto_hora_extra !== null ? aCentesimas(tarifa.monto_hora_extra) * 100 : hora * factorExtra;
    const u = r.minutos.ord_dia * hora * 100
      + r.minutos.ord_noche * hora * factorNoche
      + (r.minutos.extra_dia + r.minutos.extra_noche) * extra;
    unidades += u;
    for (const k of Object.keys(totales)) totales[k] += r.minutos[k];
    r.alertas.forEach((a) => alertas.add(a));
    desglose.push({
      registro_id: jornada.id,
      fecha: r.fecha,
      tipo: r.tipo,
      inicio_contado: r.inicio_contado,
      salida_at: new Date(jornada.salida_at).toISOString(),
      minutos: r.minutos,
      tarifa_hora: aTexto(hora),
      monto: aTexto(Math.round(u / (MIN_POR_HORA * 100))),
      alertas: r.alertas,
    });
  }

  // Regla 8: redondeo a 2 decimales solo en los totales del trabajador
  const bruto = Math.round(unidades / (MIN_POR_HORA * 100));
  const proporcion = BONIFICACION_POR_PERIODO[parametros.periodicidad] ?? BONIFICACION_POR_PERIODO.QUINCENAL;
  const bonificacion = jornadas.length > 0 ? Math.round(aCentesimas(parametros.bonificacion_incentivo_mensual) * proporcion) : 0;
  const igss = Math.round((bruto * aCentesimas(parametros.porcentaje_igss_laboral)) / 10000);
  const isr = 0; // fuera de alcance (docs/reglas-calculo.md)

  return {
    horas_ordinarias: horasTexto(totales.ord_dia + totales.ord_noche),
    horas_extra_diurnas: horasTexto(totales.extra_dia),
    horas_extra_nocturnas: horasTexto(totales.extra_noche),
    monto_bruto: aTexto(bruto),
    total_bonificaciones: aTexto(bonificacion),
    total_deducciones: aTexto(igss + isr),
    neto: aTexto(bruto + bonificacion - igss - isr),
    conceptos: { BONO_LEY: aTexto(bonificacion), IGSS: aTexto(igss), ISR: aTexto(isr) },
    alertas: [...alertas],
    calculo_detalle: { jornadas: desglose, minutos: totales },
  };
};

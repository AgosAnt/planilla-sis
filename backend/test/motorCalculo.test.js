// Pruebas del motor de cálculo con los casos de docs/reglas-calculo.md. Correr con: npm test (en backend/)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularTrabajador, calcularJornada } from '../src/modules/planillas/motorCalculo.js';

const ZONA = 'America/Guatemala'; // UTC-6, sin horario de verano
const PARAMETROS = {
  factor_hora_extra: '1.50', factor_hora_nocturna: '1.25', minutos_tolerancia_llegada: 10, regla_redondeo: 'EXACTO',
  periodicidad: 'QUINCENAL', porcentaje_igss_laboral: '4.83', bonificacion_incentivo_mensual: '250.00',
  minutos_almuerzo_pagado: 30, horas_maximas_dia: '12.00',
};
const TARIFA_Q20 = [{ monto_hora: '20.00', monto_hora_extra: null, vigente_desde: '2026-01-01', vigente_hasta: null }];
const SIN_FERIADOS = new Map();

// Hora local de Guatemala -> ISO UTC. fecha 'YYYY-MM-DD', hora 'HH:MM'; diasMas para cruzar la medianoche.
const gt = (fecha, hora, diasMas = 0) => {
  const d = new Date(`${fecha}T${hora}:00-06:00`);
  d.setUTCDate(d.getUTCDate() + diasMas);
  return d.toISOString();
};
let id = 0;
const jornada = (fecha, entrada, salida, { turno = null, almuerzo = null, salidaDiaSiguiente = false } = {}) => ({
  id: `j${++id}`,
  ingreso_at: gt(fecha, entrada),
  salida_at: gt(fecha, salida, salidaDiaSiguiente ? 1 : 0),
  turno_hora_inicio: turno,
  descansos: almuerzo
    ? [{ inicio_at: gt(fecha, almuerzo[0], almuerzo[2] ?? 0), fin_at: gt(fecha, almuerzo[1], almuerzo[2] ?? 0), remunerado: false }]
    : [],
});
const calcular = (jornadas, extra = {}) =>
  calcularTrabajador({ jornadas, tarifas: TARIFA_Q20, parametros: PARAMETROS, feriados: SIN_FERIADOS, zona: ZONA, ...extra });

test('Caso 1: semana normal en turno matutino', () => {
  const dias = ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20'];
  const r = calcular(dias.map((f) => jornada(f, '06:00', '14:00', { turno: '06:00', almuerzo: ['12:00', '12:30'] })));
  assert.equal(r.horas_ordinarias, '40.00');
  assert.equal(r.monto_bruto, '800.00');
  assert.equal(r.total_bonificaciones, '125.00');
  assert.equal(r.total_deducciones, '38.64');
  assert.equal(r.neto, '886.36');
});

test('Caso 2: turno nocturno con un día extendido', () => {
  const noches = ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19'].map((f) =>
    jornada(f, '22:00', '06:00', { turno: '22:00', almuerzo: ['02:00', '02:30', 1], salidaDiaSiguiente: true }));
  noches.push(jornada('2026-11-20', '22:00', '08:00', { turno: '22:00', almuerzo: ['02:00', '02:30', 1], salidaDiaSiguiente: true }));
  const r = calcular(noches);
  assert.equal(r.horas_ordinarias, '30.00');
  assert.equal(r.horas_extra_nocturnas, '10.00');
  assert.equal(r.horas_extra_diurnas, '2.00');
  assert.equal(r.monto_bruto, '1110.00');
  assert.equal(r.total_deducciones, '53.61');
  assert.equal(r.neto, '1181.39');
});

test('Caso 3: llegadas tarde, almuerzo largo y domingo', () => {
  const r = calcular([
    jornada('2026-11-16', '06:08', '14:00', { turno: '06:00', almuerzo: ['12:00', '12:30'] }),
    jornada('2026-11-17', '06:30', '14:00', { turno: '06:00', almuerzo: ['12:00', '12:30'] }),
    jornada('2026-11-18', '06:00', '14:00', { turno: '06:00', almuerzo: ['12:00', '13:00'] }),
    jornada('2026-11-19', '06:00', '14:00', { turno: '06:00', almuerzo: ['12:00', '12:30'] }),
    jornada('2026-11-20', '06:00', '14:00', { turno: '06:00', almuerzo: ['12:00', '12:30'] }),
    jornada('2026-11-22', '06:00', '12:00', { turno: '06:00' }),
  ]);
  assert.equal(r.horas_ordinarias, '39.00');
  assert.equal(r.horas_extra_diurnas, '6.00');
  assert.equal(r.monto_bruto, '960.00');
  assert.equal(r.total_deducciones, '46.37');
  assert.equal(r.neto, '1038.63');
});

test('Turno vespertino 14:00-22:00: jornada nocturna con recargo y 2 h extra (ejemplo de la decisión 5)', () => {
  const r = calcular([jornada('2026-11-16', '14:00', '22:00', { turno: '14:00' })]);
  assert.equal(calcularJornada(jornada('2026-11-16', '14:00', '22:00', { turno: '14:00' }), PARAMETROS, SIN_FERIADOS, ZONA).tipo, 'NOCTURNA');
  assert.equal(r.monto_bruto, '190.00'); // 4 h x 20 + 2 h x 25 + 2 h x 30
});

test('Feriado de medio día: desde las 12:00 todo es extra', () => {
  const feriados = new Map([['2026-12-24', { medio_dia: true }]]);
  const r = calcular([jornada('2026-12-24', '06:00', '14:00', { turno: '06:00', almuerzo: ['10:00', '10:30'] })], { feriados });
  assert.equal(r.horas_ordinarias, '6.00');
  assert.equal(r.horas_extra_diurnas, '2.00');
  assert.ok(r.alertas.includes('FERIADO_MEDIO_DIA'));
});

test('Sin turno acordado se cuenta desde la hora real y queda la alerta', () => {
  const r = calcular([jornada('2026-11-16', '06:05', '14:05')]);
  assert.equal(r.horas_ordinarias, '8.00');
  assert.ok(r.alertas.includes('SIN_TURNO_ACORDADO'));
});

test('Llegada antes del turno: el tiempo previo no se paga', () => {
  const r = calcular([jornada('2026-11-16', '05:30', '14:00', { turno: '06:00', almuerzo: ['12:00', '12:30'] })]);
  assert.equal(r.horas_ordinarias, '8.00');
  assert.equal(r.horas_extra_diurnas, '0.00');
});

test('Jornada de más de 12 horas se paga y queda como excepción', () => {
  const r = calcular([jornada('2026-11-16', '06:00', '19:00', { turno: '06:00' })]);
  assert.ok(r.alertas.includes('JORNADA_MAYOR_AL_MAXIMO'));
  assert.equal(r.horas_ordinarias, '7.00'); // 06:00-19:00 tiene 1 h nocturna: jornada mixta
});

test('Cambio de tarifa a mitad del período y monto_hora_extra propio', () => {
  const tarifas = [
    { monto_hora: '20.00', monto_hora_extra: null, vigente_desde: '2026-01-01', vigente_hasta: '2026-11-17' },
    { monto_hora: '25.00', monto_hora_extra: '40.00', vigente_desde: '2026-11-18', vigente_hasta: null },
  ];
  const r = calcular([
    jornada('2026-11-17', '06:00', '15:00', { turno: '06:00', almuerzo: ['12:00', '12:30'] }), // 8 x 20 + 1 x 30
    jornada('2026-11-18', '06:00', '15:00', { turno: '06:00', almuerzo: ['12:00', '12:30'] }), // 8 x 25 + 1 x 40
  ], { tarifas });
  assert.equal(r.monto_bruto, '430.00');
});

test('Sin tarifa vigente: error SIN_TARIFA', () => {
  assert.throws(() => calcular([jornada('2025-06-02', '06:00', '14:00', { turno: '06:00' })]), { code: 'SIN_TARIFA' });
});

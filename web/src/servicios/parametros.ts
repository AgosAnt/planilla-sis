import { api } from '@/lib/api'

// Parámetros del cálculo (docs/reglas-calculo.md). Decimales y montos viajan como texto con 2 decimales.
export interface ParametrosPago {
  factor_hora_extra: string
  factor_hora_nocturna: string
  minutos_tolerancia_llegada: number
  regla_redondeo: string
  periodicidad: 'SEMANAL' | 'QUINCENAL' | 'MENSUAL'
  porcentaje_igss_laboral: string
  bonificacion_incentivo_mensual: string
  minutos_almuerzo_pagado: number
  horas_maximas_dia: string
  actualizado_at: string
}

export interface Feriado {
  fecha: string
  nombre: string
  medio_dia: boolean
}

export interface Tarifa {
  id: string
  trabajador_id: string
  monto_hora: string
  monto_hora_extra: string | null
  moneda: string
  vigente_desde: string
  vigente_hasta: string | null
  creado_at: string
}

export const obtenerParametros = () => api<ParametrosPago>('GET', '/admin/parametros-pago')

// Solo los campos que cambian
export const actualizarParametros = (cambios: Partial<Omit<ParametrosPago, 'actualizado_at' | 'regla_redondeo'>>) =>
  api<ParametrosPago>('PATCH', '/admin/parametros-pago', cambios)

export const listarFeriados = (anio: number) => api<Feriado[]>('GET', `/admin/feriados?anio=${anio}`)

export const crearFeriado = (feriado: Feriado) => api<Feriado>('POST', '/admin/feriados', feriado)

export const borrarFeriado = (fecha: string) => api<null>('DELETE', `/admin/feriados/${fecha}`)

export const listarTarifas = (trabajadorId: string) => api<Tarifa[]>('GET', `/trabajadores/${trabajadorId}/tarifas`)

// La tarifa vigente se cierra sola el día anterior a vigente_desde
export const crearTarifa = (trabajadorId: string, datos: { monto_hora: string; monto_hora_extra: string | null; vigente_desde: string }) =>
  api<Tarifa>('POST', `/trabajadores/${trabajadorId}/tarifas`, datos)

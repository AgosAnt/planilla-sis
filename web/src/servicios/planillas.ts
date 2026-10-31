import { api } from '@/lib/api'

// Montos y horas llegan como texto con 2 decimales (contrato: schema Dinero), para no perder precisión.

export type EstadoPeriodo = 'BORRADOR' | 'EN_CALCULO' | 'CERRADO' | 'PAGADO'
export type EstadoPlanilla = 'CALCULADA' | 'VERIFICADA' | 'APROBADA' | 'PAGADA'

export interface Periodo {
  id: string
  codigo: string
  fecha_inicio: string
  fecha_fin: string
  estado: EstadoPeriodo
}

export interface Planilla {
  id: string
  periodo_id: string
  ruta_id: string | null
  estado: EstadoPlanilla
  calculada_por: string | null
  calculada_at: string | null
  verificada_por: string | null
  verificada_at: string | null
  aprobada_por: string | null
  aprobada_at: string | null
  hash_integridad: string | null
}

// Fila de GET /planillas?periodo_id=: la planilla con sus totales
export interface PlanillaResumen extends Planilla {
  ruta_codigo: string | null
  trabajadores: number
  total_bruto: string
  total_neto: string
}

export interface DetalleTrabajador {
  id: string
  trabajador_id: string
  trabajador_nombre: string
  horas_ordinarias: string
  horas_extra_diurnas: string
  horas_extra_nocturnas: string
  monto_bruto: string
  total_bonificaciones: string
  total_deducciones: string
  neto: string
  alertas: string[]
}

export interface CalculoPlanilla {
  periodo: { id: string; codigo: string; desde: string; hasta: string; estado: EstadoPeriodo }
  planilla: Planilla
  resumen: { trabajadores: number; horas_ordinarias: string; horas_extra: string; total_bruto: string; total_neto: string }
  detalle: DetalleTrabajador[]
  page: number
  page_size: number
  total: number
}

export interface Pago {
  id: string
  detalle_id: string
  trabajador_id: string
  trabajador_nombre: string
  metodo: string
  estado: 'PROCESADO' | 'RECHAZADO' | 'ANULADO'
  referencia_transaccion: string | null
  monto_pagado: string
  pagado_at: string
}

export interface NuevoPago {
  detalle_id: string
  monto: string
  referencia: string | null
}

// Catálogo metodos_pago de M005
export const METODOS_PAGO = [
  { id: 1, nombre: 'Transferencia bancaria' },
  { id: 2, nombre: 'Cheque' },
  { id: 3, nombre: 'Efectivo' },
]

const POR_PAGINA = 100 // máximo que acepta la API

export const listarPeriodos = async (): Promise<Periodo[]> =>
  (await api<{ items: Periodo[] }>('GET', `/planillas/periodos?page_size=${POR_PAGINA}`)).items

export const crearPeriodo = (datos: { codigo: string; fecha_inicio: string; fecha_fin: string }) =>
  api<Periodo>('POST', '/planillas/periodos', datos)

export const listarPlanillas = async (periodoId: string): Promise<PlanillaResumen[]> =>
  (await api<{ items: PlanillaResumen[] }>('GET', `/planillas?periodo_id=${periodoId}`)).items

// Crea la planilla del período (sin ruta = general) y la calcula en el servidor
export const crearPlanilla = (periodoId: string, rutaId: string | null) =>
  api<Planilla>('POST', '/planillas', { periodo_id: periodoId, ruta_id: rutaId })

// La planilla con su resumen y el detalle completo (la API lo entrega por páginas de hasta 100 trabajadores)
export async function obtenerPlanilla(id: string): Promise<CalculoPlanilla> {
  const primera = await api<CalculoPlanilla>('GET', `/planillas/${id}?page_size=${POR_PAGINA}`)
  const detalle = [...primera.detalle]
  for (let page = 2; detalle.length < primera.total; page++) {
    const siguiente = await api<CalculoPlanilla>('GET', `/planillas/${id}?page=${page}&page_size=${POR_PAGINA}`)
    if (siguiente.detalle.length === 0) break
    detalle.push(...siguiente.detalle)
  }
  return { ...primera, detalle }
}

export const recalcularPlanilla = (id: string) => api<Planilla>('POST', `/planillas/${id}/calcular`)

export const verificarPlanilla = (id: string, observaciones: string) =>
  api<Planilla>('POST', `/planillas/${id}/verificar`, { observaciones })

// Aprobar y pagar piden la contraseña otra vez: POST /auth/reauth entrega un token de un solo uso (5 min)
const reautenticar = async (password: string) =>
  (await api<{ reauth_token: string }>('POST', '/auth/reauth', { password })).reauth_token

export async function aprobarPlanilla(id: string, totalEsperado: string, comentario: string, password: string) {
  const token = await reautenticar(password)
  return api<Planilla>(
    'POST',
    `/planillas/${id}/aprobar`,
    { total_esperado: totalEsperado, comentario: comentario.trim() || null },
    { 'X-Reauth-Token': token },
  )
}

export const listarPagos = async (id: string): Promise<Pago[]> =>
  (await api<{ items: Pago[] }>('GET', `/planillas/${id}/pagos`)).items

export async function registrarPagos(
  id: string,
  datos: { metodo_id: number; fecha_pago: string; pagos: NuevoPago[] },
  password: string,
) {
  const token = await reautenticar(password)
  return api<{ planilla_id: string; estado: EstadoPlanilla; pagos_registrados: number; total_pagado: string }>(
    'POST',
    `/planillas/${id}/pagos`,
    datos,
    { 'X-Reauth-Token': token, 'Idempotency-Key': crypto.randomUUID() },
  )
}

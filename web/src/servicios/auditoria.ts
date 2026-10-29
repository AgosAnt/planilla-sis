import { api } from '@/lib/api'

// Acciones del CHECK de auditoria.accion (M002)
export const ACCIONES = ['INSERT', 'UPDATE', 'DELETE', 'VERIFICAR', 'APROBAR', 'RECHAZAR', 'PAGAR', 'LOGIN', 'EXPORT'] as const
export type Accion = (typeof ACCIONES)[number]

// Tablas que hoy registran cambios en la bitácora
export const ENTIDADES = [
  { valor: 'perfiles', texto: 'Usuarios (altas, cambios, contraseñas y bloqueos)' },
  { valor: 'sesiones_refresh', texto: 'Sesiones (reúso de refresh)' },
  { valor: 'ruta_puntos', texto: 'Geocerca de rutas' },
  { valor: 'asignaciones_ruta', texto: 'Asignaciones' },
  { valor: 'acuerdos_turno', texto: 'Turnos' },
  { valor: 'registros_tiempo', texto: 'Jornadas' },
  { valor: 'eventos_diarios', texto: 'Emergencias y eventos' },
  { valor: 'historial_estado_trabajador', texto: 'Estados del trabajador' },
  { valor: 'tarifas_trabajador', texto: 'Tarifas' },
  { valor: 'parametros_pago', texto: 'Parámetros de pago' },
  { valor: 'feriados', texto: 'Feriados' },
  { valor: 'periodos_planilla', texto: 'Períodos' },
  { valor: 'planillas', texto: 'Planillas (cálculo, verificación, aprobación y pagos)' },
]

export interface RegistroAuditoria {
  id: string
  ocurrido_en: string
  actor_id: string | null
  actor_nombre: string | null
  actor_rol: string | null
  entidad: string
  entidad_id: string
  accion: Accion
  datos_antes: unknown
  datos_despues: unknown
}

export interface PaginaAuditoria {
  items: RegistroAuditoria[]
  page: number
  page_size: number
  total: number
}

export const POR_PAGINA = 50

export function listarAuditoria(filtros: { entidad?: string; accion?: string; desde?: string; hasta?: string; page: number }) {
  const params = new URLSearchParams({ page: String(filtros.page), page_size: String(POR_PAGINA) })
  for (const campo of ['entidad', 'accion', 'desde', 'hasta'] as const) {
    if (filtros[campo]) params.set(campo, filtros[campo])
  }
  return api<PaginaAuditoria>('GET', `/auditoria?${params}`)
}

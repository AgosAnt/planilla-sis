import { api } from '@/lib/api'

export type EstadoAtencion = 'PENDIENTE_REVISION' | 'EN_ATENCION' | 'ATENDIDO' | 'DESCARTADO'
export type TipoEvento = 'EMERGENCIA' | 'VISITA_FALLIDA' | 'PROBLEMA_VEHICULO' | 'CAMBIO_ESTADO' | 'NOTA' | 'OTRO'

export interface Evento {
  id: string
  trabajador_id: string
  trabajador_nombre: string
  registro_tiempo_id: string | null
  tipo_evento: TipoEvento
  origen: string
  latitud: number | null
  longitud: number | null
  estado_atencion: EstadoAtencion
  atendido_por: string | null
  atendido_at: string | null
  payload: Record<string, unknown>
  ocurrido_en: string
  recibido_en: string
}

export interface PaginaEventos {
  items: Evento[]
  page: number
  page_size: number
  total: number
}

export const ESTADOS_ATENCION: Record<EstadoAtencion, string> = {
  PENDIENTE_REVISION: 'Pendiente',
  EN_ATENCION: 'En atención',
  ATENDIDO: 'Atendido',
  DESCARTADO: 'Descartado',
}

export const TIPOS_EVENTO: Record<TipoEvento, string> = {
  EMERGENCIA: 'Emergencia',
  VISITA_FALLIDA: 'Visita fallida',
  PROBLEMA_VEHICULO: 'Problema con el vehículo',
  CAMBIO_ESTADO: 'Cambio de estado',
  NOTA: 'Nota',
  OTRO: 'Otro',
}

// Las mismas transiciones que valida la API; ATENDIDO y DESCARTADO son finales
export const SIGUIENTES: Record<EstadoAtencion, EstadoAtencion[]> = {
  PENDIENTE_REVISION: ['EN_ATENCION', 'ATENDIDO', 'DESCARTADO'],
  EN_ATENCION: ['ATENDIDO', 'DESCARTADO'],
  ATENDIDO: [],
  DESCARTADO: [],
}

export const POR_PAGINA = 50

export function listarEventos(filtros: { estado?: EstadoAtencion; tipo?: TipoEvento; page: number }) {
  const params = new URLSearchParams({ page: String(filtros.page), page_size: String(POR_PAGINA) })
  if (filtros.estado) params.set('estado_atencion', filtros.estado)
  if (filtros.tipo) params.set('tipo_evento', filtros.tipo)
  return api<PaginaEventos>('GET', `/eventos?${params}`)
}

export const atenderEvento = (id: string, estado: EstadoAtencion) =>
  api<Evento>('PATCH', `/eventos/${id}/atencion`, { estado_atencion: estado })

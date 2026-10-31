import { api, ErrorApi } from '@/lib/api'

export interface EstadoCatalogo {
  id: number
  codigo: string
  nombre: string
}

export interface EstadoTrabajador {
  id: string
  trabajador_id: string
  estado: EstadoCatalogo
  inicio_at: string
  fin_at: string | null
  motivo: string | null
  cambiado_por: string | null
}

// Trabajador de alguna ruta visible (asignación activa), con las rutas donde está
export interface TrabajadorDeRuta {
  id: string
  nombre: string
  rutas: string[]
}

interface Asignacion {
  trabajador_id: string
  trabajador_nombre: string
  activa: boolean
}

export const listarEstados = () => api<EstadoCatalogo[]>('GET', '/catalogos/estados-trabajador')

// La API no tiene una lista de trabajadores para el supervisor: se arma con las asignaciones activas de las
// rutas que ve (el administrador, todas; el supervisor, las suyas).
export async function listarTrabajadores(): Promise<TrabajadorDeRuta[]> {
  const { items: rutas } = await api<{ items: { id: string; codigo: string }[] }>('GET', '/rutas?page_size=100')
  const asignaciones = await Promise.all(
    rutas.map(async (ruta) => ({
      ruta: ruta.codigo,
      items: (await api<{ items: Asignacion[] }>('GET', `/rutas/${ruta.id}/asignaciones?page_size=100`)).items,
    })),
  )
  const trabajadores = new Map<string, TrabajadorDeRuta>()
  for (const { ruta, items } of asignaciones) {
    for (const a of items.filter((x) => x.activa)) {
      const actual = trabajadores.get(a.trabajador_id) ?? { id: a.trabajador_id, nombre: a.trabajador_nombre, rutas: [] }
      if (!actual.rutas.includes(ruta)) actual.rutas.push(ruta)
      trabajadores.set(a.trabajador_id, actual)
    }
  }
  return [...trabajadores.values()].sort((a, b) => a.nombre.localeCompare(b.nombre))
}

// null si el trabajador todavía no tiene estados registrados (404 SIN_ESTADO_REGISTRADO)
export async function estadoActual(trabajadorId: string): Promise<EstadoTrabajador | null> {
  try {
    return await api<EstadoTrabajador>('GET', `/trabajadores/${trabajadorId}/estado`)
  } catch (error) {
    if (error instanceof ErrorApi && error.code === 'SIN_ESTADO_REGISTRADO') return null
    throw error
  }
}

export const historial = async (trabajadorId: string) =>
  (await api<{ items: EstadoTrabajador[] }>('GET', `/trabajadores/${trabajadorId}/estados/historial?page_size=100`)).items

export const cambiarEstado = (trabajadorId: string, datos: { estado_codigo: string; inicio_at: string; motivo: string | null }) =>
  api<EstadoTrabajador>('POST', `/trabajadores/${trabajadorId}/estado`, datos)

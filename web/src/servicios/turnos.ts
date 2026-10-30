import { api } from '@/lib/api'
import { listarTrabajadores } from '@/servicios/estados'

export type EstadoAcuerdo = 'PROPUESTO' | 'ACEPTADO' | 'RECHAZADO' | 'CONFIRMADO'

export interface Turno {
  id: number
  nombre: string
  hora_inicio: string
  hora_fin: string
}

export interface Acuerdo {
  id: string
  asignacion_id: string
  fecha: string
  turno: { id: number; nombre: string; hora_inicio: string; hora_fin: string }
  estado: EstadoAcuerdo
  confirmado_por: string | null
  confirmado_at: string | null
  trabajador_id?: string
  ruta_id?: string
}

export interface Asignacion {
  id: string
  ruta_id: string
  trabajador_id: string
  trabajador_nombre: string
  fecha_inicio: string
  fecha_fin: string | null
  activa: boolean
  acuerdo_turno: Acuerdo | null // el de hoy o el próximo; si no hay, el último
}

export const ESTADOS: Record<EstadoAcuerdo, { texto: string; color: string }> = {
  PROPUESTO: { texto: 'Esperando al trabajador', color: 'bg-blue-500/10 text-blue-600' },
  ACEPTADO: { texto: 'Aceptado: falta confirmar', color: 'bg-orange-500/10 text-orange-600' },
  RECHAZADO: { texto: 'Rechazado', color: 'bg-destructive/10 text-destructive' },
  CONFIRMADO: { texto: 'Confirmado', color: 'bg-green-500/10 text-green-600' },
}

export const listarTurnos = () => api<Turno[]>('GET', '/catalogos/turnos')

export const listarAsignaciones = async (rutaId: string) =>
  (await api<{ items: Asignacion[] }>('GET', `/rutas/${rutaId}/asignaciones?page_size=100`)).items

// La asignación crea también el acuerdo del primer día con ese turno (queda PROPUESTO)
export const asignar = (rutaId: string, datos: { trabajador_id: string; fecha_inicio: string; fecha_fin: string | null; turno_id: number }) =>
  api<Asignacion>('POST', `/rutas/${rutaId}/asignaciones`, datos)

// Cierra la asignación en esa fecha (no se borra: queda en el historial)
export const terminarAsignacion = (id: string, fechaFin: string) => api<Asignacion>('PATCH', `/asignaciones/${id}`, { fecha_fin: fechaFin })

export const proponerTurno = (asignacionId: string, fecha: string, turnoId: number) =>
  api<Acuerdo>('POST', `/asignaciones/${asignacionId}/acuerdos`, { fecha, turno_id: turnoId })

// Acuerdos de las rutas visibles desde una fecha (el supervisor ve los de sus rutas)
export const listarAcuerdos = async (desde: string) =>
  (await api<{ items: Acuerdo[] }>('GET', `/acuerdos-turno?desde=${desde}&page_size=100`)).items

// A quién se puede asignar: el administrador ve a todos los trabajadores activos (GET /admin/usuarios); el
// supervisor no tiene ese listado, así que se le ofrecen los que ya trabajan en sus rutas.
export async function trabajadoresParaAsignar(esAdmin: boolean): Promise<{ id: string; nombre: string }[]> {
  if (!esAdmin) return (await listarTrabajadores()).map((t) => ({ id: t.id, nombre: t.nombre }))
  const { items } = await api<{ items: { id: string; nombres: string; apellidos: string }[] }>(
    'GET',
    '/admin/usuarios?rol=trabajador&activo=true&page_size=100',
  )
  return items.map((u) => ({ id: u.id, nombre: `${u.nombres} ${u.apellidos}` }))
}

export const confirmar = (acuerdoId: string) => api<Acuerdo>('POST', `/acuerdos-turno/${acuerdoId}/confirmar`)

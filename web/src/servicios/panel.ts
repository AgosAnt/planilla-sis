import { api } from '@/lib/api'

// Resumen del Panel: cuántas cosas esperan a alguien. Cada número sale de una consulta independiente; si una falla,
// esa tarjeta muestra "—" y las demás siguen funcionando. El RLS hace que el supervisor solo cuente lo de sus rutas.

interface Pagina {
  items: unknown[]
  total: number
}

const total = async (ruta: string) => (await api<Pagina>('GET', ruta)).total

const hoy = () => {
  const ahora = new Date()
  return new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export const jornadasPorValidar = () => total('/registros-tiempo?estado_validacion=PENDIENTE&page_size=1')

// Jornadas de hoy que siguen sin salida
export const enRutaHoy = async () => {
  const { items } = await api<{ items: { salida_at: string | null }[] }>('GET', `/registros-tiempo?desde=${hoy()}&page_size=100`)
  return items.filter((r) => r.salida_at === null).length
}

export const emergenciasPendientes = () => total('/eventos?estado_atencion=PENDIENTE_REVISION&tipo_evento=EMERGENCIA&page_size=1')

export const eventosPendientes = () => total('/eventos?estado_atencion=PENDIENTE_REVISION&page_size=1')

export const turnosPorConfirmar = () => total(`/acuerdos-turno?estado=ACEPTADO&desde=${hoy()}&page_size=1`)

// Planillas del período más reciente, contadas por estado
export async function planillasDelPeriodo() {
  const { items } = await api<{ items: { id: string; codigo: string }[] }>('GET', '/planillas/periodos?page_size=1')
  const periodo = items[0]
  if (!periodo) return null
  const planillas = (await api<{ items: { estado: string }[] }>('GET', `/planillas?periodo_id=${periodo.id}`)).items
  const contar = (estado: string) => planillas.filter((p) => p.estado === estado).length
  return {
    codigo: periodo.codigo,
    porVerificar: contar('CALCULADA'),
    porAprobar: contar('VERIFICADA'),
    porPagar: contar('APROBADA'),
    pagadas: contar('PAGADA'),
  }
}

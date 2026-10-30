import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ErrorApi } from '@/lib/api'
import * as servicio from '@/servicios/eventos'
import type { EstadoAtencion, Evento, PaginaEventos, TipoEvento } from '@/servicios/eventos'

// Eventos que envía la app móvil (botón de emergencia, notas, problemas con el vehículo...).
// Primero aparecen los que esperan atención; el supervisor del trabajador o el administrador los atienden.

const mensajeDe = (error: unknown) => (error instanceof ErrorApi ? error.message : 'No se pudo conectar con el servidor.')

const fechaHora = (instante: string) => new Date(instante).toLocaleString('es-GT', { dateStyle: 'short', timeStyle: 'short' })

const COLORES: Record<EstadoAtencion, string> = {
  PENDIENTE_REVISION: 'bg-destructive/10 text-destructive',
  EN_ATENCION: 'bg-orange-500/10 text-orange-600',
  ATENDIDO: 'bg-green-500/10 text-green-600',
  DESCARTADO: 'bg-muted text-muted-foreground',
}

const ACCIONES: Record<EstadoAtencion, string> = {
  PENDIENTE_REVISION: '',
  EN_ATENCION: 'Atender',
  ATENDIDO: 'Marcar atendido',
  DESCARTADO: 'Descartar',
}

// Lo que el móvil manda en payload (texto libre y precisión del GPS), en una línea
function detalleDe(evento: Evento) {
  const partes: string[] = []
  for (const clave of ['descripcion', 'nota', 'mensaje']) {
    const valor = evento.payload[clave]
    if (typeof valor === 'string' && valor.trim()) partes.push(valor.trim())
  }
  const precision = evento.payload.precision_m
  if (typeof precision === 'number') partes.push(`GPS ±${Math.round(precision)} m`)
  return partes.join(' · ') || '—'
}

const campo = 'rounded-md border bg-background px-3 py-2 text-sm'
const encabezado = 'px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground'

export default function Emergencias() {
  const [estado, setEstado] = useState<EstadoAtencion | ''>('')
  const [tipo, setTipo] = useState<TipoEvento | ''>('')
  const [page, setPage] = useState(1)
  const [pagina, setPagina] = useState<PaginaEventos | null>(null)
  const [version, setVersion] = useState(0)
  const [enviando, setEnviando] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fallar = useCallback((e: unknown) => setError(mensajeDe(e)), [])

  useEffect(() => {
    let activo = true
    servicio.listarEventos({ estado: estado || undefined, tipo: tipo || undefined, page }).then(
      (datos) => activo && setPagina(datos),
      (e) => activo && fallar(e),
    )
    return () => {
      activo = false
    }
  }, [estado, tipo, page, version, fallar])

  async function atender(evento: Evento, nuevo: EstadoAtencion) {
    if (nuevo === 'DESCARTADO' && !window.confirm(`¿Descartar el evento de ${evento.trabajador_nombre}?`)) return
    setEnviando(evento.id)
    try {
      await servicio.atenderEvento(evento.id, nuevo)
      setError(null)
      setVersion((v) => v + 1)
    } catch (e) {
      fallar(e)
    } finally {
      setEnviando(null)
    }
  }

  const paginas = pagina ? Math.max(1, Math.ceil(pagina.total / servicio.POR_PAGINA)) : 1

  return (
    <div className="space-y-6 p-6 text-foreground">
      <div>
        <h1 className="text-3xl font-bold">Emergencias y eventos</h1>
        <p className="mt-1 text-sm text-muted-foreground">Avisos enviados desde la app móvil durante la jornada.</p>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <label className="space-y-1 text-sm">
          <span className="block">Estado</span>
          <select
            className={campo}
            value={estado}
            onChange={(e) => {
              setEstado(e.target.value as EstadoAtencion | '')
              setPage(1)
            }}
          >
            <option value="">Todos</option>
            {Object.entries(servicio.ESTADOS_ATENCION).map(([valor, texto]) => (
              <option key={valor} value={valor}>
                {texto}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="block">Tipo</span>
          <select
            className={campo}
            value={tipo}
            onChange={(e) => {
              setTipo(e.target.value as TipoEvento | '')
              setPage(1)
            }}
          >
            <option value="">Todos</option>
            {Object.entries(servicio.TIPOS_EVENTO).map(([valor, texto]) => (
              <option key={valor} value={valor}>
                {texto}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {pagina === null ? (
          <p className="p-8 text-center text-muted-foreground">Cargando eventos…</p>
        ) : pagina.items.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground">No hay eventos con esos filtros.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className={encabezado}>Fecha</th>
                  <th className={encabezado}>Trabajador</th>
                  <th className={encabezado}>Tipo</th>
                  <th className={encabezado}>Detalle</th>
                  <th className={encabezado}>Ubicación</th>
                  <th className={encabezado}>Estado</th>
                  <th className={encabezado}>Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {pagina.items.map((ev) => (
                  <tr key={ev.id} className={ev.tipo_evento === 'EMERGENCIA' && ev.estado_atencion === 'PENDIENTE_REVISION' ? 'bg-destructive/5' : ''}>
                    <td className="whitespace-nowrap px-4 py-3">{fechaHora(ev.ocurrido_en)}</td>
                    <td className="px-4 py-3 font-medium">{ev.trabajador_nombre}</td>
                    <td className="px-4 py-3">{servicio.TIPOS_EVENTO[ev.tipo_evento] ?? ev.tipo_evento}</td>
                    <td className="px-4 py-3 text-muted-foreground">{detalleDe(ev)}</td>
                    <td className="px-4 py-3">
                      {ev.latitud !== null && ev.longitud !== null ? (
                        <a
                          href={`https://www.google.com/maps?q=${ev.latitud},${ev.longitud}`}
                          target="_blank"
                          rel="noreferrer"
                          className="underline"
                        >
                          Ver mapa
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${COLORES[ev.estado_atencion]}`}>
                        {servicio.ESTADOS_ATENCION[ev.estado_atencion]}
                      </span>
                      {ev.atendido_at && <div className="mt-1 text-xs text-muted-foreground">{fechaHora(ev.atendido_at)}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {servicio.SIGUIENTES[ev.estado_atencion].map((siguiente) => (
                          <Button
                            key={siguiente}
                            size="sm"
                            variant={siguiente === 'DESCARTADO' ? 'destructive' : 'outline'}
                            disabled={enviando === ev.id}
                            onClick={() => atender(ev, siguiente)}
                          >
                            {ACCIONES[siguiente]}
                          </Button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pagina && pagina.total > servicio.POR_PAGINA && (
        <div className="flex items-center gap-3 text-sm">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <span>
            Página {page} de {paginas}
          </span>
          <Button variant="outline" size="sm" disabled={page >= paginas} onClick={() => setPage((p) => p + 1)}>
            Siguiente
          </Button>
        </div>
      )}
    </div>
  )
}

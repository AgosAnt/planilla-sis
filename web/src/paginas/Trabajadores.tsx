import { useCallback, useEffect, useState, type SyntheticEvent } from 'react'
import { Button } from '@/components/ui/button'
import { ErrorApi } from '@/lib/api'
import * as servicio from '@/servicios/estados'
import type { EstadoCatalogo, EstadoTrabajador, TrabajadorDeRuta } from '@/servicios/estados'

// Estados del trabajador (CU-03): activo, vacaciones, incapacidad, suspendido... con su historial.
// Cambiar el estado: administrador o supervisor del trabajador; el estado anterior se cierra solo.

const mensajeDe = (error: unknown) => (error instanceof ErrorApi ? error.message : 'No se pudo conectar con el servidor.')

const fechaHora = (instante: string) => new Date(instante).toLocaleString('es-GT', { dateStyle: 'short', timeStyle: 'short' })

// Valor para <input type="datetime-local"> con la hora local actual
const ahoraLocal = () => {
  const ahora = new Date()
  return new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

const COLORES: Record<string, string> = {
  ACTIVO: 'bg-green-500/10 text-green-600',
  VACACIONES: 'bg-blue-500/10 text-blue-600',
  SUSPENDIDO: 'bg-destructive/10 text-destructive',
}

function Etiqueta({ estado }: { estado: EstadoCatalogo | null }) {
  if (!estado) return <span className="text-xs text-muted-foreground">Sin registro</span>
  const color = COLORES[estado.codigo] ?? 'bg-orange-500/10 text-orange-600'
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${color}`}>{estado.nombre}</span>
}

const campo = 'w-full rounded-md border bg-background px-3 py-2 text-sm'
const encabezado = 'px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground'

interface Fila extends TrabajadorDeRuta {
  actual: EstadoTrabajador | null
}

export default function Trabajadores() {
  const [filas, setFilas] = useState<Fila[] | null>(null)
  const [catalogo, setCatalogo] = useState<EstadoCatalogo[]>([])
  const [seleccion, setSeleccion] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const fallar = useCallback((e: unknown) => {
    setAviso(null)
    setError(mensajeDe(e))
  }, [])

  useEffect(() => {
    servicio.listarEstados().then(setCatalogo, fallar)
  }, [fallar])

  useEffect(() => {
    let activo = true
    servicio
      .listarTrabajadores()
      .then((trabajadores) =>
        Promise.all(trabajadores.map(async (t) => ({ ...t, actual: await servicio.estadoActual(t.id) }))),
      )
      .then(
        (datos) => activo && setFilas(datos),
        (e) => activo && fallar(e),
      )
    return () => {
      activo = false
    }
  }, [version, fallar])

  const elegido = filas?.find((f) => f.id === seleccion)

  return (
    <div className="space-y-6 p-6 text-foreground">
      <div>
        <h1 className="text-3xl font-bold">Trabajadores</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Estado de cada trabajador de tus rutas (activo, vacaciones, incapacidad…) y su historial.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </p>
      )}
      {aviso && <p className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-700">{aviso}</p>}

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {filas === null ? (
          <p className="p-8 text-center text-muted-foreground">Cargando trabajadores…</p>
        ) : filas.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground">No hay trabajadores asignados a tus rutas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className={encabezado}>Trabajador</th>
                  <th className={encabezado}>Ruta</th>
                  <th className={encabezado}>Estado</th>
                  <th className={encabezado}>Desde</th>
                  <th className={encabezado}></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {filas.map((f) => (
                  <tr key={f.id} className={seleccion === f.id ? 'bg-muted/50' : ''}>
                    <td className="px-4 py-3 font-medium">{f.nombre}</td>
                    <td className="px-4 py-3">{f.rutas.join(', ')}</td>
                    <td className="px-4 py-3">
                      <Etiqueta estado={f.actual?.estado ?? null} />
                    </td>
                    <td className="px-4 py-3">{f.actual ? fechaHora(f.actual.inicio_at) : '—'}</td>
                    <td className="px-4 py-3">
                      <Button variant="outline" size="sm" onClick={() => setSeleccion(f.id)}>
                        Cambiar estado
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {elegido && (
        <DetalleTrabajador
          key={`${elegido.id}-${version}`}
          trabajador={elegido}
          catalogo={catalogo}
          alCambiar={(nuevo) => {
            setError(null)
            setAviso(`${elegido.nombre} ahora está en ${nuevo.estado.nombre}.`)
            setVersion((v) => v + 1)
          }}
          alFallar={fallar}
        />
      )}
    </div>
  )
}

interface PropsDetalle {
  trabajador: Fila
  catalogo: EstadoCatalogo[]
  alCambiar: (nuevo: EstadoTrabajador) => void
  alFallar: (error: unknown) => void
}

function DetalleTrabajador({ trabajador, catalogo, alCambiar, alFallar }: PropsDetalle) {
  const opciones = catalogo.filter((e) => e.codigo !== trabajador.actual?.estado.codigo)
  const [historial, setHistorial] = useState<EstadoTrabajador[] | null>(null)
  const [codigo, setCodigo] = useState('')
  // null = "ahora": se manda la hora exacta al guardar (el campo solo tiene minutos y dos cambios seguidos chocarían)
  const [inicio, setInicio] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    servicio.historial(trabajador.id).then(setHistorial, alFallar)
  }, [trabajador.id, alFallar])

  const estado = opciones.some((o) => o.codigo === codigo) ? codigo : (opciones[0]?.codigo ?? '')

  async function cambiar(evento: SyntheticEvent<HTMLFormElement>) {
    evento.preventDefault()
    setEnviando(true)
    try {
      const nuevo = await servicio.cambiarEstado(trabajador.id, {
        estado_codigo: estado,
        inicio_at: (inicio ? new Date(inicio) : new Date()).toISOString(),
        motivo: motivo.trim() || null,
      })
      alCambiar(nuevo)
    } catch (e) {
      alFallar(e)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className="grid gap-6 rounded-xl border bg-card p-6 shadow-sm lg:grid-cols-2">
      <form onSubmit={cambiar} className="space-y-3">
        <h2 className="text-lg font-semibold">Cambiar estado de {trabajador.nombre}</h2>
        <label className="block space-y-1 text-sm">
          <span>Nuevo estado</span>
          <select value={estado} onChange={(e) => setCodigo(e.target.value)} className={campo}>
            {opciones.map((o) => (
              <option key={o.codigo} value={o.codigo}>
                {o.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span>Desde</span>
          <input
            type="datetime-local"
            required
            max={ahoraLocal()}
            value={inicio ?? ahoraLocal()}
            onChange={(e) => setInicio(e.target.value || null)}
            className={campo}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Motivo (opcional)</span>
          <textarea rows={2} maxLength={1000} value={motivo} onChange={(e) => setMotivo(e.target.value)} className={campo} />
        </label>
        <Button type="submit" disabled={enviando || !estado}>
          {enviando ? 'Guardando…' : 'Guardar estado'}
        </Button>
      </form>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Historial</h2>
        {historial === null ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : historial.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin estados registrados.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {historial.map((h) => (
              <li key={h.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <Etiqueta estado={h.estado} />
                  <span className="text-muted-foreground">
                    {fechaHora(h.inicio_at)} → {h.fin_at ? fechaHora(h.fin_at) : 'vigente'}
                  </span>
                </div>
                {h.motivo && <p className="mt-2 text-muted-foreground">{h.motivo}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

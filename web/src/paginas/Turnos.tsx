import { useCallback, useEffect, useState, type SyntheticEvent } from 'react'
import { Button } from '@/components/ui/button'
import { ErrorApi } from '@/lib/api'
import * as servicio from '@/servicios/turnos'
import type { Acuerdo, Asignacion, Turno } from '@/servicios/turnos'
import { rutasService, type Ruta } from '@/servicios/rutas'
import { useSesion } from '@/sesion/contexto'

// Turnos (CU-05 y CU-06): se asigna al trabajador a una ruta, se le propone un turno por día, él lo acepta o rechaza
// en la app móvil y el supervisor (o el administrador) confirma los aceptados.

const mensajeDe = (error: unknown) => (error instanceof ErrorApi ? error.message : 'No se pudo conectar con el servidor.')

const campo = 'w-full rounded-md border bg-background px-3 py-2 text-sm'
const tarjeta = 'rounded-xl border bg-card p-6 shadow-sm'
const encabezado = 'px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground'

// Fecha local como YYYY-MM-DD; dias permite pedir mañana (1) u otra fecha relativa
const fechaLocal = (dias = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

// "2026-11-03" -> "mar 03/11"
const diaCorto = (fecha: string) => {
  const [a, m, d] = fecha.split('-').map(Number)
  return new Date(a, m - 1, d).toLocaleDateString('es-GT', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

function Estado({ acuerdo }: { acuerdo: Acuerdo }) {
  const { texto, color } = servicio.ESTADOS[acuerdo.estado]
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${color}`}>{texto}</span>
}

export default function Turnos() {
  const { usuario } = useSesion()
  const esAdmin = usuario?.rol === 'administrador'
  const [rutas, setRutas] = useState<Ruta[]>([])
  const [rutaElegida, setRutaElegida] = useState('')
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [datos, setDatos] = useState<{ rutaId: string; asignaciones: Asignacion[]; acuerdos: Acuerdo[] } | null>(null)
  const [version, setVersion] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const fallar = useCallback((e: unknown) => {
    setAviso(null)
    setError(mensajeDe(e))
  }, [])
  const informar = useCallback((texto: string) => {
    setError(null)
    setAviso(texto)
    setVersion((v) => v + 1)
  }, [])

  useEffect(() => {
    rutasService.getRutas().then((todas) => setRutas(todas.filter((r) => r.activa)), fallar)
    servicio.listarTurnos().then(setTurnos, fallar)
  }, [fallar])

  const rutaId = String((rutas.find((r) => String(r.id) === rutaElegida) ?? rutas[0])?.id ?? '')

  useEffect(() => {
    if (!rutaId) return
    let vigente = true
    Promise.all([servicio.listarAsignaciones(rutaId), servicio.listarAcuerdos(fechaLocal())]).then(
      ([asignaciones, acuerdos]) =>
        vigente && setDatos({ rutaId, asignaciones, acuerdos: acuerdos.filter((a) => a.ruta_id === rutaId) }),
      (e) => vigente && fallar(e),
    )
    return () => {
      vigente = false
    }
  }, [rutaId, version, fallar])

  const actual = datos?.rutaId === rutaId ? datos : null
  const nombreDe = new Map(actual?.asignaciones.map((a) => [a.id, a.trabajador_nombre]) ?? [])
  const activas = actual?.asignaciones.filter((a) => a.activa && (a.fecha_fin === null || a.fecha_fin >= fechaLocal())) ?? []
  const porConfirmar = actual?.acuerdos.filter((a) => a.estado === 'ACEPTADO') ?? []

  async function confirmar(acuerdo: Acuerdo) {
    try {
      await servicio.confirmar(acuerdo.id)
      informar(`Turno del ${diaCorto(acuerdo.fecha)} de ${nombreDe.get(acuerdo.asignacion_id) ?? 'el trabajador'} confirmado.`)
    } catch (e) {
      fallar(e)
    }
  }

  async function terminar(asignacion: Asignacion) {
    if (!window.confirm(`¿Terminar la asignación de ${asignacion.trabajador_nombre} a esta ruta hoy? Queda en el historial.`)) return
    try {
      await servicio.terminarAsignacion(asignacion.id, fechaLocal())
      informar(`La asignación de ${asignacion.trabajador_nombre} termina hoy.`)
    } catch (e) {
      fallar(e)
    }
  }

  return (
    <div className="space-y-6 p-6 text-foreground">
      <div>
        <h1 className="text-3xl font-bold">Turnos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Asigna trabajadores a la ruta y propón su turno de cada día. El trabajador lo acepta en la app y tú lo confirmas.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </p>
      )}
      {aviso && <p className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-700">{aviso}</p>}

      <label className="block max-w-md space-y-1 text-sm">
        <span className="font-medium">Ruta</span>
        <select className={campo} value={rutaId} onChange={(e) => setRutaElegida(e.target.value)}>
          {rutas.length === 0 && <option value="">No tienes rutas activas</option>}
          {rutas.map((r) => (
            <option key={String(r.id)} value={String(r.id)}>
              {r.codigo} · {r.nombre}
            </option>
          ))}
        </select>
      </label>

      {rutaId && !actual && <p className="text-sm text-muted-foreground">Cargando…</p>}

      {actual && (
        <>
          <section className={`${tarjeta} space-y-4`}>
            <h2 className="text-lg font-semibold">Por confirmar ({porConfirmar.length})</h2>
            {porConfirmar.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay turnos aceptados esperando confirmación.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {porConfirmar.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span>
                      <strong>{nombreDe.get(a.asignacion_id) ?? 'Trabajador'}</strong> · {diaCorto(a.fecha)} · {a.turno.nombre}{' '}
                      {a.turno.hora_inicio}-{a.turno.hora_fin}
                    </span>
                    <Button size="sm" onClick={() => confirmar(a)}>
                      Confirmar
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={`${tarjeta} space-y-4`}>
            <h2 className="text-lg font-semibold">Trabajadores asignados</h2>
            {activas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Esta ruta no tiene trabajadores asignados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted">
                    <tr>
                      <th className={encabezado}>Trabajador</th>
                      <th className={encabezado}>Asignado</th>
                      <th className={encabezado}>Próximo turno</th>
                      <th className={encabezado}>Proponer turno</th>
                      <th className={encabezado}></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-sm">
                    {activas.map((a) => (
                      <tr key={a.id}>
                        <td className="px-4 py-3 font-medium">{a.trabajador_nombre}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          desde {diaCorto(a.fecha_inicio)}
                          {a.fecha_fin && ` hasta ${diaCorto(a.fecha_fin)}`}
                        </td>
                        <td className="px-4 py-3">
                          {a.acuerdo_turno ? (
                            <div className="space-y-1">
                              <div>
                                {diaCorto(a.acuerdo_turno.fecha)} · {a.acuerdo_turno.turno.nombre}
                              </div>
                              <Estado acuerdo={a.acuerdo_turno} />
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Sin turno</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <ProponerTurno asignacion={a} turnos={turnos} alProponer={informar} alFallar={fallar} />
                        </td>
                        <td className="px-4 py-3">
                          <Button size="sm" variant="destructive" onClick={() => terminar(a)}>
                            Terminar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <Asignar
            key={rutaId}
            rutaId={rutaId}
            esAdmin={esAdmin}
            turnos={turnos}
            yaAsignados={new Set(activas.map((a) => a.trabajador_id))}
            alAsignar={informar}
            alFallar={fallar}
          />

          {actual.acuerdos.length > 0 && (
            <section className={`${tarjeta} space-y-3`}>
              <h2 className="text-lg font-semibold">Turnos desde hoy</h2>
              <ul className="divide-y divide-border text-sm">
                {actual.acuerdos.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span>
                      {diaCorto(a.fecha)} · <strong>{nombreDe.get(a.asignacion_id) ?? 'Trabajador'}</strong> · {a.turno.nombre}{' '}
                      {a.turno.hora_inicio}-{a.turno.hora_fin}
                    </span>
                    <Estado acuerdo={a} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}

interface PropsProponer {
  asignacion: Asignacion
  turnos: Turno[]
  alProponer: (texto: string) => void
  alFallar: (error: unknown) => void
}

function ProponerTurno({ asignacion, turnos, alProponer, alFallar }: PropsProponer) {
  const [fecha, setFecha] = useState(() => fechaLocal(1))
  const [turnoId, setTurnoId] = useState(0)
  const [enviando, setEnviando] = useState(false)
  const turno = turnoId || turnos[0]?.id || 0

  async function proponer(evento: SyntheticEvent<HTMLFormElement>) {
    evento.preventDefault()
    setEnviando(true)
    try {
      await servicio.proponerTurno(asignacion.id, fecha, turno)
      alProponer(`Turno del ${diaCorto(fecha)} propuesto a ${asignacion.trabajador_nombre}. Lo verá en la app para aceptarlo.`)
    } catch (e) {
      alFallar(e)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={proponer} className="flex flex-wrap items-center gap-2">
      <input
        type="date"
        required
        aria-label={`Fecha del turno de ${asignacion.trabajador_nombre}`}
        min={asignacion.fecha_inicio}
        max={asignacion.fecha_fin ?? undefined}
        value={fecha}
        onChange={(e) => setFecha(e.target.value)}
        className="rounded-md border bg-background px-2 py-1 text-sm"
      />
      <select
        aria-label={`Turno de ${asignacion.trabajador_nombre}`}
        value={turno}
        onChange={(e) => setTurnoId(Number(e.target.value))}
        className="rounded-md border bg-background px-2 py-1 text-sm"
      >
        {turnos.map((t) => (
          <option key={t.id} value={t.id}>
            {t.nombre} {t.hora_inicio}-{t.hora_fin}
          </option>
        ))}
      </select>
      <Button type="submit" size="sm" variant="outline" disabled={enviando || !turno}>
        Proponer
      </Button>
    </form>
  )
}

interface PropsAsignar {
  rutaId: string
  esAdmin: boolean
  turnos: Turno[]
  yaAsignados: Set<string>
  alAsignar: (texto: string) => void
  alFallar: (error: unknown) => void
}

function Asignar({ rutaId, esAdmin, turnos, yaAsignados, alAsignar, alFallar }: PropsAsignar) {
  const [candidatos, setCandidatos] = useState<{ id: string; nombre: string }[] | null>(null)
  const [trabajador, setTrabajador] = useState('')
  const [desde, setDesde] = useState(() => fechaLocal())
  const [hasta, setHasta] = useState('')
  const [turnoId, setTurnoId] = useState(0)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    servicio.trabajadoresParaAsignar(esAdmin).then(setCandidatos, alFallar)
  }, [esAdmin, alFallar])

  const opciones = (candidatos ?? []).filter((c) => !yaAsignados.has(c.id))
  const elegido = opciones.some((o) => o.id === trabajador) ? trabajador : (opciones[0]?.id ?? '')
  const turno = turnoId || turnos[0]?.id || 0

  async function asignar(evento: SyntheticEvent<HTMLFormElement>) {
    evento.preventDefault()
    setEnviando(true)
    try {
      await servicio.asignar(rutaId, { trabajador_id: elegido, fecha_inicio: desde, fecha_fin: hasta || null, turno_id: turno })
      alAsignar(`${opciones.find((o) => o.id === elegido)?.nombre} quedó asignado. Su primer turno quedó propuesto.`)
    } catch (e) {
      alFallar(e)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className={`${tarjeta} space-y-4`}>
      <h2 className="text-lg font-semibold">Asignar trabajador a esta ruta</h2>
      {candidatos === null ? (
        <p className="text-sm text-muted-foreground">Cargando trabajadores…</p>
      ) : opciones.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {esAdmin
            ? 'Todos los trabajadores activos ya están en esta ruta.'
            : 'No hay otros trabajadores de tus rutas para asignar. Para alguien nuevo, pídeselo al administrador.'}
        </p>
      ) : (
        <form onSubmit={asignar} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
          <label className="block space-y-1 text-sm lg:col-span-2">
            <span>Trabajador</span>
            <select value={elegido} onChange={(e) => setTrabajador(e.target.value)} className={campo}>
              {opciones.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span>Desde</span>
            <input type="date" required value={desde} onChange={(e) => setDesde(e.target.value)} className={campo} />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Hasta (opcional)</span>
            <input type="date" min={desde} value={hasta} onChange={(e) => setHasta(e.target.value)} className={campo} />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Turno del primer día</span>
            <select value={turno} onChange={(e) => setTurnoId(Number(e.target.value))} className={campo}>
              {turnos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre} {t.hora_inicio}-{t.hora_fin}
                </option>
              ))}
            </select>
          </label>
          <div className="lg:col-span-5">
            <Button type="submit" disabled={enviando || !elegido || !turno}>
              {enviando ? 'Asignando…' : 'Asignar'}
            </Button>
          </div>
        </form>
      )}
      {!esAdmin && opciones.length > 0 && (
        <p className="text-xs text-muted-foreground">Solo aparecen trabajadores que ya están en alguna de tus rutas.</p>
      )}
    </section>
  )
}

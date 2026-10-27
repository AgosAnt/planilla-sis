import { useCallback, useEffect, useState, type SyntheticEvent } from 'react'
import { Link } from 'react-router'
import { EstadoPlanilla } from '@/components/EstadoPlanilla'
import { Button } from '@/components/ui/button'
import { ErrorApi } from '@/lib/api'
import { formatoFecha, formatoQuetzales } from '@/lib/formato'
import * as servicio from '@/servicios/planillas'
import type { CalculoPlanilla, Periodo, PlanillaResumen } from '@/servicios/planillas'
import { rutasService, type Ruta } from '@/servicios/rutas'
import { useSesion } from '@/sesion/contexto'

// Flujo de la planilla (reglas de cálculo y M005): se calcula (admin o supervisor de la ruta), la verifica otro
// supervisor, la aprueba el administrador con su contraseña y después se paga en /pagos.

const mensajeDe = (error: unknown) => (error instanceof ErrorApi ? error.message : 'No se pudo conectar con el servidor.')

const ALERTAS: Record<string, string> = {
  SIN_TURNO_ACORDADO: 'Sin turno acordado',
  DOMINGO: 'Domingo',
  FERIADO: 'Feriado',
  FERIADO_MEDIO_DIA: 'Feriado (medio día)',
  JORNADA_MAYOR_AL_MAXIMO: 'Jornada mayor al máximo',
}

const campo = 'w-full rounded-md border bg-background px-3 py-2 text-sm'
const tarjeta = 'rounded-xl border bg-card p-6 shadow-sm'
const encabezado = 'px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground'

export default function Planillas() {
  const { usuario } = useSesion()
  const esAdmin = usuario?.rol === 'administrador'

  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [periodoElegido, setPeriodoElegido] = useState('')
  const [lista, setLista] = useState<{ periodoId: string; items: PlanillaResumen[] }>({ periodoId: '', items: [] })
  const [rutas, setRutas] = useState<Ruta[]>([])
  const [seleccion, setSeleccion] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  // Al subir la versión se vuelven a pedir los datos (después de crear, calcular, verificar o aprobar)
  const [versionPeriodos, setVersionPeriodos] = useState(0)
  const [versionLista, setVersionLista] = useState(0)

  const informar = useCallback((texto: string) => {
    setError(null)
    setAviso(texto)
  }, [])
  const fallar = useCallback((e: unknown) => {
    setAviso(null)
    setError(mensajeDe(e))
  }, [])

  useEffect(() => {
    let activo = true
    servicio.listarPeriodos().then(
      (datos) => activo && setPeriodos(datos),
      (e) => activo && fallar(e),
    )
    return () => {
      activo = false
    }
  }, [versionPeriodos, fallar])

  useEffect(() => {
    rutasService.getRutas().then(setRutas, () => setRutas([]))
  }, [])

  // Sin elección (o si ya no existe), el período más reciente
  const periodo = periodos.find((p) => p.id === periodoElegido) ?? periodos[0]
  const periodoId = periodo?.id ?? ''

  useEffect(() => {
    if (!periodoId) return
    let activo = true
    servicio.listarPlanillas(periodoId).then(
      (items) => activo && setLista({ periodoId, items }),
      (e) => activo && fallar(e),
    )
    return () => {
      activo = false
    }
  }, [periodoId, versionLista, fallar])

  const planillas = lista.periodoId === periodoId ? lista.items : []

  return (
    <div className="space-y-6 p-6 text-foreground">
      <div>
        <h1 className="text-3xl font-bold">Planillas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cálculo por período, verificación por otro supervisor y aprobación del administrador.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </p>
      )}
      {aviso && <p className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-700">{aviso}</p>}

      <section className={`${tarjeta} space-y-4`}>
        <div className="flex flex-wrap items-end gap-4">
          <label className="block min-w-64 space-y-1 text-sm">
            <span className="font-medium">Período</span>
            <select
              className={campo}
              value={periodoId}
              onChange={(e) => {
                setPeriodoElegido(e.target.value)
                setSeleccion(null)
              }}
            >
              {periodos.length === 0 && <option value="">No hay períodos</option>}
              {periodos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo} ({formatoFecha(p.fecha_inicio)} al {formatoFecha(p.fecha_fin)}) · {p.estado}
                </option>
              ))}
            </select>
          </label>
        </div>
        {esAdmin && (
          <NuevoPeriodo
            alCrear={(nuevo) => {
              informar(`Período ${nuevo.codigo} creado.`)
              setPeriodoElegido(nuevo.id)
              setSeleccion(null)
              setVersionPeriodos((v) => v + 1)
            }}
            alFallar={fallar}
          />
        )}
      </section>

      {periodo && (
        <section className={`${tarjeta} space-y-4`}>
          <h2 className="text-lg font-semibold">Planillas de {periodo.codigo}</h2>
          {planillas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Este período todavía no tiene planillas calculadas.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted">
                  <tr>
                    <th className={encabezado}>Ruta</th>
                    <th className={encabezado}>Estado</th>
                    <th className={encabezado}>Trabajadores</th>
                    <th className={encabezado}>Total bruto</th>
                    <th className={encabezado}>Total neto</th>
                    <th className={encabezado}></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {planillas.map((p) => (
                    <tr key={p.id} className={seleccion === p.id ? 'bg-muted/50' : ''}>
                      <td className="px-4 py-3 font-bold">{p.ruta_codigo ?? 'General (todas las rutas)'}</td>
                      <td className="px-4 py-3">
                        <EstadoPlanilla estado={p.estado} />
                      </td>
                      <td className="px-4 py-3">{p.trabajadores}</td>
                      <td className="px-4 py-3">{formatoQuetzales(p.total_bruto)}</td>
                      <td className="px-4 py-3 font-semibold">{formatoQuetzales(p.total_neto)}</td>
                      <td className="px-4 py-3">
                        <Button variant="outline" size="sm" onClick={() => setSeleccion(p.id)}>
                          Ver detalle
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <NuevaPlanilla
            periodo={periodo}
            rutas={rutas}
            esAdmin={esAdmin}
            existentes={planillas}
            alCrear={(id) => {
              informar('Planilla calculada.')
              setVersionLista((v) => v + 1)
              setVersionPeriodos((v) => v + 1)
              setSeleccion(id)
            }}
            alFallar={fallar}
          />
        </section>
      )}

      {seleccion && (
        <DetallePlanilla
          key={seleccion}
          id={seleccion}
          usuarioId={usuario?.id ?? ''}
          esAdmin={esAdmin}
          alCambiar={(texto) => {
            informar(texto)
            setVersionLista((v) => v + 1)
            setVersionPeriodos((v) => v + 1)
          }}
          alFallar={fallar}
        />
      )}
    </div>
  )
}

interface PropsFormulario {
  alFallar: (error: unknown) => void
}

function NuevoPeriodo({ alCrear, alFallar }: PropsFormulario & { alCrear: (periodo: Periodo) => void }) {
  const [abierto, setAbierto] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (!abierto) {
    return (
      <Button variant="outline" onClick={() => setAbierto(true)}>
        Nuevo período
      </Button>
    )
  }

  async function crear(evento: SyntheticEvent<HTMLFormElement>) {
    evento.preventDefault()
    setEnviando(true)
    try {
      const periodo = await servicio.crearPeriodo({ codigo: codigo.trim(), fecha_inicio: desde, fecha_fin: hasta })
      setAbierto(false)
      setCodigo('')
      alCrear(periodo)
    } catch (e) {
      alFallar(e)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={crear} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-4 sm:items-end">
      <label className="block space-y-1 text-sm">
        <span>Código</span>
        <input required maxLength={50} placeholder="2026-11-Q1" value={codigo} onChange={(e) => setCodigo(e.target.value)} className={campo} />
      </label>
      <label className="block space-y-1 text-sm">
        <span>Desde</span>
        <input type="date" required value={desde} onChange={(e) => setDesde(e.target.value)} className={campo} />
      </label>
      <label className="block space-y-1 text-sm">
        <span>Hasta</span>
        <input type="date" required min={desde} value={hasta} onChange={(e) => setHasta(e.target.value)} className={campo} />
      </label>
      <div className="flex gap-2">
        <Button type="submit" disabled={enviando}>
          {enviando ? 'Creando…' : 'Crear'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setAbierto(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}

interface PropsNuevaPlanilla extends PropsFormulario {
  periodo: Periodo
  rutas: Ruta[]
  esAdmin: boolean
  existentes: PlanillaResumen[]
  alCrear: (id: string) => void
}

// La planilla general (sin ruta) solo la calcula el administrador; el supervisor, las de sus rutas.
function NuevaPlanilla({ periodo, rutas, esAdmin, existentes, alCrear, alFallar }: PropsNuevaPlanilla) {
  const GENERAL = 'general'
  const ocupadas = new Set(existentes.map((p) => p.ruta_id ?? GENERAL))
  const opciones = [
    ...(esAdmin ? [{ valor: GENERAL, texto: 'General (todas las rutas)' }] : []),
    ...rutas.filter((r) => r.activa && r.id).map((r) => ({ valor: String(r.id), texto: `${r.codigo} · ${r.nombre}` })),
  ].filter((o) => !ocupadas.has(o.valor))
  const [eleccion, setEleccion] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (['CERRADO', 'PAGADO'].includes(periodo.estado)) return null
  if (opciones.length === 0) {
    return <p className="text-sm text-muted-foreground">Todas las rutas que gestionas ya tienen planilla en este período.</p>
  }
  const valor = opciones.some((o) => o.valor === eleccion) ? eleccion : opciones[0].valor

  async function calcular(evento: SyntheticEvent<HTMLFormElement>) {
    evento.preventDefault()
    setEnviando(true)
    try {
      const planilla = await servicio.crearPlanilla(periodo.id, valor === GENERAL ? null : valor)
      alCrear(planilla.id)
    } catch (e) {
      alFallar(e)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={calcular} className="flex flex-wrap items-end gap-3 border-t pt-4">
      <label className="block min-w-64 space-y-1 text-sm">
        <span>Calcular planilla de</span>
        <select value={valor} onChange={(e) => setEleccion(e.target.value)} className={campo}>
          {opciones.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.texto}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" disabled={enviando}>
        {enviando ? 'Calculando…' : 'Calcular'}
      </Button>
    </form>
  )
}

interface PropsDetalle extends PropsFormulario {
  id: string
  usuarioId: string
  esAdmin: boolean
  alCambiar: (texto: string) => void
}

function DetallePlanilla({ id, usuarioId, esAdmin, alCambiar, alFallar }: PropsDetalle) {
  const [calculo, setCalculo] = useState<CalculoPlanilla | null>(null)
  const [version, setVersion] = useState(0)
  const [observaciones, setObservaciones] = useState('')
  const [total, setTotal] = useState('')
  const [comentario, setComentario] = useState('')
  const [password, setPassword] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    let activo = true
    servicio.obtenerPlanilla(id).then(
      (datos) => activo && setCalculo(datos),
      (e) => activo && alFallar(e),
    )
    return () => {
      activo = false
    }
  }, [id, version, alFallar])

  if (!calculo) return <p className="text-sm text-muted-foreground">Cargando planilla…</p>
  const { planilla, resumen, detalle } = calculo

  async function ejecutar(accion: () => Promise<unknown>, texto: string) {
    setEnviando(true)
    try {
      await accion()
      setPassword('')
      setVersion((v) => v + 1)
      alCambiar(texto)
    } catch (e) {
      setPassword('')
      alFallar(e)
    } finally {
      setEnviando(false)
    }
  }

  const puedeVerificar = !esAdmin && planilla.estado === 'CALCULADA' && planilla.calculada_por !== usuarioId
  const puedeAprobar =
    esAdmin && planilla.estado === 'VERIFICADA' && ![planilla.calculada_por, planilla.verificada_por].includes(usuarioId)

  return (
    <section className={`${tarjeta} space-y-6`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            Planilla {calculo.periodo.codigo} · {formatoFecha(calculo.periodo.desde)} al {formatoFecha(calculo.periodo.hasta)}
          </h2>
          <div className="mt-1">
            <EstadoPlanilla estado={planilla.estado} />
          </div>
        </div>
        {planilla.estado === 'CALCULADA' && (
          <Button
            variant="outline"
            disabled={enviando}
            onClick={() => ejecutar(() => servicio.recalcularPlanilla(id), 'Planilla recalculada.')}
          >
            Recalcular
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Dato titulo="Trabajadores" valor={String(resumen.trabajadores)} />
        <Dato titulo="Horas ordinarias" valor={resumen.horas_ordinarias} />
        <Dato titulo="Horas extra" valor={resumen.horas_extra} />
        <Dato titulo="Total neto" valor={formatoQuetzales(resumen.total_neto)} />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted">
            <tr>
              <th className={encabezado}>Trabajador</th>
              <th className={encabezado}>Ordinarias</th>
              <th className={encabezado}>Extra diurnas</th>
              <th className={encabezado}>Extra nocturnas</th>
              <th className={encabezado}>Bruto</th>
              <th className={encabezado}>Bonificaciones</th>
              <th className={encabezado}>Deducciones</th>
              <th className={encabezado}>Neto</th>
              <th className={encabezado}>Alertas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-sm">
            {detalle.map((d) => (
              <tr key={d.id}>
                <td className="px-4 py-3 font-medium">{d.trabajador_nombre}</td>
                <td className="px-4 py-3">{d.horas_ordinarias}</td>
                <td className="px-4 py-3">{d.horas_extra_diurnas}</td>
                <td className="px-4 py-3">{d.horas_extra_nocturnas}</td>
                <td className="px-4 py-3">{formatoQuetzales(d.monto_bruto)}</td>
                <td className="px-4 py-3">{formatoQuetzales(d.total_bonificaciones)}</td>
                <td className="px-4 py-3">{formatoQuetzales(d.total_deducciones)}</td>
                <td className="px-4 py-3 font-semibold">{formatoQuetzales(d.neto)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {d.alertas.map((a) => (
                      <span key={a} className="rounded-full bg-orange-500/10 px-2 py-0.5 text-xs text-orange-600">
                        {ALERTAS[a] ?? a}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {planilla.estado === 'CALCULADA' && !esAdmin && !puedeVerificar && (
        <p className="text-sm text-muted-foreground">Tú calculaste esta planilla: la debe verificar otro supervisor.</p>
      )}
      {puedeVerificar && (
        <form
          className="space-y-3 border-t pt-4"
          onSubmit={(e) => {
            e.preventDefault()
            void ejecutar(() => servicio.verificarPlanilla(id, observaciones.trim()), 'Planilla verificada.')
          }}
        >
          <h3 className="font-semibold">Verificar</h3>
          <label className="block space-y-1 text-sm">
            <span>Observaciones de la revisión</span>
            <textarea
              required
              maxLength={1000}
              rows={3}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className={campo}
            />
          </label>
          <Button type="submit" disabled={enviando}>
            Marcar como verificada
          </Button>
        </form>
      )}

      {esAdmin && planilla.estado === 'VERIFICADA' && !puedeAprobar && (
        <p className="text-sm text-muted-foreground">Calculaste o verificaste esta planilla: la debe aprobar otro administrador.</p>
      )}
      {puedeAprobar && (
        <form
          className="space-y-3 border-t pt-4"
          onSubmit={(e) => {
            e.preventDefault()
            void ejecutar(
              () => servicio.aprobarPlanilla(id, total.trim(), comentario, password),
              'Planilla aprobada. Los montos ya no se pueden modificar.',
            )
          }}
        >
          <h3 className="font-semibold">Aprobar</h3>
          <p className="text-sm text-muted-foreground">
            Al aprobar, los montos quedan fijos. Escribe el total neto que revisaste y confirma tu contraseña.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block space-y-1 text-sm">
              <span>Total neto (Q)</span>
              <input
                required
                inputMode="decimal"
                pattern="\d{1,8}\.\d{2}"
                title="Con 2 decimales, por ejemplo 3106.38"
                placeholder="0.00"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                className={campo}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Comentario (opcional)</span>
              <input maxLength={1000} value={comentario} onChange={(e) => setComentario(e.target.value)} className={campo} />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Tu contraseña</span>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={campo}
              />
            </label>
          </div>
          <Button type="submit" disabled={enviando}>
            {enviando ? 'Aprobando…' : 'Aprobar planilla'}
          </Button>
        </form>
      )}

      {esAdmin && ['APROBADA', 'PAGADA'].includes(planilla.estado) && (
        <p className="border-t pt-4 text-sm">
          Los pagos de esta planilla se registran en{' '}
          <Link to={`/pagos?planilla=${id}`} className="font-medium underline">
            Pagos
          </Link>
          .
        </p>
      )}
    </section>
  )
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-xl border p-4">
      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{titulo}</div>
      <div className="mt-1 text-xl font-bold">{valor}</div>
    </div>
  )
}

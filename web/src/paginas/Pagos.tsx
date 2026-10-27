import { useCallback, useEffect, useState, type SyntheticEvent } from 'react'
import { useSearchParams } from 'react-router'
import { EstadoPlanilla } from '@/components/EstadoPlanilla'
import { Button } from '@/components/ui/button'
import { ErrorApi } from '@/lib/api'
import { formatoFecha, formatoFechaHora, formatoQuetzales, hoy, sumarMontos } from '@/lib/formato'
import * as servicio from '@/servicios/planillas'
import type { CalculoPlanilla, Pago, Periodo, PlanillaResumen } from '@/servicios/planillas'

// Registro de pagos (administrador): solo planillas APROBADAS, un pago por trabajador y por su neto exacto.
// La API pide la contraseña otra vez (X-Reauth-Token) y una Idempotency-Key en cada envío.

const mensajeDe = (error: unknown) => (error instanceof ErrorApi ? error.message : 'No se pudo conectar con el servidor.')

const campo = 'w-full rounded-md border bg-background px-3 py-2 text-sm'
const tarjeta = 'rounded-xl border bg-card p-6 shadow-sm'
const encabezado = 'px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground'

export default function Pagos() {
  const [params, setParams] = useSearchParams()
  const planillaId = params.get('planilla')
  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [periodoElegido, setPeriodoElegido] = useState('')
  const [lista, setLista] = useState<{ periodoId: string; items: PlanillaResumen[] }>({ periodoId: '', items: [] })
  const [versionLista, setVersionLista] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const informar = useCallback((texto: string) => {
    setError(null)
    setAviso(texto)
  }, [])
  const fallar = useCallback((e: unknown) => {
    setAviso(null)
    setError(mensajeDe(e))
  }, [])

  // También después de pagar: el período pasa a PAGADO cuando todas sus planillas lo están
  useEffect(() => {
    servicio.listarPeriodos().then(setPeriodos, fallar)
  }, [versionLista, fallar])

  const periodoId = (periodos.find((p) => p.id === periodoElegido) ?? periodos[0])?.id ?? ''

  useEffect(() => {
    if (!periodoId) return
    let activo = true
    servicio.listarPlanillas(periodoId).then(
      (todas) => activo && setLista({ periodoId, items: todas.filter((p) => ['APROBADA', 'PAGADA'].includes(p.estado)) }),
      (e) => activo && fallar(e),
    )
    return () => {
      activo = false
    }
  }, [periodoId, versionLista, fallar])

  const planillas = lista.periodoId === periodoId ? lista.items : []

  const elegir = (id: string | null) => setParams(id ? { planilla: id } : {})

  return (
    <div className="space-y-6 p-6 text-foreground">
      <div>
        <h1 className="text-3xl font-bold">Pagos</h1>
        <p className="mt-1 text-sm text-muted-foreground">Registro de pagos de planillas aprobadas.</p>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </p>
      )}
      {aviso && <p className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-700">{aviso}</p>}

      <section className={`${tarjeta} space-y-4`}>
        <label className="block max-w-md space-y-1 text-sm">
          <span className="font-medium">Período</span>
          <select className={campo} value={periodoId} onChange={(e) => setPeriodoElegido(e.target.value)}>
            {periodos.length === 0 && <option value="">No hay períodos</option>}
            {periodos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.codigo} ({formatoFecha(p.fecha_inicio)} al {formatoFecha(p.fecha_fin)}) · {p.estado}
              </option>
            ))}
          </select>
        </label>
        {planillas.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay planillas aprobadas en este período.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {planillas.map((p) => (
              <Button key={p.id} variant={p.id === planillaId ? 'default' : 'outline'} onClick={() => elegir(p.id)}>
                {p.ruta_codigo ?? 'General'} · {p.estado} · {formatoQuetzales(p.total_neto)}
              </Button>
            ))}
          </div>
        )}
      </section>

      {planillaId && (
        <PagosDePlanilla
          key={planillaId}
          id={planillaId}
          alPagar={(texto) => {
            informar(texto)
            setVersionLista((v) => v + 1)
          }}
          alFallar={fallar}
        />
      )}
    </div>
  )
}

interface PropsPagos {
  id: string
  alPagar: (texto: string) => void
  alFallar: (error: unknown) => void
}

function PagosDePlanilla({ id, alPagar, alFallar }: PropsPagos) {
  const [datos, setDatos] = useState<{ calculo: CalculoPlanilla; pagos: Pago[] } | null>(null)
  const [version, setVersion] = useState(0)
  const [elegidos, setElegidos] = useState<Set<string>>(new Set())
  const [referencias, setReferencias] = useState<Record<string, string>>({})
  const [metodo, setMetodo] = useState(servicio.METODOS_PAGO[0].id)
  const [fecha, setFecha] = useState(hoy)
  const [password, setPassword] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    let activo = true
    Promise.all([servicio.obtenerPlanilla(id), servicio.listarPagos(id)]).then(
      ([calculo, pagos]) => activo && setDatos({ calculo, pagos }),
      (e) => activo && alFallar(e),
    )
    return () => {
      activo = false
    }
  }, [id, version, alFallar])

  if (!datos) return <p className="text-sm text-muted-foreground">Cargando planilla…</p>
  const { calculo, pagos } = datos
  const { planilla, detalle } = calculo
  const pagoDe = new Map(pagos.filter((p) => p.estado === 'PROCESADO').map((p) => [p.detalle_id, p]))
  const pendientes = detalle.filter((d) => !pagoDe.has(d.id))
  const seleccion = pendientes.filter((d) => elegidos.has(d.id))
  const totalSeleccion = sumarMontos(seleccion.map((d) => d.neto))
  const sePuedePagar = planilla.estado === 'APROBADA'

  const alternar = (detalleId: string) =>
    setElegidos((actual) => {
      const nuevo = new Set(actual)
      if (!nuevo.delete(detalleId)) nuevo.add(detalleId)
      return nuevo
    })

  async function pagar(evento: SyntheticEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (seleccion.length === 0) return
    setEnviando(true)
    try {
      const resultado = await servicio.registrarPagos(
        id,
        {
          metodo_id: metodo,
          fecha_pago: fecha,
          pagos: seleccion.map((d) => ({ detalle_id: d.id, monto: d.neto, referencia: referencias[d.id]?.trim() || null })),
        },
        password,
      )
      setReferencias({})
      setElegidos(new Set())
      setVersion((v) => v + 1)
      alPagar(
        `${resultado.pagos_registrados} pago(s) registrados por ${formatoQuetzales(resultado.total_pagado)}.` +
          (resultado.estado === 'PAGADA' ? ' La planilla quedó PAGADA.' : ''),
      )
    } catch (e) {
      alFallar(e)
    } finally {
      setPassword('')
      setEnviando(false)
    }
  }

  return (
    <section className={`${tarjeta} space-y-6`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">
          Planilla {calculo.periodo.codigo} · {pagoDe.size} de {detalle.length} trabajadores pagados
        </h2>
        <EstadoPlanilla estado={planilla.estado} />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted">
            <tr>
              <th className={encabezado}>
                {sePuedePagar && pendientes.length > 0 && (
                  <input
                    type="checkbox"
                    aria-label="Elegir todos"
                    checked={seleccion.length === pendientes.length}
                    onChange={(e) => setElegidos(new Set(e.target.checked ? pendientes.map((d) => d.id) : []))}
                  />
                )}
              </th>
              <th className={encabezado}>Trabajador</th>
              <th className={encabezado}>Neto</th>
              <th className={encabezado}>Referencia</th>
              <th className={encabezado}>Pago</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-sm">
            {detalle.map((d) => {
              const pago = pagoDe.get(d.id)
              return (
                <tr key={d.id}>
                  <td className="px-4 py-3">
                    {!pago && sePuedePagar && (
                      <input
                        type="checkbox"
                        aria-label={`Pagar a ${d.trabajador_nombre}`}
                        checked={elegidos.has(d.id)}
                        onChange={() => alternar(d.id)}
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">{d.trabajador_nombre}</td>
                  <td className="px-4 py-3 font-semibold">{formatoQuetzales(d.neto)}</td>
                  <td className="px-4 py-3">
                    {pago ? (
                      (pago.referencia_transaccion ?? '—')
                    ) : (
                      <input
                        maxLength={100}
                        disabled={!sePuedePagar}
                        placeholder="No. de transferencia o cheque"
                        value={referencias[d.id] ?? ''}
                        onChange={(e) => setReferencias((r) => ({ ...r, [d.id]: e.target.value }))}
                        className={campo}
                      />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {pago ? (
                      <span className="text-green-600">
                        Pagado · {pago.metodo} · {formatoFechaHora(pago.pagado_at)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Pendiente</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {sePuedePagar && pendientes.length > 0 && (
        <form onSubmit={pagar} className="grid gap-3 border-t pt-4 sm:grid-cols-4 sm:items-end">
          <label className="block space-y-1 text-sm">
            <span>Método</span>
            <select value={metodo} onChange={(e) => setMetodo(Number(e.target.value))} className={campo}>
              {servicio.METODOS_PAGO.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span>Fecha de pago</span>
            <input type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} className={campo} />
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
          <Button type="submit" disabled={enviando || seleccion.length === 0}>
            {enviando
              ? 'Registrando…'
              : `Registrar ${seleccion.length} pago(s) · ${formatoQuetzales(totalSeleccion)}`}
          </Button>
        </form>
      )}
      {planilla.estado === 'PAGADA' && <p className="text-sm text-muted-foreground">Esta planilla ya está pagada por completo.</p>}
    </section>
  )
}

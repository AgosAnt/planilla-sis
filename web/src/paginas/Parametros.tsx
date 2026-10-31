import { useCallback, useEffect, useState, type SyntheticEvent } from 'react'
import { Button } from '@/components/ui/button'
import { ErrorApi } from '@/lib/api'
import { formatoFecha, formatoFechaHora, formatoQuetzales, hoy } from '@/lib/formato'
import * as servicio from '@/servicios/parametros'
import type { Feriado, ParametrosPago, Tarifa } from '@/servicios/parametros'
import { listarUsuarios } from '@/servicios/usuarios'

// Parámetros (solo administrador, permiso parametros.configurar): lo que usa el cálculo de la planilla.
// Los cambios aplican a lo que se calcule o recalcule desde ahora; una planilla aprobada ya no cambia (RN-07).

const mensajeDe = (error: unknown) => (error instanceof ErrorApi ? error.message : 'No se pudo conectar con el servidor.')

const campo = 'w-full rounded-md border bg-background px-3 py-2 text-sm'
const tarjeta = 'rounded-xl border bg-card p-6 shadow-sm'
const encabezado = 'px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground'

type Pestana = 'pago' | 'feriados' | 'tarifas'

export default function Parametros() {
  const [pestana, setPestana] = useState<Pestana>('pago')
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const fallar = useCallback((e: unknown) => {
    setAviso(null)
    setError(mensajeDe(e))
  }, [])
  const informar = useCallback((texto: string) => {
    setError(null)
    setAviso(texto)
  }, [])

  return (
    <div className="space-y-6 p-6 text-foreground">
      <div>
        <h1 className="text-3xl font-bold">Parámetros</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Lo que usa el cálculo de la planilla. Aplica a lo que se calcule desde ahora; las planillas aprobadas no cambian.
        </p>
      </div>

      <div className="flex gap-2 border-b">
        {(
          [
            ['pago', 'Parámetros de pago'],
            ['feriados', 'Feriados'],
            ['tarifas', 'Tarifas por trabajador'],
          ] as const
        ).map(([valor, texto]) => (
          <button
            key={valor}
            onClick={() => {
              setPestana(valor)
              setError(null)
              setAviso(null)
            }}
            className={`-mb-px border-b-2 px-4 py-2 text-sm ${
              pestana === valor ? 'border-primary font-semibold' : 'border-transparent text-muted-foreground'
            }`}
          >
            {texto}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </p>
      )}
      {aviso && <p className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-700">{aviso}</p>}

      {pestana === 'pago' && <ParametrosDePago alGuardar={informar} alFallar={fallar} />}
      {pestana === 'feriados' && <Feriados alCambiar={informar} alFallar={fallar} />}
      {pestana === 'tarifas' && <Tarifas alCambiar={informar} alFallar={fallar} />}
    </div>
  )
}

interface PropsSeccion {
  alFallar: (error: unknown) => void
}

// Campos editables con su ayuda; los enteros se mandan como número y los decimales como texto
const CAMPOS: { clave: keyof ParametrosPago; texto: string; ayuda: string; entero?: boolean }[] = [
  { clave: 'factor_hora_extra', texto: 'Factor de hora extra', ayuda: 'Mínimo 1.50 (art. 121: 50 % más)' },
  { clave: 'factor_hora_nocturna', texto: 'Factor de hora nocturna', ayuda: 'Entre 1.00 y 9.99' },
  { clave: 'minutos_tolerancia_llegada', texto: 'Tolerancia de llegada (min)', ayuda: 'Hasta esta tardanza se cuenta desde el inicio del turno', entero: true },
  { clave: 'minutos_almuerzo_pagado', texto: 'Almuerzo pagado (min)', ayuda: 'El exceso de almuerzo se descuenta', entero: true },
  { clave: 'horas_maximas_dia', texto: 'Horas máximas por día', ayuda: 'Más que esto genera una alerta en la planilla' },
  { clave: 'porcentaje_igss_laboral', texto: 'IGSS laboral (%)', ayuda: 'Cuota del trabajador' },
  { clave: 'bonificacion_incentivo_mensual', texto: 'Bonificación Incentivo mensual (Q)', ayuda: 'Decreto 37-2001; se prorratea por período' },
]

function ParametrosDePago({ alGuardar, alFallar }: PropsSeccion & { alGuardar: (texto: string) => void }) {
  const [actual, setActual] = useState<ParametrosPago | null>(null)
  const [valores, setValores] = useState<Record<string, string>>({})
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    servicio.obtenerParametros().then((p) => {
      setActual(p)
      setValores(Object.fromEntries(Object.entries(p).map(([k, v]) => [k, String(v)])))
    }, alFallar)
  }, [alFallar])

  if (!actual) return <p className="text-sm text-muted-foreground">Cargando parámetros…</p>

  const cambios = Object.fromEntries(
    [...CAMPOS.map((c) => [c.clave, c.entero] as const), ['periodicidad', false] as const]
      .filter(([clave]) => valores[clave] !== String(actual[clave]))
      .map(([clave, entero]) => [clave, entero ? Number(valores[clave]) : valores[clave]]),
  )
  const hayCambios = Object.keys(cambios).length > 0

  async function guardar(evento: SyntheticEvent<HTMLFormElement>) {
    evento.preventDefault()
    setEnviando(true)
    try {
      const nuevos = await servicio.actualizarParametros(cambios)
      setActual(nuevos)
      setValores(Object.fromEntries(Object.entries(nuevos).map(([k, v]) => [k, String(v)])))
      alGuardar(`Parámetros guardados (${Object.keys(cambios).length} cambio(s)).`)
    } catch (e) {
      alFallar(e)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={guardar} className={`${tarjeta} space-y-4`}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CAMPOS.map((c) => (
          <label key={c.clave} className="block space-y-1 text-sm">
            <span className="font-medium">{c.texto}</span>
            <input
              required
              inputMode={c.entero ? 'numeric' : 'decimal'}
              pattern={c.entero ? '\\d{1,3}' : '\\d{1,7}(\\.\\d{1,2})?'}
              value={valores[c.clave] ?? ''}
              onChange={(e) => setValores((v) => ({ ...v, [c.clave]: e.target.value }))}
              className={campo}
            />
            <span className="block text-xs text-muted-foreground">{c.ayuda}</span>
          </label>
        ))}
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Periodicidad de pago</span>
          <select
            value={valores.periodicidad ?? ''}
            onChange={(e) => setValores((v) => ({ ...v, periodicidad: e.target.value }))}
            className={campo}
          >
            <option value="SEMANAL">Semanal</option>
            <option value="QUINCENAL">Quincenal</option>
            <option value="MENSUAL">Mensual</option>
          </select>
        </label>
        <div className="space-y-1 text-sm">
          <span className="font-medium">Redondeo</span>
          <p className="py-2">{actual.regla_redondeo}</p>
          <span className="block text-xs text-muted-foreground">El cálculo usa minutos exactos</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={enviando || !hayCambios}>
          {enviando ? 'Guardando…' : 'Guardar cambios'}
        </Button>
        <span className="text-xs text-muted-foreground">Última actualización: {formatoFechaHora(actual.actualizado_at)}</span>
      </div>
    </form>
  )
}

function Feriados({ alCambiar, alFallar }: PropsSeccion & { alCambiar: (texto: string) => void }) {
  const anioActual = new Date().getFullYear()
  const [anio, setAnio] = useState(anioActual)
  const [lista, setLista] = useState<{ anio: number; items: Feriado[] } | null>(null)
  const [version, setVersion] = useState(0)
  const [nuevo, setNuevo] = useState<Feriado>({ fecha: '', nombre: '', medio_dia: false })

  useEffect(() => {
    let vigente = true
    servicio.listarFeriados(anio).then(
      (items) => vigente && setLista({ anio, items }),
      (e) => vigente && alFallar(e),
    )
    return () => {
      vigente = false
    }
  }, [anio, version, alFallar])

  async function agregar(evento: SyntheticEvent<HTMLFormElement>) {
    evento.preventDefault()
    try {
      await servicio.crearFeriado({ ...nuevo, nombre: nuevo.nombre.trim() })
      alCambiar(`Feriado del ${formatoFecha(nuevo.fecha)} agregado.`)
      setNuevo({ fecha: '', nombre: '', medio_dia: false })
      setVersion((v) => v + 1)
    } catch (e) {
      alFallar(e)
    }
  }

  async function borrar(f: Feriado) {
    if (!window.confirm(`¿Quitar el feriado "${f.nombre}" del ${formatoFecha(f.fecha)}?`)) return
    try {
      await servicio.borrarFeriado(f.fecha)
      alCambiar(`Feriado del ${formatoFecha(f.fecha)} quitado.`)
      setVersion((v) => v + 1)
    } catch (e) {
      alFallar(e)
    }
  }

  const items = lista?.anio === anio ? lista.items : null

  return (
    <div className="space-y-4">
      <label className="block max-w-xs space-y-1 text-sm">
        <span className="font-medium">Año</span>
        <select value={anio} onChange={(e) => setAnio(Number(e.target.value))} className={campo}>
          {[anioActual - 1, anioActual, anioActual + 1].map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </label>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {items === null ? (
          <p className="p-6 text-sm text-muted-foreground">Cargando feriados…</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No hay feriados registrados para {anio}.</p>
        ) : (
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted">
              <tr>
                <th className={encabezado}>Fecha</th>
                <th className={encabezado}>Nombre</th>
                <th className={encabezado}>Tipo</th>
                <th className={encabezado}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {items.map((f) => (
                <tr key={f.fecha}>
                  <td className="px-4 py-3">{formatoFecha(f.fecha)}</td>
                  <td className="px-4 py-3 font-medium">{f.nombre}</td>
                  <td className="px-4 py-3">{f.medio_dia ? 'Medio día' : 'Día completo'}</td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="destructive" onClick={() => borrar(f)}>
                      Quitar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <form onSubmit={agregar} className={`${tarjeta} grid gap-3 sm:grid-cols-4 sm:items-end`}>
        <label className="block space-y-1 text-sm">
          <span>Fecha</span>
          <input type="date" required value={nuevo.fecha} onChange={(e) => setNuevo((n) => ({ ...n, fecha: e.target.value }))} className={campo} />
        </label>
        <label className="block space-y-1 text-sm sm:col-span-2">
          <span>Nombre</span>
          <input
            required
            maxLength={100}
            placeholder="Ej. Feria patronal"
            value={nuevo.nombre}
            onChange={(e) => setNuevo((n) => ({ ...n, nombre: e.target.value }))}
            className={campo}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={nuevo.medio_dia} onChange={(e) => setNuevo((n) => ({ ...n, medio_dia: e.target.checked }))} />
          Solo medio día
        </label>
        <div className="sm:col-span-4">
          <Button type="submit">Agregar feriado</Button>
        </div>
      </form>
    </div>
  )
}

function Tarifas({ alCambiar, alFallar }: PropsSeccion & { alCambiar: (texto: string) => void }) {
  const [trabajadores, setTrabajadores] = useState<{ id: string; nombre: string }[] | null>(null)
  const [elegido, setElegido] = useState('')
  const [tarifas, setTarifas] = useState<{ trabajadorId: string; items: Tarifa[] } | null>(null)
  const [version, setVersion] = useState(0)
  const [montoHora, setMontoHora] = useState('')
  const [montoExtra, setMontoExtra] = useState('')
  const [desde, setDesde] = useState(hoy)

  useEffect(() => {
    listarUsuarios({ rol: 'trabajador', activo: true, page: 1 }).then(
      (p) => setTrabajadores(p.items.map((u) => ({ id: u.id, nombre: `${u.nombres} ${u.apellidos} (${u.codigo_empleado})` }))),
      alFallar,
    )
  }, [alFallar])

  const trabajadorId = (trabajadores?.find((t) => t.id === elegido) ?? trabajadores?.[0])?.id ?? ''

  useEffect(() => {
    if (!trabajadorId) return
    let vigente = true
    servicio.listarTarifas(trabajadorId).then(
      (items) => vigente && setTarifas({ trabajadorId, items }),
      (e) => vigente && alFallar(e),
    )
    return () => {
      vigente = false
    }
  }, [trabajadorId, version, alFallar])

  async function registrar(evento: SyntheticEvent<HTMLFormElement>) {
    evento.preventDefault()
    try {
      await servicio.crearTarifa(trabajadorId, { monto_hora: montoHora, monto_hora_extra: montoExtra || null, vigente_desde: desde })
      alCambiar(`Tarifa de ${formatoQuetzales(montoHora)} por hora registrada desde el ${formatoFecha(desde)}.`)
      setMontoHora('')
      setMontoExtra('')
      setVersion((v) => v + 1)
    } catch (e) {
      alFallar(e)
    }
  }

  if (trabajadores === null) return <p className="text-sm text-muted-foreground">Cargando trabajadores…</p>
  if (trabajadores.length === 0) return <p className="text-sm text-muted-foreground">No hay trabajadores activos.</p>

  const items = tarifas?.trabajadorId === trabajadorId ? tarifas.items : null
  const extraMinimo = montoHora ? (Number(montoHora) * 1.5).toFixed(2) : null

  return (
    <div className="space-y-4">
      <label className="block max-w-md space-y-1 text-sm">
        <span className="font-medium">Trabajador</span>
        <select value={trabajadorId} onChange={(e) => setElegido(e.target.value)} className={campo}>
          {trabajadores.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </select>
      </label>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {items === null ? (
          <p className="p-6 text-sm text-muted-foreground">Cargando tarifas…</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-sm text-destructive">
            Sin tarifa: la planilla no se puede calcular para este trabajador hasta registrarle una.
          </p>
        ) : (
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted">
              <tr>
                <th className={encabezado}>Por hora</th>
                <th className={encabezado}>Hora extra</th>
                <th className={encabezado}>Vigencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {items.map((t) => (
                <tr key={t.id} className={t.vigente_hasta === null ? 'font-semibold' : 'text-muted-foreground'}>
                  <td className="px-4 py-3">{formatoQuetzales(t.monto_hora)}</td>
                  <td className="px-4 py-3">{t.monto_hora_extra ? formatoQuetzales(t.monto_hora_extra) : 'Según el factor de hora extra'}</td>
                  <td className="px-4 py-3">
                    {formatoFecha(t.vigente_desde)} → {t.vigente_hasta ? formatoFecha(t.vigente_hasta) : 'vigente'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <form onSubmit={registrar} className={`${tarjeta} grid gap-3 sm:grid-cols-4 sm:items-end`}>
        <label className="block space-y-1 text-sm">
          <span>Monto por hora (Q)</span>
          <input
            required
            inputMode="decimal"
            pattern="\d{1,7}(\.\d{1,2})?"
            placeholder="20.00"
            value={montoHora}
            onChange={(e) => setMontoHora(e.target.value)}
            className={campo}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Hora extra (Q, opcional)</span>
          <input
            inputMode="decimal"
            pattern="\d{1,7}(\.\d{1,2})?"
            placeholder={extraMinimo ? `mínimo ${extraMinimo}` : 'Según el factor'}
            value={montoExtra}
            onChange={(e) => setMontoExtra(e.target.value)}
            className={campo}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Vigente desde</span>
          <input type="date" required value={desde} onChange={(e) => setDesde(e.target.value)} className={campo} />
        </label>
        <Button type="submit">Registrar tarifa</Button>
        <p className="text-xs text-muted-foreground sm:col-span-4">
          La tarifa vigente se cierra sola el día anterior a la nueva. El historial no se borra.
        </p>
      </form>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import * as servicio from '@/servicios/panel'
import { useSesion } from '@/sesion/contexto'

// Panel de inicio: lo que está esperando a alguien, con un enlace a la pantalla donde se resuelve.

type Resultado<T> = { ok: true; valor: T } | { ok: false }
type Planillas = Awaited<ReturnType<typeof servicio.planillasDelPeriodo>>

interface Resumen {
  porValidar: Resultado<number>
  enRuta: Resultado<number>
  emergencias: Resultado<number>
  eventos: Resultado<number>
  turnos: Resultado<number>
  planillas: Resultado<Planillas>
}

const resultado = <T,>(promesa: PromiseSettledResult<T>): Resultado<T> =>
  promesa.status === 'fulfilled' ? { ok: true, valor: promesa.value } : { ok: false }

interface PropsTarjeta {
  titulo: string
  valor: Resultado<number> | undefined
  detalle: string
  enlace: string
  alerta?: boolean
}

function Tarjeta({ titulo, valor, detalle, enlace, alerta }: PropsTarjeta) {
  const numero = valor === undefined ? '…' : valor.ok ? String(valor.valor) : '—'
  const resaltar = alerta && valor?.ok && valor.valor > 0
  return (
    <Link
      to={enlace}
      className={`block rounded-xl border bg-card p-5 shadow-sm transition-colors hover:bg-muted/50 ${resaltar ? 'border-destructive/50' : ''}`}
    >
      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{titulo}</div>
      <div className={`mt-2 text-3xl font-bold ${resaltar ? 'text-destructive' : ''}`}>{numero}</div>
      <div className="mt-1 text-sm text-muted-foreground">{detalle}</div>
    </Link>
  )
}

export function Panel() {
  const { usuario } = useSesion()
  const esAdmin = usuario?.rol === 'administrador'
  const [resumen, setResumen] = useState<Resumen | null>(null)

  useEffect(() => {
    let vigente = true
    Promise.allSettled([
      servicio.jornadasPorValidar(),
      servicio.enRutaHoy(),
      servicio.emergenciasPendientes(),
      servicio.eventosPendientes(),
      servicio.turnosPorConfirmar(),
      servicio.planillasDelPeriodo(),
    ]).then(([porValidar, enRuta, emergencias, eventos, turnos, planillas]) => {
      if (!vigente) return
      setResumen({
        porValidar: resultado(porValidar),
        enRuta: resultado(enRuta),
        emergencias: resultado(emergencias),
        eventos: resultado(eventos),
        turnos: resultado(turnos),
        planillas: resultado(planillas),
      })
    })
    return () => {
      vigente = false
    }
  }, [])

  const planillas = resumen?.planillas
  const periodo = planillas?.ok ? planillas.valor : null
  // Sin períodos todavía no hay nada pendiente: 0. "—" queda para cuando la consulta falló.
  const numero = (valor: number | undefined): Resultado<number> | undefined =>
    planillas === undefined ? undefined : planillas.ok ? { ok: true, valor: valor ?? 0 } : { ok: false }

  return (
    <section className="space-y-6 p-6 text-foreground">
      <div>
        <h1 className="text-3xl font-bold">Panel</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Hola, {usuario?.nombres}. Esto es lo que está pendiente {esAdmin ? 'en todas las rutas' : 'en tus rutas'}.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Tarjeta
          titulo="Emergencias sin atender"
          valor={resumen?.emergencias}
          detalle={
            resumen?.eventos.ok ? `${resumen.eventos.valor} evento(s) pendientes en total` : 'Avisos del botón de emergencia'
          }
          enlace="/emergencias"
          alerta
        />
        <Tarjeta titulo="En ruta hoy" valor={resumen?.enRuta} detalle="Jornadas de hoy sin salida" enlace="/supervision" />
        <Tarjeta titulo="Jornadas por validar" valor={resumen?.porValidar} detalle="Hay que validarlas antes de calcular la planilla" enlace="/supervision" />
        <Tarjeta titulo="Turnos por confirmar" valor={resumen?.turnos} detalle="Aceptados por el trabajador desde hoy" enlace="/turnos" />
        <Tarjeta
          titulo={esAdmin ? 'Planillas por aprobar' : 'Planillas por verificar'}
          valor={numero(esAdmin ? periodo?.porAprobar : periodo?.porVerificar)}
          detalle={periodo ? `Período ${periodo.codigo}` : planillas?.ok ? 'Todavía no hay períodos' : 'Planillas del último período'}
          enlace="/planillas"
        />
        {esAdmin && (
          <Tarjeta
            titulo="Planillas por pagar"
            valor={numero(periodo?.porPagar)}
            detalle={periodo ? `Aprobadas del período ${periodo.codigo}` : 'Planillas aprobadas'}
            enlace="/pagos"
          />
        )}
      </div>
    </section>
  )
}

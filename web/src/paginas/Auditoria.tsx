import { Fragment, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ErrorApi } from '@/lib/api'
import { formatoFechaHora } from '@/lib/formato'
import * as servicio from '@/servicios/auditoria'
import type { PaginaAuditoria } from '@/servicios/auditoria'

// Bitácora de auditoría (solo administrador, permiso auditoria.consultar): quién cambió qué y cuándo.
// Solo de lectura: cada módulo del backend la escribe al hacer el cambio.

const mensajeDe = (error: unknown) => (error instanceof ErrorApi ? error.message : 'No se pudo conectar con el servidor.')

const campo = 'rounded-md border bg-background px-3 py-2 text-sm'
const encabezado = 'px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground'

const nombreEntidad = (entidad: string) => servicio.ENTIDADES.find((e) => e.valor === entidad)?.texto ?? entidad

const json = (valor: unknown) => (valor === null || valor === undefined ? '—' : JSON.stringify(valor, null, 2))

export default function Auditoria() {
  const [entidad, setEntidad] = useState('')
  const [accion, setAccion] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [page, setPage] = useState(1)
  const [pagina, setPagina] = useState<PaginaAuditoria | null>(null)
  const [abierto, setAbierto] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let vigente = true
    servicio.listarAuditoria({ entidad, accion, desde, hasta, page }).then(
      (datos) => {
        if (!vigente) return
        setPagina(datos)
        setError(null)
      },
      (e) => vigente && setError(mensajeDe(e)),
    )
    return () => {
      vigente = false
    }
  }, [entidad, accion, desde, hasta, page])

  // Cada filtro vuelve a la primera página
  const filtrar = (cambiar: (valor: string) => void) => (valor: string) => {
    cambiar(valor)
    setPage(1)
  }

  const paginas = pagina ? Math.max(1, Math.ceil(pagina.total / servicio.POR_PAGINA)) : 1

  return (
    <div className="space-y-6 p-6 text-foreground">
      <div>
        <h1 className="text-3xl font-bold">Auditoría</h1>
        <p className="mt-1 text-sm text-muted-foreground">Quién hizo cada cambio y cuándo. Los registros no se pueden editar.</p>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm">
          <span className="block">Qué se cambió</span>
          <select className={campo} value={entidad} onChange={(e) => filtrar(setEntidad)(e.target.value)}>
            <option value="">Todo</option>
            {servicio.ENTIDADES.map((e) => (
              <option key={e.valor} value={e.valor}>
                {e.texto}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="block">Acción</span>
          <select className={campo} value={accion} onChange={(e) => filtrar(setAccion)(e.target.value)}>
            <option value="">Todas</option>
            {servicio.ACCIONES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="block">Desde</span>
          <input type="date" className={campo} value={desde} max={hasta || undefined} onChange={(e) => filtrar(setDesde)(e.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="block">Hasta</span>
          <input type="date" className={campo} value={hasta} min={desde || undefined} onChange={(e) => filtrar(setHasta)(e.target.value)} />
        </label>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {pagina === null ? (
          <p className="p-8 text-center text-muted-foreground">Cargando bitácora…</p>
        ) : pagina.items.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground">No hay registros con esos filtros.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className={encabezado}>Fecha</th>
                  <th className={encabezado}>Quién</th>
                  <th className={encabezado}>Acción</th>
                  <th className={encabezado}>Qué</th>
                  <th className={encabezado}></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {pagina.items.map((r) => (
                  <Fragment key={r.id}>
                    <tr>
                      <td className="whitespace-nowrap px-4 py-3">{formatoFechaHora(r.ocurrido_en)}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.actor_nombre ?? 'Sistema'}</div>
                        {r.actor_rol && <div className="text-xs text-muted-foreground">{r.actor_rol}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold">{r.accion}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div>{nombreEntidad(r.entidad)}</div>
                        <div className="text-xs text-muted-foreground" title={r.entidad_id}>
                          {r.entidad_id.slice(0, 8)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="outline" onClick={() => setAbierto(abierto === r.id ? null : r.id)}>
                          {abierto === r.id ? 'Ocultar' : 'Ver cambios'}
                        </Button>
                      </td>
                    </tr>
                    {abierto === r.id && (
                      <tr>
                        <td colSpan={5} className="bg-muted/40 px-4 py-3">
                          <div className="grid gap-3 md:grid-cols-2">
                            <div>
                              <div className="mb-1 text-xs font-bold uppercase text-muted-foreground">Antes</div>
                              <pre className="max-h-64 overflow-auto rounded-md border bg-background p-3 text-xs">{json(r.datos_antes)}</pre>
                            </div>
                            <div>
                              <div className="mb-1 text-xs font-bold uppercase text-muted-foreground">Después</div>
                              <pre className="max-h-64 overflow-auto rounded-md border bg-background p-3 text-xs">{json(r.datos_despues)}</pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
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
            Página {page} de {paginas} · {pagina.total} registros
          </span>
          <Button variant="outline" size="sm" disabled={page >= paginas} onClick={() => setPage((p) => p + 1)}>
            Siguiente
          </Button>
        </div>
      )}
    </div>
  )
}

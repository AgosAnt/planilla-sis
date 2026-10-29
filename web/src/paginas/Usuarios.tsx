import { useCallback, useEffect, useState, type SyntheticEvent } from 'react'
import { Button } from '@/components/ui/button'
import { ErrorApi, type Rol } from '@/lib/api'
import * as servicio from '@/servicios/usuarios'
import type { NuevoUsuario, PaginaUsuarios, Permiso, UsuarioAdmin, UsuarioCreado } from '@/servicios/usuarios'
import { useSesion } from '@/sesion/contexto'

// Usuarios (solo administrador, E-2b): alta con contraseña temporal, edición, baja lógica y la matriz de permisos.
// No hay registro público: todas las cuentas las crea el administrador.

const mensajeDe = (error: unknown) => (error instanceof ErrorApi ? error.message : 'No se pudo conectar con el servidor.')

const campo = 'w-full rounded-md border bg-background px-3 py-2 text-sm'
const tarjeta = 'rounded-xl border bg-card p-6 shadow-sm'
const encabezado = 'px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground'
const nombreRol = (rol: Rol) => servicio.ROLES.find((r) => r.valor === rol)?.texto ?? rol

export default function Usuarios() {
  const [pestana, setPestana] = useState<'usuarios' | 'permisos'>('usuarios')

  return (
    <div className="space-y-6 p-6 text-foreground">
      <div>
        <h1 className="text-3xl font-bold">Usuarios</h1>
        <p className="mt-1 text-sm text-muted-foreground">Cuentas del sistema y lo que puede hacer cada rol.</p>
      </div>
      <div className="flex gap-2 border-b">
        {(
          [
            ['usuarios', 'Usuarios'],
            ['permisos', 'Roles y permisos'],
          ] as const
        ).map(([valor, texto]) => (
          <button
            key={valor}
            onClick={() => setPestana(valor)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm ${
              pestana === valor ? 'border-primary font-semibold' : 'border-transparent text-muted-foreground'
            }`}
          >
            {texto}
          </button>
        ))}
      </div>
      {pestana === 'usuarios' ? <ListaUsuarios /> : <MatrizPermisos />}
    </div>
  )
}

function ListaUsuarios() {
  const { usuario } = useSesion()
  const [rol, setRol] = useState<Rol | ''>('')
  const [activo, setActivo] = useState<'' | 'true' | 'false'>('')
  const [buscar, setBuscar] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [page, setPage] = useState(1)
  const [pagina, setPagina] = useState<PaginaUsuarios | null>(null)
  const [version, setVersion] = useState(0)
  const [editando, setEditando] = useState<UsuarioAdmin | null>(null)
  const [creando, setCreando] = useState(false)
  const [creado, setCreado] = useState<UsuarioCreado | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const fallar = useCallback((e: unknown) => {
    setAviso(null)
    setError(mensajeDe(e))
  }, [])

  useEffect(() => {
    let vigente = true
    servicio
      .listarUsuarios({ rol: rol || undefined, activo: activo === '' ? undefined : activo === 'true', buscar: busqueda || undefined, page })
      .then(
        (datos) => vigente && setPagina(datos),
        (e) => vigente && fallar(e),
      )
    return () => {
      vigente = false
    }
  }, [rol, activo, busqueda, page, version, fallar])

  const informar = (texto: string) => {
    setError(null)
    setAviso(texto)
    setVersion((v) => v + 1)
  }

  async function alternarActivo(u: UsuarioAdmin) {
    const accion = u.activo ? 'Dar de baja' : 'Reactivar'
    if (!window.confirm(`${accion} a ${u.nombres} ${u.apellidos}?${u.activo ? ' Ya no podrá iniciar sesión.' : ''}`)) return
    try {
      await servicio.actualizarUsuario(u.id, { activo: !u.activo })
      informar(`${u.nombres} ${u.apellidos} ${u.activo ? 'quedó dado de baja' : 'quedó activo de nuevo'}.`)
    } catch (e) {
      fallar(e)
    }
  }

  const paginas = pagina ? Math.max(1, Math.ceil(pagina.total / servicio.POR_PAGINA)) : 1

  return (
    <div className="space-y-6">
      {error && (
        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </p>
      )}
      {aviso && <p className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-700">{aviso}</p>}

      {creado && (
        <section role="status" className="space-y-2 rounded-xl border border-orange-500/30 bg-orange-500/10 p-4 text-sm">
          <p className="font-semibold">Usuario {creado.email} creado.</p>
          <p>
            Contraseña temporal: <code className="rounded bg-background px-2 py-1 text-base font-bold">{creado.password_temporal}</code>{' '}
            <Button size="sm" variant="outline" onClick={() => navigator.clipboard?.writeText(creado.password_temporal)}>
              Copiar
            </Button>
          </p>
          <p className="text-muted-foreground">
            Entrégasela a la persona: <strong>solo se muestra esta vez</strong>. Al entrar, el sistema le pide cambiarla.
          </p>
          <Button size="sm" variant="ghost" onClick={() => setCreado(null)}>
            Ya la entregué
          </Button>
        </section>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm">
          <span className="block">Rol</span>
          <select
            className={campo}
            value={rol}
            onChange={(e) => {
              setRol(e.target.value as Rol | '')
              setPage(1)
            }}
          >
            <option value="">Todos</option>
            {servicio.ROLES.map((r) => (
              <option key={r.valor} value={r.valor}>
                {r.texto}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="block">Estado</span>
          <select
            className={campo}
            value={activo}
            onChange={(e) => {
              setActivo(e.target.value as '' | 'true' | 'false')
              setPage(1)
            }}
          >
            <option value="">Todos</option>
            <option value="true">Activos</option>
            <option value="false">De baja</option>
          </select>
        </label>
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            setBusqueda(buscar.trim())
            setPage(1)
          }}
        >
          <label className="space-y-1 text-sm">
            <span className="block">Buscar</span>
            <input
              className={campo}
              maxLength={100}
              placeholder="Nombre, correo o código"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
            />
          </label>
          <Button type="submit" variant="outline">
            Buscar
          </Button>
        </form>
        <div className="ml-auto">
          <Button
            onClick={() => {
              setEditando(null)
              setCreando(true)
            }}
          >
            Nuevo usuario
          </Button>
        </div>
      </div>

      {(creando || editando) && (
        <FormularioUsuario
          key={editando?.id ?? 'nuevo'}
          usuario={editando}
          esUnoMismo={editando?.id === usuario?.id}
          alCerrar={() => {
            setCreando(false)
            setEditando(null)
          }}
          alGuardar={(texto, nuevo) => {
            setCreando(false)
            setEditando(null)
            if (nuevo) setCreado(nuevo)
            informar(texto)
          }}
          alFallar={fallar}
        />
      )}

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {pagina === null ? (
          <p className="p-8 text-center text-muted-foreground">Cargando usuarios…</p>
        ) : pagina.items.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground">No hay usuarios con esos filtros.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className={encabezado}>Nombre</th>
                  <th className={encabezado}>Correo</th>
                  <th className={encabezado}>Código</th>
                  <th className={encabezado}>Rol</th>
                  <th className={encabezado}>Estado</th>
                  <th className={encabezado}>Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {pagina.items.map((u) => (
                  <tr key={u.id} className={u.activo ? '' : 'text-muted-foreground'}>
                    <td className="px-4 py-3 font-medium">
                      {u.nombres} {u.apellidos}
                    </td>
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3">{u.codigo_empleado}</td>
                    <td className="px-4 py-3">{nombreRol(u.rol)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                            u.activo ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {u.activo ? 'Activo' : 'De baja'}
                        </span>
                        {u.debe_cambiar_password && (
                          <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-xs text-orange-600">Contraseña temporal</span>
                        )}
                        {u.bloqueado && (
                          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">Bloqueado por intentos</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setCreando(false)
                            setEditando(u)
                          }}
                        >
                          Editar
                        </Button>
                        {u.id !== usuario?.id && (
                          <Button size="sm" variant={u.activo ? 'destructive' : 'outline'} onClick={() => alternarActivo(u)}>
                            {u.activo ? 'Dar de baja' : 'Reactivar'}
                          </Button>
                        )}
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
            Página {page} de {paginas} · {pagina.total} usuarios
          </span>
          <Button variant="outline" size="sm" disabled={page >= paginas} onClick={() => setPage((p) => p + 1)}>
            Siguiente
          </Button>
        </div>
      )}
    </div>
  )
}

interface PropsFormulario {
  usuario: UsuarioAdmin | null
  esUnoMismo: boolean
  alCerrar: () => void
  alGuardar: (texto: string, creado?: UsuarioCreado) => void
  alFallar: (error: unknown) => void
}

// Alta (usuario null) o edición. El correo no se cambia y uno mismo no puede cambiarse el rol.
function FormularioUsuario({ usuario, esUnoMismo, alCerrar, alGuardar, alFallar }: PropsFormulario) {
  const [datos, setDatos] = useState<NuevoUsuario>({
    email: usuario?.email ?? '',
    nombres: usuario?.nombres ?? '',
    apellidos: usuario?.apellidos ?? '',
    rol: usuario?.rol ?? 'trabajador',
    codigo_empleado: usuario?.codigo_empleado ?? '',
    documento: usuario?.documento ?? '',
  })
  const [enviando, setEnviando] = useState(false)
  const cambiar = (campoNombre: keyof NuevoUsuario, valor: string) => setDatos((d) => ({ ...d, [campoNombre]: valor }))

  async function guardar(evento: SyntheticEvent<HTMLFormElement>) {
    evento.preventDefault()
    setEnviando(true)
    try {
      if (usuario) {
        // Solo los campos que cambiaron
        const cambios: Partial<NuevoUsuario> = {}
        for (const clave of ['nombres', 'apellidos', 'rol', 'codigo_empleado', 'documento'] as const) {
          if (datos[clave].trim() !== usuario[clave]) Object.assign(cambios, { [clave]: datos[clave].trim() })
        }
        if (Object.keys(cambios).length === 0) return alCerrar()
        await servicio.actualizarUsuario(usuario.id, cambios)
        alGuardar(`Se guardaron los cambios de ${datos.nombres} ${datos.apellidos}.`)
      } else {
        const creado = await servicio.crearUsuario({ ...datos, email: datos.email.trim().toLowerCase() })
        alGuardar(`Usuario ${creado.email} creado.`, creado)
      }
    } catch (e) {
      alFallar(e)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={guardar} className={`${tarjeta} space-y-4`}>
      <h2 className="text-lg font-semibold">{usuario ? `Editar a ${usuario.nombres} ${usuario.apellidos}` : 'Nuevo usuario'}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block space-y-1 text-sm">
          <span>Correo</span>
          <input
            type="email"
            required
            maxLength={255}
            disabled={!!usuario}
            value={datos.email}
            onChange={(e) => cambiar('email', e.target.value)}
            className={campo}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Nombres</span>
          <input required maxLength={100} value={datos.nombres} onChange={(e) => cambiar('nombres', e.target.value)} className={campo} />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Apellidos</span>
          <input required maxLength={100} value={datos.apellidos} onChange={(e) => cambiar('apellidos', e.target.value)} className={campo} />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Rol</span>
          <select disabled={esUnoMismo} value={datos.rol} onChange={(e) => cambiar('rol', e.target.value)} className={campo}>
            {servicio.ROLES.map((r) => (
              <option key={r.valor} value={r.valor}>
                {r.texto}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span>Código de empleado</span>
          <input
            required
            maxLength={50}
            value={datos.codigo_empleado}
            onChange={(e) => cambiar('codigo_empleado', e.target.value)}
            className={campo}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Documento (DPI)</span>
          <input required maxLength={50} value={datos.documento} onChange={(e) => cambiar('documento', e.target.value)} className={campo} />
        </label>
      </div>
      {!usuario && (
        <p className="text-sm text-muted-foreground">
          Al crearlo se genera una contraseña temporal que verás una sola vez. La persona la cambia al entrar.
        </p>
      )}
      {esUnoMismo && <p className="text-sm text-muted-foreground">No puedes cambiar tu propio rol.</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={enviando}>
          {enviando ? 'Guardando…' : usuario ? 'Guardar cambios' : 'Crear usuario'}
        </Button>
        <Button type="button" variant="ghost" onClick={alCerrar}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}

// Matriz de M007 (GET /admin/permisos): solo de consulta, la aplican la API y el RLS
function MatrizPermisos() {
  const [permisos, setPermisos] = useState<Permiso[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    servicio.listarPermisos().then(setPermisos, (e) => setError(mensajeDe(e)))
  }, [])

  if (error) {
    return (
      <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </p>
    )
  }
  if (!permisos) return <p className="text-sm text-muted-foreground">Cargando permisos…</p>

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Lo que puede hacer cada rol. Es de consulta: lo aplican la API y la base de datos, no se cambia desde aquí.
      </p>
      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted">
            <tr>
              <th className={encabezado}>Permiso</th>
              {servicio.ROLES.map((r) => (
                <th key={r.valor} className={`${encabezado} text-center`}>
                  {r.texto}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-sm">
            {permisos.map((p) => (
              <tr key={p.codigo}>
                <td className="px-4 py-3">
                  <div className="font-medium">{p.descripcion}</div>
                  <div className="text-xs text-muted-foreground">{p.codigo}</div>
                </td>
                {servicio.ROLES.map((r) => (
                  <td key={r.valor} className="px-4 py-3 text-center">
                    {p.roles.includes(r.valor) ? (
                      <span aria-label="Sí" className="font-bold text-green-600">
                        ✓
                      </span>
                    ) : (
                      <span aria-label="No" className="text-muted-foreground">
                        —
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

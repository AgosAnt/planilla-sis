import { useState, type SyntheticEvent } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { ErrorApi } from '@/lib/api'
import { useSesion } from '@/sesion/contexto'

const LONGITUD_MINIMA = 12
const campo = 'w-full rounded-md border bg-background px-3 py-2'

export default function CambiarPassword() {
  const { usuario, cambiarPassword, terminarSesionLocal, cerrarSesion } = useSesion()
  const navegar = useNavigate()
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [cambiada, setCambiada] = useState(false)

  const obligatoria = usuario?.debe_cambiar_password ?? false

  async function alEnviar(evento: SyntheticEvent<HTMLFormElement>) {
    evento.preventDefault()
    setError(null)
    if (nueva.length < LONGITUD_MINIMA) {
      setError(`La contraseña nueva debe tener al menos ${LONGITUD_MINIMA} caracteres.`)
      return
    }
    if (nueva !== confirmacion) {
      setError('La confirmación no coincide con la contraseña nueva.')
      return
    }
    setEnviando(true)
    try {
      await cambiarPassword(actual, nueva)
      setCambiada(true)
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo conectar con el servidor.')
    } finally {
      setEnviando(false)
    }
  }

  async function salir() {
    await cerrarSesion()
    navegar('/login', { replace: true })
  }

  if (cambiada) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-4 rounded-lg border p-6">
          <h1 className="text-xl font-semibold">Contraseña actualizada</h1>
          <p role="status" className="text-sm text-muted-foreground">
            Se cerraron todas tus sesiones. Inicia sesión con la contraseña nueva.
          </p>
          <Button className="w-full" onClick={terminarSesionLocal}>
            Ir a iniciar sesión
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={alEnviar} className="w-full max-w-sm space-y-4 rounded-lg border p-6">
        <h1 className="text-xl font-semibold">Cambiar contraseña</h1>
        {obligatoria && (
          <p role="alert" className="text-sm text-muted-foreground">
            Tu contraseña es temporal. Debes cambiarla para continuar.
          </p>
        )}

        <label className="block space-y-1 text-sm">
          <span>Contraseña actual</span>
          <input
            type="password"
            required
            autoFocus
            autoComplete="current-password"
            value={actual}
            onChange={(e) => setActual(e.target.value)}
            className={campo}
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span>Contraseña nueva (mínimo {LONGITUD_MINIMA} caracteres)</span>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            className={campo}
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span>Confirmar contraseña nueva</span>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
            className={campo}
          />
        </label>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={enviando}>
          {enviando ? 'Guardando…' : 'Cambiar contraseña'}
        </Button>
        {obligatoria ? (
          <Button type="button" variant="outline" className="w-full" onClick={salir} disabled={enviando}>
            Cerrar sesión
          </Button>
        ) : (
          <Button type="button" variant="outline" className="w-full" onClick={() => navegar(-1)} disabled={enviando}>
            Volver
          </Button>
        )}
      </form>
    </main>
  )
}

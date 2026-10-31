import { useState, type SyntheticEvent } from 'react'
import { Navigate, useSearchParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { ErrorApi } from '@/lib/api'
import { rutaSegura } from '@/lib/rutas'
import { useSesion } from '@/sesion/contexto'

export function Login() {
  const { usuario, iniciarSesion } = useSesion()
  const [params] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (usuario) return <Navigate to={rutaSegura(params.get('siguiente'))} replace />

  async function alEnviar(evento: SyntheticEvent<HTMLFormElement>) {
    evento.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      await iniciarSesion(email, password)
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo conectar con el servidor.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="login-fondo flex min-h-screen items-center justify-center p-6">
      <div aria-hidden="true">
        <span className="login-luz login-luz-1" />
        <span className="login-luz login-luz-2" />
        <span className="login-luz login-luz-3" />
        <span className="login-luz login-luz-4" />
      </div>

      <form onSubmit={alEnviar} className="login-tarjeta w-full max-w-sm space-y-5 p-8">
        <header className="space-y-1 text-center">
          <p className="text-sm font-medium text-foreground/75">Planilla SIS</p>
          <h1 className="text-2xl font-semibold tracking-tight">Iniciar sesión</h1>
        </header>

        <label className="block space-y-1 text-sm">
          <span>Correo</span>
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="login-campo"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span>Contraseña</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="login-campo"
          />
        </label>

        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" className="h-11 w-full rounded-xl text-base" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
    </main>
  )
}
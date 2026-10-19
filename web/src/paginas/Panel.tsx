import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { useSesion } from '@/sesion/contexto'

export function Panel() {
  const { usuario, cerrarSesion } = useSesion()
  const navegar = useNavigate()

  async function salir() {
    await cerrarSesion()
    navegar('/login', { replace: true })
  }

  return (
    <main className="space-y-4 p-6">
      <h1 className="text-xl font-semibold">Panel</h1>
      <p>
        Hola, {usuario?.nombres} {usuario?.apellidos} ({usuario?.rol})
      </p>
      <Button variant="outline" onClick={salir}>
        Cerrar sesión
      </Button>
    </main>
  )
}
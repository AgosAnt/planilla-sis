import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { useSesion } from '@/sesion/contexto'

export function AccesoDenegado() {
  const { usuario, cerrarSesion } = useSesion()
  const navegar = useNavigate()

  async function salir() {
    await cerrarSesion()
    navegar('/login', { replace: true })
  }

  return (
    <main className="space-y-3 p-6">
      <h1 className="text-xl font-semibold">Acceso denegado</h1>
      <p className="text-sm">
        {usuario?.rol === 'trabajador'
          ? 'Los trabajadores usan la aplicación móvil. Esta web es para administradores y supervisores.'
          : 'No tienes permiso para ver esta sección.'}
      </p>
      <Button variant="outline" onClick={salir}>
        Cerrar sesión
      </Button>
    </main>
  )
}
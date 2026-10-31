import { Navigate, Outlet, useLocation } from 'react-router'
import type { Rol } from '@/lib/api'
import { useSesion } from '@/sesion/contexto'

const RUTA_CAMBIAR_PASSWORD = '/cambiar-password'

export function RutaProtegida({ roles }: { roles?: Rol[] }) {
  const { usuario, cargando } = useSesion()
  const ubicacion = useLocation()

  if (cargando) return <p className="p-6 text-sm text-muted-foreground">Cargando…</p>

  if (!usuario) {
    // Después de cambiar la contraseña no se vuelve a esa pantalla al iniciar sesión
    if (ubicacion.pathname === RUTA_CAMBIAR_PASSWORD) return <Navigate to="/login" replace />
    const destino = encodeURIComponent(ubicacion.pathname + ubicacion.search)
    return <Navigate to={`/login?siguiente=${destino}`} replace />
  }

  // Con contraseña temporal la API responde 403 a casi todo: primero hay que cambiarla
  if (usuario.debe_cambiar_password && ubicacion.pathname !== RUTA_CAMBIAR_PASSWORD) {
    return <Navigate to={RUTA_CAMBIAR_PASSWORD} replace />
  }

  if (roles && !roles.includes(usuario.rol)) return <Navigate to="/403" replace />

  return <Outlet />
}
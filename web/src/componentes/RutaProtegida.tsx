import { Navigate, Outlet, useLocation } from 'react-router'
import type { Rol } from '@/lib/api'
import { useSesion } from '@/sesion/contexto'

export function RutaProtegida({ roles }: { roles?: Rol[] }) {
  const { usuario, cargando } = useSesion()
  const ubicacion = useLocation()

  if (cargando) return <p className="p-6 text-sm text-muted-foreground">Cargando…</p>

  if (!usuario) {
    const destino = encodeURIComponent(ubicacion.pathname + ubicacion.search)
    return <Navigate to={`/login?siguiente=${destino}`} replace />
  }

  if (roles && !roles.includes(usuario.rol)) return <Navigate to="/403" replace />

  return <Outlet />
}
import { NavLink, Outlet, useNavigate } from 'react-router'
import { BotonTema } from '@/components/BotonTema'
import { Button } from '@/components/ui/button'
import { MENU } from '@/lib/menu'
import { useSesion } from '@/sesion/contexto'

export function Layout() {
  const { usuario, cerrarSesion } = useSesion()
  const navegar = useNavigate()
  const items = MENU.filter((item) => usuario && item.roles.includes(usuario.rol))

  async function salir() {
    await cerrarSesion()
    navegar('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <span className="font-semibold">Planilla SIS</span>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {usuario?.nombres} {usuario?.apellidos} · {usuario?.rol}
          </span>
          <BotonTema />
          <Button variant="outline" size="sm" onClick={() => navegar('/cambiar-password')}>
            Contraseña
          </Button>
          <Button variant="outline" size="sm" onClick={salir}>
            Cerrar sesión
          </Button>
        </div>
      </header>

      <div className="flex flex-1 flex-col md:flex-row">
        <nav aria-label="Principal" className="border-b p-3 md:w-56 md:border-r md:border-b-0">
          <ul className="flex gap-1 overflow-x-auto md:flex-col">
            {items.map((item) => (
              <li key={item.ruta}>
                <NavLink
                  to={item.ruta}
                  className={({ isActive }) =>
                    `block whitespace-nowrap rounded-md px-3 py-2 text-sm ${
                      isActive ? 'bg-muted font-medium' : 'text-muted-foreground hover:bg-muted'
                    }`
                  }
                >
                  {item.etiqueta}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
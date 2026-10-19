import type { Rol } from './api'

export interface ItemMenu {
  ruta: string
  etiqueta: string
  roles: Rol[]
}

const ADMIN_Y_SUPERVISOR: Rol[] = ['administrador', 'supervisor']
const SOLO_ADMIN: Rol[] = ['administrador']

// Mapa de rutas de B.3. Ocultar un enlace es solo experiencia de usuario:
// la autorización real la hace la API.
export const MENU: ItemMenu[] = [
  { ruta: '/panel', etiqueta: 'Panel', roles: ADMIN_Y_SUPERVISOR },
  { ruta: '/rutas', etiqueta: 'Rutas', roles: ADMIN_Y_SUPERVISOR },
  { ruta: '/turnos', etiqueta: 'Turnos', roles: ADMIN_Y_SUPERVISOR },
  { ruta: '/supervision', etiqueta: 'Supervisión', roles: ADMIN_Y_SUPERVISOR },
  { ruta: '/planillas', etiqueta: 'Planillas', roles: ADMIN_Y_SUPERVISOR },
  { ruta: '/pagos', etiqueta: 'Pagos', roles: SOLO_ADMIN },
  { ruta: '/admin/usuarios', etiqueta: 'Usuarios', roles: SOLO_ADMIN },
  { ruta: '/admin/parametros', etiqueta: 'Parámetros', roles: SOLO_ADMIN },
  { ruta: '/auditoria', etiqueta: 'Auditoría', roles: SOLO_ADMIN },
]
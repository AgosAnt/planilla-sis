import { api, type Rol } from '@/lib/api'

export interface UsuarioAdmin {
  id: string
  email: string
  nombres: string
  apellidos: string
  rol: Rol
  codigo_empleado: string
  documento: string
  activo: boolean
  debe_cambiar_password: boolean
  bloqueado: boolean
  creado_at: string
}

export interface PaginaUsuarios {
  items: UsuarioAdmin[]
  page: number
  page_size: number
  total: number
}

export interface NuevoUsuario {
  email: string
  nombres: string
  apellidos: string
  rol: Rol
  codigo_empleado: string
  documento: string
}

// La contraseña temporal solo viene en esta respuesta: el servidor no la guarda en claro
export interface UsuarioCreado {
  id: string
  email: string
  password_temporal: string
  debe_cambiar_password: boolean
}

export interface Permiso {
  codigo: string
  descripcion: string
  roles: Rol[]
}

export const ROLES: { valor: Rol; texto: string }[] = [
  { valor: 'trabajador', texto: 'Trabajador' },
  { valor: 'supervisor', texto: 'Supervisor' },
  { valor: 'administrador', texto: 'Administrador' },
]

export const POR_PAGINA = 50

export function listarUsuarios(filtros: { rol?: Rol; activo?: boolean; buscar?: string; page: number }) {
  const params = new URLSearchParams({ page: String(filtros.page), page_size: String(POR_PAGINA) })
  if (filtros.rol) params.set('rol', filtros.rol)
  if (filtros.activo !== undefined) params.set('activo', String(filtros.activo))
  if (filtros.buscar) params.set('buscar', filtros.buscar)
  return api<PaginaUsuarios>('GET', `/admin/usuarios?${params}`)
}

export const crearUsuario = (datos: NuevoUsuario) => api<UsuarioCreado>('POST', '/admin/usuarios', datos)

// Solo lo que cambia; el correo no se edita (es el usuario del login)
export const actualizarUsuario = (id: string, cambios: Partial<Omit<NuevoUsuario, 'email'>> & { activo?: boolean }) =>
  api<UsuarioAdmin>('PATCH', `/admin/usuarios/${id}`, cambios)

// Matriz de permisos por rol (M007), solo de consulta
export const listarPermisos = () => api<Permiso[]>('GET', '/admin/permisos')

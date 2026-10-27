// Cliente de la API (F.2 y B.4). Sesión solo en memoria: el JWT vive en la cookie
// HttpOnly psis_access, que JavaScript no puede leer. Aquí solo queda el token CSRF.

export type Rol = 'administrador' | 'supervisor' | 'trabajador'

export interface Usuario {
  id: string
  email: string
  nombres: string
  apellidos: string
  rol: Rol
  debe_cambiar_password: boolean
}

interface Problema {
  title?: string
  status?: number
  detail?: string
  code?: string
}

export class ErrorApi extends Error {
  status: number
  code?: string

  constructor(status: number, problema?: Problema | null) {
    super(problema?.detail ?? `Error ${status}`)
    this.status = status
    this.code = problema?.code
  }
}

const BASE = '/api/v1'
const METODOS_SEGUROS = ['GET', 'HEAD']

let csrf: string | null = null
let sesionActiva = false
let alExpirar: () => void = () => {}

// La sesión de React se registra aquí para enterarse si la sesión vence en medio del uso
export const registrarAlExpirar = (funcion: () => void) => {
  alExpirar = funcion
}

export const limpiarSesionApi = () => {
  csrf = null
  sesionActiva = false
  try {
    sessionStorage.clear()
  } catch {
    // Nada que limpiar
  }
}

// cabecerasExtra: las que piden algunas operaciones, como X-Reauth-Token e Idempotency-Key al aprobar y pagar
export async function api<T>(
  metodo: string,
  ruta: string,
  cuerpo?: unknown,
  cabecerasExtra: Record<string, string> = {},
): Promise<T> {
  const cabeceras: Record<string, string> = { ...cabecerasExtra, Accept: 'application/json' }
  if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json'
  if (!METODOS_SEGUROS.includes(metodo) && csrf) cabeceras['X-CSRF-Token'] = csrf

  const respuesta = await fetch(BASE + ruta, {
    method: metodo,
    headers: cabeceras,
    credentials: 'same-origin',
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  })
  const datos: unknown = respuesta.status === 204 ? null : await respuesta.json().catch(() => null)

  if (!respuesta.ok) {
    // Sesión vencida en medio del uso: se limpia y se avisa para volver al login
    if (respuesta.status === 401 && sesionActiva) {
      limpiarSesionApi()
      alExpirar()
    }
    throw new ErrorApi(respuesta.status, datos as Problema | null)
  }
  return datos as T
}

export async function iniciarSesion(email: string, password: string): Promise<Usuario> {
  const datos = await api<{ user: Usuario; csrf_token: string }>('POST', '/auth/session', {
    email,
    password,
  })
  csrf = datos.csrf_token
  sesionActiva = true
  return datos.user
}

// Al cargar la página: si la cookie sigue vigente recupera perfil y CSRF; si no, no hay sesión
export async function restaurarSesion(): Promise<Usuario | null> {
  try {
    const usuario = await api<Usuario>('GET', '/me')
    const datos = await api<{ csrf_token: string }>('GET', '/auth/csrf')
    csrf = datos.csrf_token
    sesionActiva = true
    return usuario
  } catch (error) {
    if (error instanceof ErrorApi && error.status === 401) return null
    throw error
  }
}

export async function cerrarSesion(): Promise<void> {
  try {
    await api<null>('POST', '/auth/logout')
  } finally {
    limpiarSesionApi()
  }
}
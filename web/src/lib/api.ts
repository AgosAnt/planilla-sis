// Cliente de la API (F.2 y B.4). Sesión solo en memoria: el JWT vive en la cookie
// HttpOnly psis_access, que JavaScript no puede leer. Aquí solo queda el token CSRF.
// Cuando el access token vence (401), se renueva una vez con la cookie psis_refresh (FE-6) y se repite la petición.

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

// Rutas que no se renuevan: el login y la propia renovación responden 401 por credenciales o refresh inválidos
const SIN_RENOVACION = ['/auth/session', '/auth/refresh']

// Una sola renovación a la vez: si varias peticiones reciben 401 juntas, todas esperan la misma
let renovacion: Promise<boolean> | null = null

// true si hay un access token nuevo en la cookie. 409: otra pestaña ya renovó y la cookie nueva
// ya está en el navegador, así que también basta con repetir la petición.
const renovarSesion = (): Promise<boolean> => {
  renovacion ??= fetch(BASE + '/auth/refresh', {
    method: 'POST',
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
  })
    .then((respuesta) => {
      // El cuerpo no se usa, pero hay que descartarlo: si no, el navegador deja la petición abierta
      void respuesta.body?.cancel()
      return respuesta.ok || respuesta.status === 409
    })
    .catch(() => false)
    .finally(() => {
      renovacion = null
    })
  return renovacion
}

const enviar = (metodo: string, ruta: string, cuerpo: unknown, cabecerasExtra: Record<string, string>) => {
  const cabeceras: Record<string, string> = { ...cabecerasExtra, Accept: 'application/json' }
  if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json'
  if (!METODOS_SEGUROS.includes(metodo) && csrf) cabeceras['X-CSRF-Token'] = csrf

  return fetch(BASE + ruta, {
    method: metodo,
    headers: cabeceras,
    credentials: 'same-origin',
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  })
}

// cabecerasExtra: las que piden algunas operaciones, como X-Reauth-Token e Idempotency-Key al aprobar y pagar.
// Al repetir tras renovar van las mismas: el 401 sale antes de gastar el token de reautenticación.
export async function api<T>(
  metodo: string,
  ruta: string,
  cuerpo?: unknown,
  cabecerasExtra: Record<string, string> = {},
): Promise<T> {
  let respuesta = await enviar(metodo, ruta, cuerpo, cabecerasExtra)

  // Access token vencido: se renueva y se repite la petición una sola vez
  if (respuesta.status === 401 && !SIN_RENOVACION.includes(ruta) && (await renovarSesion())) {
    respuesta = await enviar(metodo, ruta, cuerpo, cabecerasExtra)
  }
  const datos: unknown = respuesta.status === 204 ? null : await respuesta.json().catch(() => null)

  if (!respuesta.ok) {
    // La sesión venció del todo (tampoco se pudo renovar): se limpia y se avisa para volver al login
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

// Al cargar la página: si la cookie sigue vigente (o se puede renovar) recupera perfil y CSRF; si no, no hay sesión
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
// Solo se acepta una ruta interna: empieza con "/" y no apunta a otro sitio.
// Se ignoran /login y /403, porque volver ahí después de entrar no tiene sentido.
const RUTAS_EXCLUIDAS = ['/login', '/403']

export function rutaSegura(valor: string | null, porDefecto = '/panel'): string {
  if (!valor) return porDefecto
  if (!valor.startsWith('/') || valor.startsWith('//') || valor.startsWith('/\\')) return porDefecto
  const ruta = valor.split(/[?#]/)[0]
  if (RUTAS_EXCLUIDAS.includes(ruta)) return porDefecto
  return valor
}
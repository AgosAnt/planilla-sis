// B.4: localStorage solo para preferencias no sensibles, con prefijo y versión.
// Siempre con try/catch: el almacenamiento puede estar bloqueado o vacío (modo privado).
const PREFIJO = 'psis:v1:'

export const preferencias = {
  leer<T>(clave: string, porDefecto: T): T {
    try {
      const valor = localStorage.getItem(PREFIJO + clave)
      return valor === null ? porDefecto : (JSON.parse(valor) as T)
    } catch {
      return porDefecto
    }
  },
  guardar(clave: string, valor: unknown): void {
    try {
      localStorage.setItem(PREFIJO + clave, JSON.stringify(valor))
    } catch {
      // Sin almacenamiento: la preferencia dura solo esta visita
    }
  },
}
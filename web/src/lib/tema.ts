import { preferencias } from './preferencias'

export type Tema = 'claro' | 'oscuro'

// Si no hay preferencia guardada, se respeta la del sistema operativo
export function temaInicial(): Tema {
  const guardado = preferencias.leer<string | null>('tema', null)
  if (guardado === 'claro' || guardado === 'oscuro') return guardado
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro'
}

export function aplicarTema(tema: Tema): void {
  document.documentElement.classList.toggle('dark', tema === 'oscuro')
}
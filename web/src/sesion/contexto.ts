import { createContext, useContext } from 'react'
import type { Usuario } from '@/lib/api'

export interface ValorSesion {
  usuario: Usuario | null
  cargando: boolean
  iniciarSesion: (email: string, password: string) => Promise<Usuario>
  cerrarSesion: () => Promise<void>
}

export const ContextoSesion = createContext<ValorSesion | null>(null)

export function useSesion(): ValorSesion {
  const valor = useContext(ContextoSesion)
  if (!valor) throw new Error('useSesion debe usarse dentro de <ProveedorSesion>')
  return valor
}
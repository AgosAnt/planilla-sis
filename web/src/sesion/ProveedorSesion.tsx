import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as clienteApi from '@/lib/api'
import type { Usuario } from '@/lib/api'
import { ContextoSesion, type ValorSesion } from './contexto'

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let activo = true
    // Si la sesión vence en medio del uso, el cliente avisa y quedamos sin usuario:
    // las guardas del router se encargan de mandar al login.
    clienteApi.registrarAlExpirar(() => setUsuario(null))

    clienteApi
      .restaurarSesion()
      .then((u) => {
        if (activo) setUsuario(u)
      })
      .catch(() => {
        if (activo) setUsuario(null)
      })
      .finally(() => {
        if (activo) setCargando(false)
      })

    return () => {
      activo = false
    }
  }, [])

  const iniciarSesion = useCallback(async (email: string, password: string) => {
    const u = await clienteApi.iniciarSesion(email, password)
    setUsuario(u)
    return u
  }, [])

  const cerrarSesion = useCallback(async () => {
    try {
      await clienteApi.cerrarSesion()
    } finally {
      setUsuario(null)
    }
  }, [])

  const valor = useMemo<ValorSesion>(
    () => ({ usuario, cargando, iniciarSesion, cerrarSesion }),
    [usuario, cargando, iniciarSesion, cerrarSesion],
  )

  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>
}
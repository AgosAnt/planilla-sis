import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { preferencias } from '@/lib/preferencias'
import { aplicarTema, temaInicial, type Tema } from '@/lib/tema'

export function BotonTema() {
  const [tema, setTema] = useState<Tema>(temaInicial)

  function alternar() {
    const nuevo: Tema = tema === 'oscuro' ? 'claro' : 'oscuro'
    setTema(nuevo)
    aplicarTema(nuevo)
    preferencias.guardar('tema', nuevo)
  }

  return (
    <Button variant="outline" size="sm" onClick={alternar}>
      <span className="sm:hidden">Tema</span>
      <span className="hidden sm:inline">{tema === 'oscuro' ? 'Tema claro' : 'Tema oscuro'}</span>
    </Button>
  )
}
import type { EstadoPlanilla as Estado } from '@/servicios/planillas'

const COLORES: Record<Estado, string> = {
  CALCULADA: 'bg-blue-500/10 text-blue-600',
  VERIFICADA: 'bg-orange-500/10 text-orange-600',
  APROBADA: 'bg-green-500/10 text-green-600',
  PAGADA: 'bg-muted text-muted-foreground',
}

export function EstadoPlanilla({ estado }: { estado: Estado }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${COLORES[estado]}`}>{estado}</span>
}

import { useSesion } from '@/sesion/contexto'

export function Panel() {
  const { usuario } = useSesion()

  return (
    <section className="space-y-2 p-6">
      <h1 className="text-xl font-semibold">Panel</h1>
      <p>
        Hola, {usuario?.nombres} {usuario?.apellidos} ({usuario?.rol})
      </p>
    </section>
  )
}

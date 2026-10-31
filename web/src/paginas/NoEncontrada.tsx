import { Link } from 'react-router'

export function NoEncontrada() {
  return (
    <main className="space-y-2 p-6">
      <h1 className="text-xl font-semibold">Página no encontrada</h1>
      <Link to="/panel" className="text-sm underline">
        Ir al panel
      </Link>
    </main>
  )
}
export function EnConstruccion({ titulo }: { titulo: string }) {
  return (
    <section className="space-y-2 p-6">
      <h1 className="text-xl font-semibold">{titulo}</h1>
      <p className="text-sm text-muted-foreground">Esta sección está en construcción.</p>
    </section>
  )
}
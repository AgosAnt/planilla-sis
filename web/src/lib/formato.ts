// Formatos de pantalla. Los montos llegan como texto ("3106.38") y aquí solo se muestran, no se calculan.

const quetzales = new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' })

export const formatoQuetzales = (monto: string | number) => quetzales.format(Number(monto))

// Suma montos en centavos para no acumular errores de punto flotante
export const sumarMontos = (montos: string[]) =>
  (montos.reduce((suma, monto) => suma + Math.round(Number(monto) * 100), 0) / 100).toFixed(2)

// YYYY-MM-DD -> 15/11/2026, sin pasar por Date para que la zona horaria no cambie el día
export const formatoFecha = (fecha: string) => fecha.split('-').reverse().join('/')

export const formatoFechaHora = (instante: string) =>
  new Date(instante).toLocaleString('es-GT', { dateStyle: 'short', timeStyle: 'short' })

// Fecha de hoy en la zona del navegador, como YYYY-MM-DD
export const hoy = () => {
  const ahora = new Date()
  return new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

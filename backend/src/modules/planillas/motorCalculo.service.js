/**
 * Motor de cálculo de planilla puro y determinista (CU-11)
 */
function calcularJornada({ ingreso_at, salida_at, descansos, tarifa_hora, jornada_ordinaria_horas = 8 }) {
  const ingreso = new Date(ingreso_at);
  const salida = new Date(salida_at);
  
  // Horas brutas
  let milisegundos = salida - ingreso;
  
  // Restar descansos no remunerados
  let msDescansosNoRemunerados = 0;
  if (Array.isArray(descansos)) {
    descansos.forEach((d) => {
      if (!d.remunerado && d.inicio_at && d.fin_at) {
        msDescansosNoRemunerados += new Date(d.fin_at) - new Date(d.inicio_at);
      }
    });
  }

  const horasEfectivas = Math.max(0, (milisegundos - msDescansosNoRemunerados) / (1000 * 60 * 60));
  const horasOrdinarias = Math.min(horasEfectivas, jornada_ordinaria_horas);
  const horasExtraDiurnas = Math.max(0, horasEfectivas - jornada_ordinaria_horas);

  const tarifa = parseFloat(tarifa_hora) || 0;
  const montoOrdinario = horasOrdinarias * tarifa;
  const montoExtraDiurno = horasExtraDiurnas * tarifa * 1.5; // Factor 1.5
  const montoBruto = montoOrdinario + montoExtraDiurno;

  return {
    horas_ordinarias: horasOrdinarias.toFixed(2),
    horas_extra_diurnas: horasExtraDiurnas.toFixed(2),
    horas_extra_nocturnas: "0.00",
    monto_bruto: montoBruto.toFixed(2),
    neto: montoBruto.toFixed(2),
  };
}

module.exports = { calcularJornada };
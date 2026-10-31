# Reglas de cálculo de la planilla

Reglas que aplica el motor de cálculo (`POST /planillas/{id}/calcular`). Las aprobó la empresa el 20 de octubre de 2026. Los valores numéricos se guardan en `parametros_pago` y el administrador puede cambiarlos sin tocar código. Los casos de ejemplo del final son la referencia de las pruebas automáticas del motor.

Base legal: Código de Trabajo de Guatemala (Decreto 1441), artículos 116 a 122 y 126 a 129, y Constitución Política, artículo 102.

## Decisiones

| # | Tema | Regla |
|---|---|---|
| 1 | Período | Quincenal: del 1 al 15 y del 16 al último día del mes. Por defecto la planilla incluye a todos los trabajadores; se puede generar por ruta. |
| 2 | Forma de pago | Por hora, con la tarifa vigente de cada trabajador en la fecha de la jornada (`tarifas_trabajador`). |
| 3 | Jornada ordinaria | Diurna 8 h, mixta 7 h, nocturna 6 h (arts. 116 y 117). Las horas que pasan de ese límite son extra. |
| 4 | Hora extra | 1.5 veces la tarifa, o `monto_hora_extra` si el trabajador lo tiene definido (art. 121). |
| 5 | Recargo nocturno | 1.25 veces la tarifa en las horas **ordinarias** trabajadas entre las 18:00 y las 06:00. No se combina con el de hora extra: una hora extra nocturna se paga 1.5. |
| 6 | Descansos | Las pausas y los imprevistos (tipos remunerados) cuentan como trabajo. Del almuerzo se pagan los primeros 30 minutos (art. 119); el exceso se descuenta. |
| 7 | Llegada | Con un turno acordado, hasta 10 minutos tarde se cuenta desde la hora de inicio del turno. Más de 10 minutos se cuenta desde la hora real. El tiempo antes del inicio del turno no se paga, salvo que el supervisor corrija la jornada. Sin turno acordado, se cuenta desde la hora real. |
| 8 | Redondeo | Exacto, al minuto. Los montos se redondean a 2 decimales (mitad hacia arriba) solo en los totales de cada trabajador. |
| 9 | Domingos y feriados | Todas las horas trabajadas se pagan como extra (arts. 126 a 129). En los feriados de medio día, solo las horas desde las 12:00. |
| 10 | Máximo diario | Una jornada de más de 12 horas (art. 122) se paga, pero se marca como excepción para que el supervisor la revise al verificar. |
| 11 | Bonificaciones y deducciones | Bonificación Incentivo: Q250 al mes, Q125 por quincena, si el trabajador tiene al menos una jornada aprobada en el período. IGSS laboral: 4.83 % del monto bruto (sin la bonificación). ISR: no se retiene (ver "Fuera de alcance"). |
| 12 | Responsables | Calcula un supervisor o el administrador, verifica otro supervisor y aprueba el administrador. Las tres personas deben ser distintas (la base de datos lo exige). |
| 13 | Jornadas que entran | Solo las APROBADAS o CORREGIDAS. Si en el período queda una jornada PENDIENTE o sin salida, no se puede calcular. Las RECHAZADAS no se pagan. |
| 14 | Pago | Transferencia bancaria por defecto, con su número de referencia. Un pago por trabajador, por el neto exacto. |

## Cómo se calcula una jornada

1. **Fecha:** la jornada pertenece al día de su ingreso, en hora de Guatemala. Ese día decide el período, si es domingo o feriado y qué tarifa aplica.
2. **Inicio contado:** se aplica la regla 7.
3. **Tiempo efectivo:** de la hora de inicio contada a la salida, menos el exceso de almuerzo sobre 30 minutos (regla 6). Se descuenta el tramo real en que ocurrió ese exceso.
4. **Tipo de jornada,** según las horas efectivas entre las 18:00 y las 06:00:
   - ninguna: diurna, 8 h ordinarias;
   - menos de 4: mixta, 7 h ordinarias;
   - 4 o más: nocturna, 6 h ordinarias (art. 117).
5. **Ordinarias y extra:** las primeras horas efectivas, hasta el límite del paso 4, son ordinarias; las demás son extra. Una hora extra es nocturna o diurna según la hora en que se trabajó. En domingo o feriado todas son extra.
6. **Monto:**
   - ordinarias de día × tarifa;
   - ordinarias de noche × tarifa × 1.25;
   - extra × tarifa × 1.5 (o × `monto_hora_extra`).

## Totales por trabajador

| Campo de `planilla_detalle` | Cálculo |
|---|---|
| `horas_ordinarias`, `horas_extra_diurnas`, `horas_extra_nocturnas` | Suma de las jornadas del período |
| `monto_bruto` | Suma de los montos de las jornadas |
| `total_bonificaciones` | Bonificación Incentivo de la quincena |
| `total_deducciones` | IGSS laboral |
| `neto` | `monto_bruto` + `total_bonificaciones` − `total_deducciones` |
| `calculo_detalle` (JSONB) | Desglose por jornada: fechas, tipo, minutos por categoría, montos y excepciones |

Cada bonificación y deducción también se guarda en `detalle_conceptos`: `BONO_LEY` e `IGSS`. `ISR` va con monto 0.

## Parámetros

| Parámetro (`parametros_pago`) | Valor | Origen |
|---|---|---|
| `factor_hora_extra` | 1.50 | M005 |
| `factor_hora_nocturna` | 1.25 | M005 |
| `minutos_tolerancia_llegada` | 10 | M005 |
| `regla_redondeo` | EXACTO | M005 |
| `periodicidad` | QUINCENAL | M009 (pendiente) |
| `porcentaje_igss_laboral` | 4.83 | M009 (pendiente) |
| `bonificacion_incentivo_mensual` | 250.00 | M009 (pendiente) |
| `minutos_almuerzo_pagado` | 30 | M009 (pendiente) |
| `horas_maximas_dia` | 12 | M009 (pendiente) |

Los feriados se guardan en la tabla `feriados` (M009, pendiente). La carga inicial sigue el artículo 127 del Código de Trabajo:
- día completo: 1 de enero, Jueves, Viernes y Sábado Santo, 1 de mayo, 30 de junio, 15 de septiembre, 20 de octubre, 1 de noviembre y 25 de diciembre;
- medio día desde las 12:00: 24 y 31 de diciembre.

Antes de cargarlos se verifican contra el texto vigente del artículo. El feriado de la festividad local lo agrega el administrador.

## Casos de ejemplo

Período del 16 al 30 de noviembre de 2026, sin feriados. Tarifa de Q20.00 la hora en los tres casos. Todas las jornadas están aprobadas y cada una tiene un almuerzo de 30 minutos, salvo que se diga otra cosa.

### Caso 1: semana normal en turno matutino (06:00 a 14:00)

| Fecha | Jornada | Horas ordinarias | Monto |
|---|---|---|---|
| Lun 16 a vie 20 | 06:00 a 14:00, cada día | 8 diurnas × 5 = 40 | 40 × Q20.00 = Q800.00 |

| Total | Valor |
|---|---|
| Bruto | Q800.00 |
| Bonificación Incentivo | + Q125.00 |
| IGSS (4.83 % de Q800.00) | − Q38.64 |
| **Neto** | **Q886.36** |

### Caso 2: turno nocturno (22:00 a 06:00) con un día extendido

Las jornadas de 22:00 a 06:00 son nocturnas: 8 horas efectivas, todas en el horario nocturno.

| Fecha de ingreso | Jornada | Ordinarias (× 1.25) | Extra (× 1.5) | Monto |
|---|---|---|---|---|
| Lun 16 a jue 19 | 22:00 a 06:00, cada día | 6 nocturnas (22:00 a 04:00) = Q150.00 | 2 nocturnas (04:00 a 06:00) = Q60.00 | Q210.00 × 4 = Q840.00 |
| Vie 20 | 22:00 a 08:00 | 6 nocturnas (22:00 a 04:00) = Q150.00 | 2 nocturnas (04:00 a 06:00) + 2 diurnas (06:00 a 08:00) = Q120.00 | Q270.00 |

Horas: 30 ordinarias, 10 extra nocturnas, 2 extra diurnas.

| Total | Valor |
|---|---|
| Bruto | Q1,110.00 |
| Bonificación Incentivo | + Q125.00 |
| IGSS (4.83 % de Q1,110.00 = Q53.613) | − Q53.61 |
| **Neto** | **Q1,181.39** |

### Caso 3: turno matutino con llegadas tarde, almuerzo largo y domingo

| Fecha | Jornada | Regla | Horas | Monto |
|---|---|---|---|---|
| Lun 16 | 06:08 a 14:00 | Dentro de la tolerancia: se cuenta desde 06:00 | 8 ordinarias | Q160.00 |
| Mar 17 | 06:30 a 14:00 | 30 minutos tarde: se cuenta desde 06:30 | 7.5 ordinarias | Q150.00 |
| Mié 18 | 06:00 a 14:00, almuerzo de 60 min | Se descuentan los 30 min de exceso | 7.5 ordinarias | Q150.00 |
| Jue 19 y vie 20 | 06:00 a 14:00 | — | 8 ordinarias × 2 | Q320.00 |
| Dom 22 | 06:00 a 12:00, sin almuerzo | Domingo: todo es extra | 6 extra diurnas × Q30.00 | Q180.00 |

Horas: 39 ordinarias y 6 extra diurnas.

| Total | Valor |
|---|---|
| Bruto | Q960.00 |
| Bonificación Incentivo | + Q125.00 |
| IGSS (4.83 % de Q960.00 = Q46.368) | − Q46.37 |
| **Neto** | **Q1,038.63** |

## Fuera de alcance

Se documentan para que no se tomen como olvidos:

- **ISR:** depende de la proyección anual del salario y de deducciones personales; con estas tarifas normalmente no aplica. El concepto existe y se registra en Q0.
- **Límite semanal de horas:** se controla por día (reglas 3 y 10), no por semana.
- **Prestaciones** (aguinaldo, Bono 14, vacaciones e indemnización) y **cuota patronal del IGSS:** no forman parte de la planilla quincenal de este sistema.
- **Prorrateo de la Bonificación Incentivo** por días trabajados: se paga completa si hubo al menos una jornada aprobada.

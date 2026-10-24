-- M009: parámetros de pago y feriados para el cálculo de planillas (docs/reglas-calculo.md).
-- Requiere M002 a M008. Ejecutar con un rol administrador, en una sola transacción:
--   psql -v ON_ERROR_STOP=1 -1 -d <base> -f M009_parametros_feriados.sql
-- Es idempotente: se puede ejecutar dos veces sin error.

-- 1. Agregar nuevas columnas a parametros_pago (fila única id = 1, creada en M005).
--    NOT NULL: el cálculo de planillas depende de que nunca estén vacías.
ALTER TABLE public.parametros_pago
    ADD COLUMN IF NOT EXISTS periodicidad VARCHAR(20) NOT NULL DEFAULT 'QUINCENAL' CHECK (periodicidad IN ('SEMANAL', 'QUINCENAL', 'MENSUAL')),
    ADD COLUMN IF NOT EXISTS porcentaje_igss_laboral NUMERIC(5,2) NOT NULL DEFAULT 4.83 CHECK (porcentaje_igss_laboral >= 0 AND porcentaje_igss_laboral <= 100),
    ADD COLUMN IF NOT EXISTS bonificacion_incentivo_mensual NUMERIC(10,2) NOT NULL DEFAULT 250.00 CHECK (bonificacion_incentivo_mensual >= 0),
    ADD COLUMN IF NOT EXISTS minutos_almuerzo_pagado INT NOT NULL DEFAULT 30 CHECK (minutos_almuerzo_pagado >= 0),
    ADD COLUMN IF NOT EXISTS horas_maximas_dia NUMERIC(4,2) NOT NULL DEFAULT 12 CHECK (horas_maximas_dia > 0);

-- Si una base ya tenía la versión anterior de M009 (columnas sin NOT NULL), ADD COLUMN IF NOT EXISTS no las cambia:
-- se rellenan los vacíos con el valor por defecto y se exige NOT NULL igual.
UPDATE public.parametros_pago SET
    periodicidad = COALESCE(periodicidad, 'QUINCENAL'),
    porcentaje_igss_laboral = COALESCE(porcentaje_igss_laboral, 4.83),
    bonificacion_incentivo_mensual = COALESCE(bonificacion_incentivo_mensual, 250.00),
    minutos_almuerzo_pagado = COALESCE(minutos_almuerzo_pagado, 30),
    horas_maximas_dia = COALESCE(horas_maximas_dia, 12);
ALTER TABLE public.parametros_pago
    ALTER COLUMN periodicidad SET NOT NULL,
    ALTER COLUMN porcentaje_igss_laboral SET NOT NULL,
    ALTER COLUMN bonificacion_incentivo_mensual SET NOT NULL,
    ALTER COLUMN minutos_almuerzo_pagado SET NOT NULL,
    ALTER COLUMN horas_maximas_dia SET NOT NULL;

-- 2. Crear tabla de feriados (regla 9: todas las horas trabajadas se pagan como extra; en medio_dia, desde las 12:00)
CREATE TABLE IF NOT EXISTS public.feriados (
    fecha DATE PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    medio_dia BOOLEAN NOT NULL DEFAULT false
);

-- 3. Cargar feriados de 2026 y 2027 (artículo 127 del Código de Trabajo; verificar traslados de asueto vigentes)
INSERT INTO public.feriados (fecha, nombre, medio_dia) VALUES
    -- Feriados 2026
    ('2026-01-01', 'Año Nuevo', false),
    ('2026-04-02', 'Jueves Santo', false),
    ('2026-04-03', 'Viernes Santo', false),
    ('2026-04-04', 'Sábado de Gloria', false),
    ('2026-05-01', 'Día del Trabajo', false),
    ('2026-06-30', 'Día del Ejército', false),
    ('2026-09-15', 'Día de la Independencia', false),
    ('2026-10-20', 'Día de la Revolución', false),
    ('2026-11-01', 'Día de Todos los Santos', false),
    ('2026-12-24', 'Nochebuena', true),
    ('2026-12-25', 'Navidad', false),
    ('2026-12-31', 'Víspera de Año Nuevo', true),

    -- Feriados 2027
    ('2027-01-01', 'Año Nuevo', false),
    ('2027-03-25', 'Jueves Santo', false),
    ('2027-03-26', 'Viernes Santo', false),
    ('2027-03-27', 'Sábado de Gloria', false),
    ('2027-05-01', 'Día del Trabajo', false),
    ('2027-06-30', 'Día del Ejército', false),
    ('2027-09-15', 'Día de la Independencia', false),
    ('2027-10-20', 'Día de la Revolución', false),
    ('2027-11-01', 'Día de Todos los Santos', false),
    ('2027-12-24', 'Nochebuena', true),
    ('2027-12-25', 'Navidad', false),
    ('2027-12-31', 'Víspera de Año Nuevo', true)
ON CONFLICT (fecha) DO NOTHING;

-- 4. Actualizar permisos para app_user (SELECT de parametros_pago ya viene de M006).
--    Quién puede cambiarlos (solo el administrador) lo controlan la API y el RLS de M010.
GRANT UPDATE ON public.parametros_pago TO app_user;
GRANT SELECT, INSERT, DELETE ON public.feriados TO app_user;

-- M009: Parámetros adicionales y Feriados (Idempotente)

-- 1. Agregar nuevas columnas a parametros_pago
ALTER TABLE public.parametros_pago
    ADD COLUMN IF NOT EXISTS periodicidad VARCHAR(20) DEFAULT 'QUINCENAL' CHECK (periodicidad IN ('SEMANAL', 'QUINCENAL', 'MENSUAL')),
    ADD COLUMN IF NOT EXISTS porcentaje_igss_laboral NUMERIC(5,2) DEFAULT 4.83 CHECK (porcentaje_igss_laboral >= 0 AND porcentaje_igss_laboral <= 100),
    ADD COLUMN IF NOT EXISTS bonificacion_incentivo_mensual NUMERIC(10,2) DEFAULT 250.00 CHECK (bonificacion_incentivo_mensual >= 0),
    ADD COLUMN IF NOT EXISTS minutos_almuerzo_pagado INT DEFAULT 30 CHECK (minutos_almuerzo_pagado >= 0),
    ADD COLUMN IF NOT EXISTS horas_maximas_dia NUMERIC(4,2) DEFAULT 12 CHECK (horas_maximas_dia > 0);

-- 2. Crear tabla de feriados
CREATE TABLE IF NOT EXISTS public.feriados (
    fecha DATE PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    medio_dia BOOLEAN NOT NULL DEFAULT false
);

-- 3. Cargar feriados de 2026 y 2027
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

-- 4. Actualizar Permisos para app_user
GRANT UPDATE ON public.parametros_pago TO app_user;
GRANT SELECT, INSERT, DELETE ON public.feriados TO app_user;

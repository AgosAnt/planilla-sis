-- 1. Historial de Tarifas por Trabajador
CREATE TABLE IF NOT EXISTS public.tarifas_trabajador (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trabajador_id UUID NOT NULL REFERENCES public.perfiles(id),
    monto_hora NUMERIC(10,2) NOT NULL CHECK (monto_hora >= 0),
    monto_hora_extra NUMERIC(10,2) CHECK (monto_hora_extra >= 0),
    moneda VARCHAR(3) NOT NULL DEFAULT 'GTQ',
    vigente_desde DATE NOT NULL,
    vigente_hasta DATE,
    creado_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_fechas_tarifas CHECK (vigente_hasta IS NULL OR vigente_hasta >= vigente_desde)
);

-- 2. Parámetros Globales de Pago
CREATE TABLE IF NOT EXISTS public.parametros_pago (
    id SMALLINT PRIMARY KEY DEFAULT 1,
    factor_hora_extra NUMERIC(4,2) NOT NULL DEFAULT 1.50,
    factor_hora_nocturna NUMERIC(4,2) NOT NULL DEFAULT 1.25,
    minutos_tolerancia_llegada INT NOT NULL DEFAULT 10,
    regla_redondeo VARCHAR(20) NOT NULL DEFAULT 'EXACTO' CHECK (regla_redondeo IN ('EXACTO', 'CADA_15_MIN', 'CADA_30_MIN')),
    actualizado_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.parametros_pago (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 3. Períodos de Planilla
CREATE TABLE IF NOT EXISTS public.periodos_planilla (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) NOT NULL UNIQUE,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'BORRADOR' CHECK (estado IN ('BORRADOR', 'EN_CALCULO', 'CERRADO', 'PAGADO')),
    creado_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_fechas_periodo CHECK (fecha_fin >= fecha_inicio)
);

-- 4. Cabecera de Planillas
CREATE TABLE IF NOT EXISTS public.planillas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    periodo_id UUID NOT NULL REFERENCES public.periodos_planilla(id),
    trabajador_id UUID NOT NULL REFERENCES public.perfiles(id),
    horas_ordinarias NUMERIC(6,2) NOT NULL DEFAULT 0.00,
    horas_extras NUMERIC(6,2) NOT NULL DEFAULT 0.00,
    monto_ordinario NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    monto_extra NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    monto_bonificaciones NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    monto_deducciones NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    monto_liquido NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    calculado_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (periodo_id, trabajador_id)
);

-- 5. Catálogo de Conceptos de Pago (Deducciones / Bonos)
CREATE TABLE IF NOT EXISTS public.conceptos_pago (
    id SMALLINT PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('BONIFICACION', 'DEDUCCION')),
    es_ley BOOLEAN NOT NULL DEFAULT false
);

INSERT INTO public.conceptos_pago (id, codigo, nombre, tipo, es_ley) VALUES 
(1, 'BONO_LEY', 'Bonificación Incentivo Decreto 37-2001', 'BONIFICACION', true),
(2, 'IGSS', 'Cuota Laboral IGSS (4.83%)', 'DEDUCCION', true),
(3, 'ISR', 'Retención ISR Salarios', 'DEDUCCION', true)
ON CONFLICT (id) DO NOTHING;

-- 6. Detalle de Conceptos por Planilla
CREATE TABLE IF NOT EXISTS public.planilla_detalle (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    planilla_id UUID NOT NULL REFERENCES public.planillas(id) ON DELETE CASCADE,
    concepto_id SMALLINT NOT NULL REFERENCES public.conceptos_pago(id),
    monto NUMERIC(10,2) NOT NULL CHECK (monto >= 0),
    observacion TEXT
);

-- 7. Métodos y Registros de Pago Realizados
CREATE TABLE IF NOT EXISTS public.metodos_pago (
    id SMALLINT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL
);

INSERT INTO public.metodos_pago (id, nombre) VALUES 
(1, 'Transferencia Bancaria'), 
(2, 'Cheque'), 
(3, 'Efectivo')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.pagos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    planilla_id UUID NOT NULL REFERENCES public.planillas(id),
    metodo_pago_id SMALLINT NOT NULL REFERENCES public.metodos_pago(id),
    referencia_transaccion VARCHAR(100),
    monto_pagado NUMERIC(10,2) NOT NULL CHECK (monto_pagado > 0),
    pagado_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    registrado_por UUID NOT NULL REFERENCES public.perfiles(id)
);

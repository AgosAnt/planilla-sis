-- 1. Historial de Tarifas por Trabajador
-- (Nota: El monto_hora_extra explícito tiene prioridad. Si es NULL, se calculará usando el factor_hora_extra de parametros_pago)
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
    CONSTRAINT chk_fechas_periodo CHECK (fecha_fin >= fecha_inicio),
    UNIQUE (fecha_inicio, fecha_fin)
);

-- 4. Cabecera de Planillas (Por Período)
CREATE TABLE IF NOT EXISTS public.planillas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    periodo_id UUID NOT NULL REFERENCES public.periodos_planilla(id),
    ruta_id UUID REFERENCES public.rutas(id),
    estado VARCHAR(20) NOT NULL DEFAULT 'CALCULADA' CHECK (estado IN ('CALCULADA', 'VERIFICADA', 'APROBADA', 'PAGADA')),
    calculada_por UUID REFERENCES public.perfiles(id),
    calculada_at TIMESTAMPTZ DEFAULT NOW(),
    verificada_por UUID REFERENCES public.perfiles(id),
    verificada_at TIMESTAMPTZ,
    aprobada_por UUID REFERENCES public.perfiles(id),
    aprobada_at TIMESTAMPTZ,
    hash_integridad TEXT,
    -- Nadie puede hacer dos pasos del proceso)
    CONSTRAINT chk_segreg_calc_verif CHECK (calculada_por IS NULL OR verificada_por IS NULL OR calculada_por <> verificada_por),
    CONSTRAINT chk_segreg_calc_aprob CHECK (calculada_por IS NULL OR aprobada_por IS NULL OR calculada_por <> aprobada_por),
    CONSTRAINT chk_segreg_verif_aprob CHECK (verificada_por IS NULL OR aprobada_por IS NULL OR verificada_por <> aprobada_por)
);

-- 5. Planilla Detalle (Una fila POR TRABAJADOR)
CREATE TABLE IF NOT EXISTS public.planilla_detalle (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    planilla_id UUID NOT NULL REFERENCES public.planillas(id) ON DELETE CASCADE,
    trabajador_id UUID NOT NULL REFERENCES public.perfiles(id),
    horas_ordinarias NUMERIC(6,2) NOT NULL DEFAULT 0.00,
    horas_extra_diurnas NUMERIC(6,2) NOT NULL DEFAULT 0.00,
    horas_extra_nocturnas NUMERIC(6,2) NOT NULL DEFAULT 0.00,
    monto_bruto NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total_bonificaciones NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total_deducciones NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    neto NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    calculo_detalle JSONB NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (planilla_id, trabajador_id)
);

-- RN-07: Trigger de inmutabilidad Impide modificar montos si está APROBADA o PAGADA
CREATE OR REPLACE FUNCTION trg_check_inmutabilidad_planilla()
RETURNS TRIGGER AS $$
DECLARE
    estado_planilla VARCHAR;
BEGIN
    SELECT estado INTO estado_planilla FROM public.planillas WHERE id = NEW.planilla_id;
    IF estado_planilla IN ('APROBADA', 'PAGADA') THEN
        RAISE EXCEPTION 'RN-07: No se pueden modificar montos de una planilla APROBADA o PAGADA.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_inmutabilidad_planilla_detalle
BEFORE UPDATE ON public.planilla_detalle
FOR EACH ROW
WHEN (OLD.monto_bruto IS DISTINCT FROM NEW.monto_bruto OR OLD.neto IS DISTINCT FROM NEW.neto)
EXECUTE FUNCTION trg_check_inmutabilidad_planilla();

-- 6. Catálogo de Conceptos de Pago (Sin porcentajes quemados en el nombre)
CREATE TABLE IF NOT EXISTS public.conceptos_pago (
    id SMALLINT PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('BONIFICACION', 'DEDUCCION')),
    es_ley BOOLEAN NOT NULL DEFAULT false
);

INSERT INTO public.conceptos_pago (id, codigo, nombre, tipo, es_ley) VALUES 
(1, 'BONO_LEY', 'Bonificación Incentivo Ley', 'BONIFICACION', true),
(2, 'IGSS', 'Cuota Laboral IGSS', 'DEDUCCION', true),
(3, 'ISR', 'Retención ISR Salarios', 'DEDUCCION', true)
ON CONFLICT (id) DO NOTHING;

-- 7. Detalle de Conceptos Desglose de bonos y deduccione
CREATE TABLE IF NOT EXISTS public.detalle_conceptos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    detalle_id UUID NOT NULL REFERENCES public.planilla_detalle(id) ON DELETE CASCADE,
    concepto_id SMALLINT NOT NULL REFERENCES public.conceptos_pago(id),
    monto NUMERIC(10,2) NOT NULL CHECK (monto >= 0),
    observacion TEXT
);

-- 8. Métodos y Registros de Pago Realizados
CREATE TABLE IF NOT EXISTS public.metodos_pago (
    id SMALLINT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL
);

INSERT INTO public.metodos_pago (id, nombre) VALUES 
(1, 'Transferencia Bancaria'), (2, 'Cheque'), (3, 'Efectivo')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.pagos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    detalle_id UUID NOT NULL REFERENCES public.planilla_detalle(id),
    metodo_pago_id SMALLINT NOT NULL REFERENCES public.metodos_pago(id),
    estado VARCHAR(20) NOT NULL DEFAULT 'PROCESADO' CHECK (estado IN ('PROCESADO', 'RECHAZADO', 'ANULADO')),
    referencia_transaccion VARCHAR(100),
    monto_pagado NUMERIC(10,2) NOT NULL CHECK (monto_pagado > 0),
    pagado_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    registrado_por UUID NOT NULL REFERENCES public.perfiles(id)
);

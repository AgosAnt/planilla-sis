-- 1. Tabla Principal de Registros de Tiempo (Jornadas reales)
CREATE TABLE IF NOT EXISTS public.registros_tiempo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trabajador_id UUID NOT NULL REFERENCES public.perfiles(id),
    asignacion_id UUID REFERENCES public.asignaciones_ruta(id),
    ingreso_at TIMESTAMPTZ NOT NULL,
    salida_at TIMESTAMPTZ,
    latitud_ingreso NUMERIC(10,8),
    longitud_ingreso NUMERIC(11,8),
    latitud_salida NUMERIC(10,8),
    longitud_salida NUMERIC(11,8),
    origen VARCHAR(20) NOT NULL DEFAULT 'MOVIL' CHECK (origen IN ('MOVIL', 'WEB', 'SISTEMA')),
    estado_validacion VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado_validacion IN ('PENDIENTE', 'APROBADA', 'CORREGIDA', 'RECHAZADA')),
    validado_por UUID REFERENCES public.perfiles(id),
    validado_at TIMESTAMPTZ,
    observaciones TEXT,
    client_uuid UUID NOT NULL,
    creado_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_salida_despues_ingreso CHECK (salida_at IS NULL OR salida_at > ingreso_at),
    UNIQUE (trabajador_id, client_uuid)
);

CREATE INDEX IF NOT EXISTS idx_registros_trabajador_ingreso 
ON public.registros_tiempo (trabajador_id, ingreso_at DESC);

-- 2. Catálogo de Tipos de Descanso
CREATE TABLE IF NOT EXISTS public.tipos_descanso (
    id SMALLINT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    remunerado BOOLEAN NOT NULL DEFAULT false
);

INSERT INTO public.tipos_descanso (id, nombre, remunerado) VALUES 
(1, 'Almuerzo', false),
(2, 'Pausa Activa / Cafe', true),
(3, 'Imprevisto / Sanitario', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Registro de Descansos por Jornada
CREATE TABLE IF NOT EXISTS public.descansos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registro_tiempo_id UUID NOT NULL REFERENCES public.registros_tiempo(id) ON DELETE CASCADE,
    tipo_id SMALLINT NOT NULL REFERENCES public.tipos_descanso(id),
    inicio_at TIMESTAMPTZ NOT NULL,
    fin_at TIMESTAMPTZ,
    CONSTRAINT chk_fin_despues_inicio CHECK (fin_at IS NULL OR fin_at > inicio_at)
);

-- 4. Eventos Diarios e Incidentes (Componente NoSQL / JSONB)
CREATE TABLE IF NOT EXISTS public.eventos_diarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_uuid UUID NOT NULL,
    trabajador_id UUID NOT NULL REFERENCES public.perfiles(id),
    registro_tiempo_id UUID REFERENCES public.registros_tiempo(id),
    tipo_evento VARCHAR(50) NOT NULL CHECK (tipo_evento IN ('EMERGENCIA','VISITA_FALLIDA','PROBLEMA_VEHICULO','CAMBIO_ESTADO','NOTA','OTRO')),
    origen VARCHAR(20) NOT NULL DEFAULT 'MOVIL' CHECK (origen IN ('MOVIL','WEB','SISTEMA')),
    latitud NUMERIC(10,8),
    longitud NUMERIC(11,8),
    estado_atencion VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE_REVISION' CHECK (estado_atencion IN ('PENDIENTE_REVISION','EN_ATENCION','ATENDIDO','DESCARTADO')),
    atendido_por UUID REFERENCES public.perfiles(id),
    atendido_at TIMESTAMPTZ,
    esquema_version SMALLINT NOT NULL DEFAULT 1,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload) = 'object'),
    ocurrido_en TIMESTAMPTZ NOT NULL,
    recibido_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (trabajador_id, client_uuid)
);

CREATE INDEX IF NOT EXISTS idx_eventos_payload_gin ON public.eventos_diarios USING gin (payload jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_eventos_pendientes ON public.eventos_diarios (estado_atencion, ocurrido_en DESC) WHERE estado_atencion = 'PENDIENTE_REVISION';

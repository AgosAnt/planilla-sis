-- Habilitar extensión para usar índices GiST con tipos de datos estándar
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 1. Tabla de Rutas
CREATE TABLE IF NOT EXISTS public.rutas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    supervisor_id UUID REFERENCES public.perfiles(id),
    activa BOOLEAN NOT NULL DEFAULT true,
    creado_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Puntos/Coordenadas de cada Ruta (Geocercas)
CREATE TABLE IF NOT EXISTS public.ruta_puntos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ruta_id UUID NOT NULL REFERENCES public.rutas(id) ON DELETE CASCADE,
    orden SMALLINT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    latitud NUMERIC(10,8) NOT NULL,
    longitud NUMERIC(11,8) NOT NULL,
    radio_m INT NOT NULL DEFAULT 50,
    UNIQUE (ruta_id, orden)
);

-- 3. Asignación de Trabajadores a Rutas (Actualizada con EXCLUDE)
CREATE TABLE IF NOT EXISTS public.asignaciones_ruta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ruta_id UUID NOT NULL REFERENCES public.rutas(id),
    trabajador_id UUID NOT NULL REFERENCES public.perfiles(id),
    asignado_por UUID NOT NULL REFERENCES public.perfiles(id),
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    activa BOOLEAN NOT NULL DEFAULT true,
    creado_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_fechas_asignacion CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio),
    -- Esta es la regla RN que pide el contrato para evitar solapamiento
    CONSTRAINT sin_solapamiento_asignaciones EXCLUDE USING gist (
        trabajador_id WITH =,
        daterange(fecha_inicio, COALESCE(fecha_fin, 'infinity'::date), '[]') WITH &&
    )
);

-- 4. Catálogo de Turnos
CREATE TABLE IF NOT EXISTS public.turnos (
    id SMALLINT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    minutos_descanso INT NOT NULL DEFAULT 60,
    es_nocturno BOOLEAN NOT NULL DEFAULT false
);

INSERT INTO public.turnos (id, nombre, hora_inicio, hora_fin, minutos_descanso, es_nocturno) VALUES 
(1, 'Matutino', '06:00:00', '14:00:00', 60, false),
(2, 'Vespertino', '14:00:00', '22:00:00', 60, false),
(3, 'Nocturno', '22:00:00', '06:00:00', 60, true)
ON CONFLICT (id) DO NOTHING;

-- 5. Acuerdos de Turno entre Supervisor y Trabajador
CREATE TABLE IF NOT EXISTS public.acuerdos_turno (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asignacion_id UUID NOT NULL REFERENCES public.asignaciones_ruta(id),
    turno_id SMALLINT NOT NULL REFERENCES public.turnos(id),
    fecha DATE NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'PROPUESTO' CHECK (estado IN ('PROPUESTO', 'ACEPTADO', 'RECHAZADO', 'CONFIRMADO')),
    confirmado_por UUID REFERENCES public.perfiles(id),
    confirmado_at TIMESTAMPTZ,
    UNIQUE (asignacion_id, fecha)
);

-- Extensiones requeridas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Catálogo de Roles
CREATE TABLE IF NOT EXISTS public.roles (
    id SMALLINT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO public.roles (id, nombre) VALUES 
(1, 'administrador'), 
(2, 'supervisor'), 
(3, 'trabajador')
ON CONFLICT (id) DO NOTHING;

-- Tabla Perfiles
CREATE TABLE IF NOT EXISTS public.perfiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol_id SMALLINT NOT NULL REFERENCES public.roles(id),
    codigo_empleado VARCHAR(50) NOT NULL UNIQUE,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    documento VARCHAR(50) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT true,
    mfa_secret VARCHAR(255),
    creado_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla Sesiones Refresh (Autenticación propia)
CREATE TABLE IF NOT EXISTS public.sesiones_refresh (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    perfil_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    creado_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expira_at TIMESTAMPTZ NOT NULL,
    revocado_at TIMESTAMPTZ,
    reemplazado_por UUID REFERENCES public.sesiones_refresh(id),
    ip INET,
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_sesiones_refresh_perfil 
ON public.sesiones_refresh (perfil_id) 
WHERE revocado_at IS NULL;

-- Tabla Auditoría (Componente JSONB)
CREATE TABLE IF NOT EXISTS public.auditoria (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor_id UUID REFERENCES public.perfiles(id),
    actor_rol VARCHAR(50),
    entidad VARCHAR(100) NOT NULL,
    entidad_id VARCHAR(100) NOT NULL,
    accion VARCHAR(50) NOT NULL CHECK (accion IN ('INSERT','UPDATE','DELETE','VERIFICAR','APROBAR','RECHAZAR','PAGAR','LOGIN','EXPORT')),
    datos_antes JSONB,
    datos_despues JSONB,
    contexto JSONB NOT NULL DEFAULT '{}'::jsonb,
    ocurrido_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auditoria_entidad ON public.auditoria (entidad, entidad_id, ocurrido_en DESC);

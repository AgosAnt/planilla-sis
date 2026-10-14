CREATE TABLE IF NOT EXISTS public.estados_trabajador (
 id SMALLINT PRIMARY KEY, codigo VARCHAR(30) NOT NULL UNIQUE, nombre VARCHAR(80) NOT NULL
);
INSERT INTO public.estados_trabajador(id,codigo,nombre) VALUES
 (1,'ACTIVO','Activo'),(2,'EN_RUTA','En ruta'),(3,'DESCANSO','Descanso'),
 (4,'INCAPACIDAD','Incapacidad'),(5,'VACACIONES','Vacaciones'),(6,'SUSPENDIDO','Suspendido')
ON CONFLICT(id) DO NOTHING;
CREATE TABLE IF NOT EXISTS public.historial_estado_trabajador (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 trabajador_id UUID NOT NULL REFERENCES public.perfiles(id),
 estado_id SMALLINT NOT NULL REFERENCES public.estados_trabajador(id),
 inicio_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), fin_at TIMESTAMPTZ,
 cambiado_por UUID REFERENCES public.perfiles(id), motivo TEXT,
 CONSTRAINT chk_historial_estado_fechas CHECK(fin_at IS NULL OR fin_at>inicio_at)
);
CREATE INDEX IF NOT EXISTS idx_historial_estado_trabajador ON public.historial_estado_trabajador(trabajador_id,inicio_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_historial_estado_actual ON public.historial_estado_trabajador(trabajador_id) WHERE fin_at IS NULL;
CREATE TABLE IF NOT EXISTS public.permisos (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), codigo VARCHAR(100) NOT NULL UNIQUE,
 descripcion TEXT NOT NULL
);
INSERT INTO public.permisos(codigo,descripcion) VALUES
 ('planilla.aprobar','Aprobar planillas') ON CONFLICT(codigo) DO NOTHING;
CREATE TABLE IF NOT EXISTS public.rol_permiso (
 rol_id SMALLINT NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
 permiso_id UUID NOT NULL REFERENCES public.permisos(id) ON DELETE CASCADE,
 PRIMARY KEY(rol_id,permiso_id)
);
-- Catálogos y lectura de historial; escritura de estados mediante servicio autorizado.
GRANT SELECT ON public.estados_trabajador,public.permisos,public.rol_permiso TO app_user;
GRANT SELECT,INSERT ON public.historial_estado_trabajador TO app_user;
GRANT UPDATE(fin_at) ON public.historial_estado_trabajador TO app_user;

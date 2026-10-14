-- M007: estados de trabajador y permisos por rol (RBAC). Sigue D.2 del entregable.
-- Requiere PostgreSQL 15 o superior. Ejecutar con un rol administrador.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 1. Catálogo de estados del trabajador (CU-03)
CREATE TABLE IF NOT EXISTS public.estados_trabajador (
    id SMALLINT PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(80) NOT NULL
);
INSERT INTO public.estados_trabajador (id, codigo, nombre) VALUES
(1, 'ACTIVO', 'Activo'), (2, 'EN_RUTA', 'En ruta'), (3, 'DESCANSO', 'Descanso'),
(4, 'INCAPACIDAD', 'Incapacidad'), (5, 'VACACIONES', 'Vacaciones'),
(6, 'SUSPENDIDO', 'Suspendido'), (7, 'INACTIVO', 'Inactivo')
ON CONFLICT (id) DO NOTHING;

-- 2. Historial de estados: hasta/fin_at NULL = vigente; sin solapamiento por trabajador
CREATE TABLE IF NOT EXISTS public.historial_estado_trabajador (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trabajador_id UUID NOT NULL REFERENCES public.perfiles(id),
    estado_id SMALLINT NOT NULL REFERENCES public.estados_trabajador(id),
    inicio_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fin_at TIMESTAMPTZ,
    cambiado_por UUID REFERENCES public.perfiles(id),
    motivo TEXT,
    CONSTRAINT chk_historial_estado_fechas CHECK (fin_at IS NULL OR fin_at > inicio_at),
    CONSTRAINT sin_solapamiento_estados EXCLUDE USING gist (
        trabajador_id WITH =,
        tstzrange(inicio_at, fin_at) WITH &&
    )
);
CREATE INDEX IF NOT EXISTS idx_historial_estado_trabajador
ON public.historial_estado_trabajador (trabajador_id, inicio_at DESC);

-- 3. Permisos (id smallint, como define D.2) y su relación con los roles
CREATE TABLE IF NOT EXISTS public.permisos (
    id SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS public.rol_permiso (
    rol_id SMALLINT NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permiso_id SMALLINT NOT NULL REFERENCES public.permisos(id) ON DELETE CASCADE,
    PRIMARY KEY (rol_id, permiso_id)
);

-- Permisos derivados de la matriz de acceso por rol (sección C) y de los casos de uso CU-03 y CU-15.
-- El alcance (propio, sus rutas, todos) lo aplica la API y, opcionalmente, RLS.
INSERT INTO public.permisos (codigo, descripcion) VALUES
('usuarios.gestionar',    'Gestionar usuarios y roles'),
('rutas.gestionar',       'Crear y editar rutas (supervisor: solo las suyas)'),
('asignaciones.gestionar','Asignar trabajadores a rutas (supervisor: solo sus rutas)'),
('registros.registrar',   'Registrar ingreso, descanso, salida y eventos (solo el propio)'),
('registros.ver',         'Ver registros de tiempo (todos, de sus rutas o propios según el rol)'),
('registros.validar',     'Validar, rechazar o corregir registros de tiempo'),
('planilla.calcular',     'Calcular planilla'),
('planilla.verificar',    'Verificar planilla (revisión independiente)'),
('planilla.aprobar',      'Aprobar planilla'),
('pagos.registrar',       'Registrar el pago de una planilla aprobada'),
('calculo.ver_propio',    'Ver el propio cálculo de horas y pago'),
('auditoria.consultar',   'Consultar la bitácora de auditoría'),
('parametros.configurar', 'Configurar parámetros de pago'),
('estados.gestionar',     'Gestionar el estado de los trabajadores')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id
FROM (VALUES
  ('administrador','usuarios.gestionar'),
  ('administrador','rutas.gestionar'),
  ('administrador','asignaciones.gestionar'),
  ('administrador','registros.ver'),
  ('administrador','registros.validar'),
  ('administrador','planilla.calcular'),
  ('administrador','planilla.aprobar'),
  ('administrador','pagos.registrar'),
  ('administrador','auditoria.consultar'),
  ('administrador','parametros.configurar'),
  ('administrador','estados.gestionar'),
  ('supervisor','rutas.gestionar'),
  ('supervisor','asignaciones.gestionar'),
  ('supervisor','registros.ver'),
  ('supervisor','registros.validar'),
  ('supervisor','planilla.calcular'),
  ('supervisor','planilla.verificar'),
  ('supervisor','estados.gestionar'),
  ('trabajador','registros.registrar'),
  ('trabajador','registros.ver'),
  ('trabajador','calculo.ver_propio')
) AS m(rol, permiso)
JOIN public.roles r ON r.nombre = m.rol
JOIN public.permisos p ON p.codigo = m.permiso
ON CONFLICT DO NOTHING;

-- Permisos de app_user: catálogos de solo lectura; el historial solo se agrega y se cierra
GRANT SELECT ON public.estados_trabajador, public.permisos, public.rol_permiso TO app_user;
GRANT SELECT, INSERT ON public.historial_estado_trabajador TO app_user;
GRANT UPDATE (fin_at) ON public.historial_estado_trabajador TO app_user;

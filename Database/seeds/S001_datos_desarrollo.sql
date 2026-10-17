-- S001: datos de prueba para la base LOCAL de cada desarrollador. Nunca ejecutar en el servidor de producción.
-- Requiere M002 a M008. Ejecutar con un rol administrador (no app_user), pasando la contraseña de los usuarios:
--   psql -v ON_ERROR_STOP=1 -v password='<mínimo 12 caracteres>' -1 -d <base> -f S001_datos_desarrollo.sql
--
-- Crea (si no existen): un administrador, un supervisor y un trabajador con esa contraseña, una ruta del
-- supervisor con el trabajador asignado y un registro de tiempo abierto para probar descansos y eventos.
-- Es idempotente: si se vuelve a ejecutar no duplica datos ni cambia contraseñas ya creadas.

\if :{?password}
\else
  \warn 'ERROR: falta la contraseña. Uso: psql -v password=''...'' -f S001_datos_desarrollo.sql'
  DO $$ BEGIN RAISE EXCEPTION 'S001 cancelado'; END $$;
  \quit
\endif

SELECT length(:'password') >= 12 AS password_valida \gset
\if :password_valida
\else
  \warn 'ERROR: la contraseña debe tener al menos 12 caracteres (política de ADR-001).'
  DO $$ BEGIN RAISE EXCEPTION 'S001 cancelado'; END $$;
  \quit
\endif

-- Hash bcrypt con pgcrypto (M002); es compatible con bcrypt.compare del backend.
INSERT INTO public.perfiles (email, password_hash, rol_id, codigo_empleado, nombres, apellidos, documento)
VALUES
  ('admin@local.test',      crypt(:'password', gen_salt('bf', 10)), 1, 'DEV-ADM-01', 'Admin',      'Desarrollo', 'DEV-DOC-ADM-01'),
  ('supervisor@local.test', crypt(:'password', gen_salt('bf', 10)), 2, 'DEV-SUP-01', 'Supervisor', 'Desarrollo', 'DEV-DOC-SUP-01'),
  ('trabajador@local.test', crypt(:'password', gen_salt('bf', 10)), 3, 'DEV-TRA-01', 'Trabajador', 'Desarrollo', 'DEV-DOC-TRA-01')
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.rutas (codigo, nombre, descripcion, supervisor_id)
SELECT 'DEV-RUTA-01', 'Ruta de desarrollo', 'Ruta de prueba creada por S001', id
FROM public.perfiles WHERE email = 'supervisor@local.test'
ON CONFLICT (codigo) DO NOTHING;

-- Asignación activa: permite que el supervisor vea al trabajador (app.supervisa_trabajador en M008).
INSERT INTO public.asignaciones_ruta (ruta_id, trabajador_id, asignado_por, fecha_inicio)
SELECT r.id, t.id, a.id, CURRENT_DATE
FROM public.rutas r
JOIN public.perfiles t ON t.email = 'trabajador@local.test'
JOIN public.perfiles a ON a.email = 'admin@local.test'
WHERE r.codigo = 'DEV-RUTA-01'
  AND NOT EXISTS (SELECT 1 FROM public.asignaciones_ruta x WHERE x.trabajador_id = t.id AND x.activa);

-- Registro de tiempo abierto (una sola jornada abierta por trabajador, índice registros_uno_abierto).
INSERT INTO public.registros_tiempo (trabajador_id, asignacion_id, ingreso_at, client_uuid)
SELECT t.id, x.id, NOW() - INTERVAL '2 hours', gen_random_uuid()
FROM public.perfiles t
JOIN public.asignaciones_ruta x ON x.trabajador_id = t.id AND x.activa
WHERE t.email = 'trabajador@local.test'
  AND NOT EXISTS (SELECT 1 FROM public.registros_tiempo r WHERE r.trabajador_id = t.id AND r.salida_at IS NULL);

-- Resumen para usar en Postman
SELECT p.email, r.nombre AS rol, rt.id AS registro_tiempo_abierto
FROM public.perfiles p
JOIN public.roles r ON r.id = p.rol_id
LEFT JOIN public.registros_tiempo rt ON rt.trabajador_id = p.id AND rt.salida_at IS NULL
WHERE p.email LIKE '%@local.test' AND p.codigo_empleado LIKE 'DEV-%'
ORDER BY p.rol_id;

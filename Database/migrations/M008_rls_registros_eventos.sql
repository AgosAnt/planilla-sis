-- M008: Row Level Security (defensa en profundidad) sobre registros_tiempo y eventos_diarios.
-- Requiere M002 a M007. Ejecutar con un rol administrador:
--   psql -v ON_ERROR_STOP=1 -1 -d <base> -f M008_rls_registros_eventos.sql
--
-- ANTES DE APLICAR: toda consulta del backend a registros_tiempo y eventos_diarios debe correr
-- dentro de una transaccion que fije app.jwt_claims. Sin claims, app_user ve 0 filas y no puede insertar.
-- Ejemplo para el backend (Node + pg), con el usuario ya autenticado por el middleware:
--
--   async function conClaims(pool, user, fn) {
--     const client = await pool.connect();
--     try {
--       await client.query('BEGIN');
--       await client.query("SELECT set_config('app.jwt_claims', $1, true)",
--                          [JSON.stringify({ sub: user.id, rol: user.rol })]);
--       const res = await fn(client);
--       await client.query('COMMIT');
--       return res;
--     } catch (e) { await client.query('ROLLBACK'); throw e; }
--     finally { client.release(); }
--   }
--   // uso: conClaims(pool, req.user, c => c.query('SELECT * FROM registros_tiempo WHERE ...', [...]))
--
-- El login (perfiles, sesiones_refresh) NO usa estas tablas, asi que no cambia.

CREATE SCHEMA IF NOT EXISTS app;

-- Claims que el backend fijo con set_config() DESPUES de verificar su propio JWT.
CREATE OR REPLACE FUNCTION app.jwt_claims() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT coalesce(nullif(current_setting('app.jwt_claims', true), ''), '{}')::jsonb $$;

CREATE OR REPLACE FUNCTION app.rol_actual() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT coalesce(app.jwt_claims() ->> 'rol', 'sin_rol') $$;

CREATE OR REPLACE FUNCTION app.usuario_actual() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT nullif(app.jwt_claims() ->> 'sub', '')::uuid $$;

-- ¿El usuario actual supervisa a este trabajador? (asignacion activa en una ruta suya)
CREATE OR REPLACE FUNCTION app.supervisa_trabajador(p_trabajador uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.asignaciones_ruta a
    JOIN public.rutas r ON r.id = a.ruta_id
    WHERE a.trabajador_id = p_trabajador
      AND a.activa
      AND r.supervisor_id = app.usuario_actual()
  )
$$;

GRANT USAGE ON SCHEMA app TO app_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO app_user;

-- ---------------------------------------------------------------------------
-- registros_tiempo
-- ---------------------------------------------------------------------------
ALTER TABLE public.registros_tiempo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rt_trabajador_select ON public.registros_tiempo;
CREATE POLICY rt_trabajador_select ON public.registros_tiempo
  FOR SELECT TO app_user
  USING (app.rol_actual() = 'trabajador' AND trabajador_id = app.usuario_actual());

DROP POLICY IF EXISTS rt_trabajador_insert ON public.registros_tiempo;
CREATE POLICY rt_trabajador_insert ON public.registros_tiempo
  FOR INSERT TO app_user
  WITH CHECK (
    app.rol_actual() = 'trabajador'
    AND trabajador_id = app.usuario_actual()
    AND estado_validacion = 'PENDIENTE'
  );

-- PATCH /registros-tiempo/{id}/salida: el trabajador solo edita su registro mientras siga PENDIENTE.
DROP POLICY IF EXISTS rt_trabajador_update ON public.registros_tiempo;
CREATE POLICY rt_trabajador_update ON public.registros_tiempo
  FOR UPDATE TO app_user
  USING      (app.rol_actual() = 'trabajador' AND trabajador_id = app.usuario_actual() AND estado_validacion = 'PENDIENTE')
  WITH CHECK (app.rol_actual() = 'trabajador' AND trabajador_id = app.usuario_actual() AND estado_validacion = 'PENDIENTE');

DROP POLICY IF EXISTS rt_supervisor_select ON public.registros_tiempo;
CREATE POLICY rt_supervisor_select ON public.registros_tiempo
  FOR SELECT TO app_user
  USING (app.rol_actual() = 'supervisor' AND app.supervisa_trabajador(trabajador_id));

DROP POLICY IF EXISTS rt_supervisor_update ON public.registros_tiempo;
CREATE POLICY rt_supervisor_update ON public.registros_tiempo
  FOR UPDATE TO app_user
  USING      (app.rol_actual() = 'supervisor' AND app.supervisa_trabajador(trabajador_id))
  WITH CHECK (app.rol_actual() = 'supervisor' AND app.supervisa_trabajador(trabajador_id));

DROP POLICY IF EXISTS rt_admin_all ON public.registros_tiempo;
CREATE POLICY rt_admin_all ON public.registros_tiempo
  FOR ALL TO app_user
  USING      (app.rol_actual() = 'administrador')
  WITH CHECK (app.rol_actual() = 'administrador');

-- ---------------------------------------------------------------------------
-- eventos_diarios (append-only para el trabajador; el supervisor solo atiende)
-- ---------------------------------------------------------------------------
ALTER TABLE public.eventos_diarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ev_trabajador_select ON public.eventos_diarios;
CREATE POLICY ev_trabajador_select ON public.eventos_diarios
  FOR SELECT TO app_user
  USING (app.rol_actual() = 'trabajador' AND trabajador_id = app.usuario_actual());

DROP POLICY IF EXISTS ev_trabajador_insert ON public.eventos_diarios;
CREATE POLICY ev_trabajador_insert ON public.eventos_diarios
  FOR INSERT TO app_user
  WITH CHECK (app.rol_actual() = 'trabajador' AND trabajador_id = app.usuario_actual());

DROP POLICY IF EXISTS ev_supervisor_select ON public.eventos_diarios;
CREATE POLICY ev_supervisor_select ON public.eventos_diarios
  FOR SELECT TO app_user
  USING (app.rol_actual() = 'supervisor' AND app.supervisa_trabajador(trabajador_id));

-- Las columnas editables ya estan limitadas por GRANT UPDATE(estado_atencion, atendido_por, atendido_at) en M006.
DROP POLICY IF EXISTS ev_supervisor_update ON public.eventos_diarios;
CREATE POLICY ev_supervisor_update ON public.eventos_diarios
  FOR UPDATE TO app_user
  USING      (app.rol_actual() = 'supervisor' AND app.supervisa_trabajador(trabajador_id))
  WITH CHECK (app.rol_actual() = 'supervisor' AND app.supervisa_trabajador(trabajador_id));

DROP POLICY IF EXISTS ev_admin_select ON public.eventos_diarios;
CREATE POLICY ev_admin_select ON public.eventos_diarios
  FOR SELECT TO app_user USING (app.rol_actual() = 'administrador');

DROP POLICY IF EXISTS ev_admin_update ON public.eventos_diarios;
CREATE POLICY ev_admin_update ON public.eventos_diarios
  FOR UPDATE TO app_user
  USING (app.rol_actual() = 'administrador') WITH CHECK (app.rol_actual() = 'administrador');

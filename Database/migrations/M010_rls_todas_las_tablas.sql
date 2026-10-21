
CREATE SCHEMA IF NOT EXISTS app;

-- ---------------------------------------------------------------------------
-- 1. Funciones auxiliares para las políticas
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app.rol_de_perfil(p_perfil uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT r.nombre FROM public.perfiles p JOIN public.roles r ON r.id = p.rol_id WHERE p.id = p_perfil
$$;

-- Administrador, o supervisor a cargo de la ruta
CREATE OR REPLACE FUNCTION app.gestiona_ruta(p_ruta uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT app.rol_actual() = 'administrador'
      OR (app.rol_actual() = 'supervisor'
          AND EXISTS (SELECT 1 FROM public.rutas r WHERE r.id = p_ruta AND r.supervisor_id = app.usuario_actual()))
$$;

CREATE OR REPLACE FUNCTION app.gestiona_asignacion(p_asignacion uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.asignaciones_ruta a WHERE a.id = p_asignacion AND app.gestiona_ruta(a.ruta_id))
$$;

CREATE OR REPLACE FUNCTION app.es_mi_asignacion(p_asignacion uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.asignaciones_ruta a WHERE a.id = p_asignacion AND a.trabajador_id = app.usuario_actual())
$$;

-- Dueño del registro de tiempo, su supervisor o el administrador
CREATE OR REPLACE FUNCTION app.ve_registro(p_registro uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.registros_tiempo rt
    WHERE rt.id = p_registro
      AND (rt.trabajador_id = app.usuario_actual()
           OR app.rol_actual() = 'administrador'
           OR (app.rol_actual() = 'supervisor' AND app.supervisa_trabajador(rt.trabajador_id)))
  )
$$;

CREATE OR REPLACE FUNCTION app.es_mi_registro(p_registro uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.registros_tiempo rt WHERE rt.id = p_registro AND rt.trabajador_id = app.usuario_actual())
$$;

CREATE OR REPLACE FUNCTION app.es_mi_detalle(p_detalle uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.planilla_detalle d WHERE d.id = p_detalle AND d.trabajador_id = app.usuario_actual())
$$;

-- ---------------------------------------------------------------------------
-- 2. Funciones del login (se usan antes de tener sesión, sin claims)
-- ---------------------------------------------------------------------------
-- Versión anterior del PR #35, con otra firma
DROP FUNCTION IF EXISTS app.credenciales_por_email(varchar);

-- Datos para iniciar sesión de un perfil activo. Devuelve el hash solo al backend (EXECUTE únicamente para app_user).
CREATE OR REPLACE FUNCTION app.credenciales_por_email(p_email text)
RETURNS TABLE (id uuid, email varchar, nombres varchar, apellidos varchar, debe_cambiar_password boolean,
               rol varchar, password_hash varchar, bloqueado_hasta timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT p.id, p.email, p.nombres, p.apellidos, p.debe_cambiar_password, r.nombre, p.password_hash, p.bloqueado_hasta
  FROM public.perfiles p JOIN public.roles r ON r.id = p.rol_id
  WHERE p.email = p_email AND p.activo
$$;

-- Bloqueo progresivo (ADR-001): un acierto reinicia el contador; un fallo lo suma y, desde el intento
-- p_intentos_bloqueo, bloquea 2^(intentos - p_intentos_bloqueo) minutos con tope de p_bloqueo_max_min.
-- El bloqueo queda en la auditoría (sin contraseñas). Los umbrales los pasa el backend (config/sesion.js).
CREATE OR REPLACE FUNCTION app.registrar_resultado_login(p_perfil uuid, p_exito boolean,
                                                         p_intentos_bloqueo int, p_bloqueo_max_min int)
RETURNS TABLE (intentos_fallidos smallint, bloqueado_hasta timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_intentos smallint;
  v_hasta timestamptz;
BEGIN
  IF p_exito THEN
    UPDATE public.perfiles p SET intentos_fallidos = 0, bloqueado_hasta = NULL
    WHERE p.id = p_perfil AND (p.intentos_fallidos <> 0 OR p.bloqueado_hasta IS NOT NULL);
    RETURN QUERY SELECT 0::smallint, NULL::timestamptz;
    RETURN;
  END IF;

  UPDATE public.perfiles p
  SET intentos_fallidos = LEAST(p.intentos_fallidos + 1, 1000),
      bloqueado_hasta = CASE
        WHEN p.intentos_fallidos + 1 >= p_intentos_bloqueo
        THEN NOW() + make_interval(mins => LEAST(power(2, LEAST(p.intentos_fallidos + 1 - p_intentos_bloqueo, 10)), p_bloqueo_max_min)::int)
        ELSE p.bloqueado_hasta
      END
  WHERE p.id = p_perfil
  RETURNING p.intentos_fallidos, p.bloqueado_hasta INTO v_intentos, v_hasta;

  IF v_intentos >= p_intentos_bloqueo THEN
    INSERT INTO public.auditoria (actor_id, actor_rol, entidad, entidad_id, accion, datos_despues)
    VALUES (p_perfil, app.rol_de_perfil(p_perfil), 'perfiles', p_perfil::text, 'LOGIN',
            jsonb_build_object('resultado', 'BLOQUEADO', 'intentos_fallidos', v_intentos, 'bloqueado_hasta', v_hasta));
  END IF;

  RETURN QUERY SELECT v_intentos, v_hasta;
END;
$$;

-- Cambio de contraseña propia (POST /auth/password): solo sobre el usuario de la sesión. Así perfiles no necesita
-- una política de UPDATE para el propio usuario (que le permitiría cambiar también su rol o su estado).
CREATE OR REPLACE FUNCTION app.cambiar_password(p_perfil uuid, p_hash text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF p_perfil IS DISTINCT FROM app.usuario_actual() THEN
    RAISE EXCEPTION 'Solo se puede cambiar la contraseña del usuario de la sesión' USING ERRCODE = '42501';
  END IF;
  UPDATE public.perfiles p
  SET password_hash = p_hash, debe_cambiar_password = false, intentos_fallidos = 0, bloqueado_hasta = NULL
  WHERE p.id = p_perfil AND p.activo;
  RETURN FOUND;
END;
$$;

-- Solo app_user ejecuta las funciones de app (por defecto PostgreSQL da EXECUTE a PUBLIC)
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA app FROM PUBLIC;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO app_user;

-- ---------------------------------------------------------------------------
-- 3. Activar RLS en las tablas restantes
-- ---------------------------------------------------------------------------
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_descanso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conceptos_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metodos_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estados_trabajador ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rol_permiso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feriados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parametros_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sesiones_refresh ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rutas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ruta_puntos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asignaciones_ruta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acuerdos_turno ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.descansos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarifas_trabajador ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historial_estado_trabajador ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periodos_planilla ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planillas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planilla_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalle_conceptos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 4. Catálogos y configuración: lectura para cualquier sesión; escritura solo del administrador
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS roles_select ON public.roles;
CREATE POLICY roles_select ON public.roles FOR SELECT TO app_user USING (app.usuario_actual() IS NOT NULL);
DROP POLICY IF EXISTS turnos_select ON public.turnos;
CREATE POLICY turnos_select ON public.turnos FOR SELECT TO app_user USING (app.usuario_actual() IS NOT NULL);
DROP POLICY IF EXISTS tipos_descanso_select ON public.tipos_descanso;
CREATE POLICY tipos_descanso_select ON public.tipos_descanso FOR SELECT TO app_user USING (app.usuario_actual() IS NOT NULL);
DROP POLICY IF EXISTS conceptos_pago_select ON public.conceptos_pago;
CREATE POLICY conceptos_pago_select ON public.conceptos_pago FOR SELECT TO app_user USING (app.usuario_actual() IS NOT NULL);
DROP POLICY IF EXISTS metodos_pago_select ON public.metodos_pago;
CREATE POLICY metodos_pago_select ON public.metodos_pago FOR SELECT TO app_user USING (app.usuario_actual() IS NOT NULL);
DROP POLICY IF EXISTS estados_trabajador_select ON public.estados_trabajador;
CREATE POLICY estados_trabajador_select ON public.estados_trabajador FOR SELECT TO app_user USING (app.usuario_actual() IS NOT NULL);
DROP POLICY IF EXISTS permisos_select ON public.permisos;
CREATE POLICY permisos_select ON public.permisos FOR SELECT TO app_user USING (app.usuario_actual() IS NOT NULL);
DROP POLICY IF EXISTS rol_permiso_select ON public.rol_permiso;
CREATE POLICY rol_permiso_select ON public.rol_permiso FOR SELECT TO app_user USING (app.usuario_actual() IS NOT NULL);

DROP POLICY IF EXISTS feriados_select ON public.feriados;
CREATE POLICY feriados_select ON public.feriados FOR SELECT TO app_user USING (app.usuario_actual() IS NOT NULL);
DROP POLICY IF EXISTS feriados_admin_insert ON public.feriados;
CREATE POLICY feriados_admin_insert ON public.feriados FOR INSERT TO app_user WITH CHECK (app.rol_actual() = 'administrador');
DROP POLICY IF EXISTS feriados_admin_delete ON public.feriados;
CREATE POLICY feriados_admin_delete ON public.feriados FOR DELETE TO app_user USING (app.rol_actual() = 'administrador');

DROP POLICY IF EXISTS parametros_select ON public.parametros_pago;
CREATE POLICY parametros_select ON public.parametros_pago FOR SELECT TO app_user USING (app.usuario_actual() IS NOT NULL);
DROP POLICY IF EXISTS parametros_admin_update ON public.parametros_pago;
CREATE POLICY parametros_admin_update ON public.parametros_pago FOR UPDATE TO app_user
  USING (app.rol_actual() = 'administrador') WITH CHECK (app.rol_actual() = 'administrador');

-- ---------------------------------------------------------------------------
-- 5. Personas, sesiones y auditoría
-- ---------------------------------------------------------------------------
-- Cada uno se ve a sí mismo; el supervisor ve a los trabajadores (para asignarlos y ver nombres); el admin, todos.
-- La contraseña propia se cambia con app.cambiar_password (no hay UPDATE para el propio usuario).
DROP POLICY IF EXISTS perfiles_select ON public.perfiles;
CREATE POLICY perfiles_select ON public.perfiles FOR SELECT TO app_user
  USING (id = app.usuario_actual()
         OR app.rol_actual() = 'administrador'
         OR (app.rol_actual() = 'supervisor' AND app.rol_de_perfil(id) = 'trabajador'));
DROP POLICY IF EXISTS perfiles_admin_insert ON public.perfiles;
CREATE POLICY perfiles_admin_insert ON public.perfiles FOR INSERT TO app_user WITH CHECK (app.rol_actual() = 'administrador');
DROP POLICY IF EXISTS perfiles_admin_update ON public.perfiles;
CREATE POLICY perfiles_admin_update ON public.perfiles FOR UPDATE TO app_user
  USING (app.rol_actual() = 'administrador') WITH CHECK (app.rol_actual() = 'administrador');

DROP POLICY IF EXISTS sesiones_propias ON public.sesiones_refresh;
CREATE POLICY sesiones_propias ON public.sesiones_refresh FOR ALL TO app_user
  USING (perfil_id = app.usuario_actual()) WITH CHECK (perfil_id = app.usuario_actual());

-- Cada uno audita solo sus propias acciones; solo el administrador consulta la bitácora; nadie edita ni borra.
DROP POLICY IF EXISTS auditoria_insert ON public.auditoria;
CREATE POLICY auditoria_insert ON public.auditoria FOR INSERT TO app_user WITH CHECK (actor_id = app.usuario_actual());
DROP POLICY IF EXISTS auditoria_admin_select ON public.auditoria;
CREATE POLICY auditoria_admin_select ON public.auditoria FOR SELECT TO app_user USING (app.rol_actual() = 'administrador');

-- ---------------------------------------------------------------------------
-- 6. Rutas, asignaciones y turnos (CU-05, CU-06)
-- ---------------------------------------------------------------------------
-- La API filtra qué rutas ve cada rol; aquí cualquier sesión las lee (las jornadas y /me las necesitan).
DROP POLICY IF EXISTS rutas_select ON public.rutas;
CREATE POLICY rutas_select ON public.rutas FOR SELECT TO app_user USING (app.usuario_actual() IS NOT NULL);
DROP POLICY IF EXISTS rutas_insert ON public.rutas;
CREATE POLICY rutas_insert ON public.rutas FOR INSERT TO app_user
  WITH CHECK (app.rol_actual() = 'administrador' OR (app.rol_actual() = 'supervisor' AND supervisor_id = app.usuario_actual()));
DROP POLICY IF EXISTS rutas_update ON public.rutas;
CREATE POLICY rutas_update ON public.rutas FOR UPDATE TO app_user
  USING (app.rol_actual() = 'administrador' OR (app.rol_actual() = 'supervisor' AND supervisor_id = app.usuario_actual()))
  WITH CHECK (app.rol_actual() = 'administrador' OR (app.rol_actual() = 'supervisor' AND supervisor_id = app.usuario_actual()));

DROP POLICY IF EXISTS ruta_puntos_select ON public.ruta_puntos;
CREATE POLICY ruta_puntos_select ON public.ruta_puntos FOR SELECT TO app_user USING (app.usuario_actual() IS NOT NULL);
DROP POLICY IF EXISTS ruta_puntos_gestion ON public.ruta_puntos;
CREATE POLICY ruta_puntos_gestion ON public.ruta_puntos FOR ALL TO app_user
  USING (app.gestiona_ruta(ruta_id)) WITH CHECK (app.gestiona_ruta(ruta_id));

DROP POLICY IF EXISTS asignaciones_select ON public.asignaciones_ruta;
CREATE POLICY asignaciones_select ON public.asignaciones_ruta FOR SELECT TO app_user
  USING (trabajador_id = app.usuario_actual() OR app.gestiona_ruta(ruta_id));
DROP POLICY IF EXISTS asignaciones_insert ON public.asignaciones_ruta;
CREATE POLICY asignaciones_insert ON public.asignaciones_ruta FOR INSERT TO app_user
  WITH CHECK (app.gestiona_ruta(ruta_id) AND asignado_por = app.usuario_actual());
DROP POLICY IF EXISTS asignaciones_update ON public.asignaciones_ruta;
CREATE POLICY asignaciones_update ON public.asignaciones_ruta FOR UPDATE TO app_user
  USING (app.gestiona_ruta(ruta_id)) WITH CHECK (app.gestiona_ruta(ruta_id));

DROP POLICY IF EXISTS acuerdos_select ON public.acuerdos_turno;
CREATE POLICY acuerdos_select ON public.acuerdos_turno FOR SELECT TO app_user
  USING (app.es_mi_asignacion(asignacion_id) OR app.gestiona_asignacion(asignacion_id));
DROP POLICY IF EXISTS acuerdos_insert ON public.acuerdos_turno;
CREATE POLICY acuerdos_insert ON public.acuerdos_turno FOR INSERT TO app_user
  WITH CHECK (app.gestiona_asignacion(asignacion_id) AND estado = 'PROPUESTO');
-- El trabajador solo responde (ACEPTADO o RECHAZADO); la transición desde PROPUESTO la controla la API.
DROP POLICY IF EXISTS acuerdos_trabajador_update ON public.acuerdos_turno;
CREATE POLICY acuerdos_trabajador_update ON public.acuerdos_turno FOR UPDATE TO app_user
  USING (app.es_mi_asignacion(asignacion_id))
  WITH CHECK (app.es_mi_asignacion(asignacion_id) AND estado IN ('ACEPTADO', 'RECHAZADO') AND confirmado_por IS NULL);
DROP POLICY IF EXISTS acuerdos_gestion_update ON public.acuerdos_turno;
CREATE POLICY acuerdos_gestion_update ON public.acuerdos_turno FOR UPDATE TO app_user
  USING (app.gestiona_asignacion(asignacion_id)) WITH CHECK (app.gestiona_asignacion(asignacion_id));

-- ---------------------------------------------------------------------------
-- 7. Descansos (registros_tiempo y eventos_diarios ya tienen RLS desde M008)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS descansos_select ON public.descansos;
CREATE POLICY descansos_select ON public.descansos FOR SELECT TO app_user USING (app.ve_registro(registro_tiempo_id));
DROP POLICY IF EXISTS descansos_trabajador_insert ON public.descansos;
CREATE POLICY descansos_trabajador_insert ON public.descansos FOR INSERT TO app_user
  WITH CHECK (app.rol_actual() = 'trabajador' AND app.es_mi_registro(registro_tiempo_id));
DROP POLICY IF EXISTS descansos_admin_all ON public.descansos;
CREATE POLICY descansos_admin_all ON public.descansos FOR ALL TO app_user
  USING (app.rol_actual() = 'administrador') WITH CHECK (app.rol_actual() = 'administrador');

-- ---------------------------------------------------------------------------
-- 8. Estados del trabajador y tarifas
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS historial_estado_select ON public.historial_estado_trabajador;
CREATE POLICY historial_estado_select ON public.historial_estado_trabajador FOR SELECT TO app_user
  USING (trabajador_id = app.usuario_actual() OR app.rol_actual() = 'administrador'
         OR (app.rol_actual() = 'supervisor' AND app.supervisa_trabajador(trabajador_id)));
DROP POLICY IF EXISTS historial_estado_insert ON public.historial_estado_trabajador;
CREATE POLICY historial_estado_insert ON public.historial_estado_trabajador FOR INSERT TO app_user
  WITH CHECK (app.rol_actual() = 'administrador' OR (app.rol_actual() = 'supervisor' AND app.supervisa_trabajador(trabajador_id)));
DROP POLICY IF EXISTS historial_estado_update ON public.historial_estado_trabajador;
CREATE POLICY historial_estado_update ON public.historial_estado_trabajador FOR UPDATE TO app_user
  USING (app.rol_actual() = 'administrador' OR (app.rol_actual() = 'supervisor' AND app.supervisa_trabajador(trabajador_id)))
  WITH CHECK (app.rol_actual() = 'administrador' OR (app.rol_actual() = 'supervisor' AND app.supervisa_trabajador(trabajador_id)));

DROP POLICY IF EXISTS tarifas_select ON public.tarifas_trabajador;
CREATE POLICY tarifas_select ON public.tarifas_trabajador FOR SELECT TO app_user
  USING (trabajador_id = app.usuario_actual() OR app.rol_actual() = 'administrador'
         OR (app.rol_actual() = 'supervisor' AND app.supervisa_trabajador(trabajador_id)));
DROP POLICY IF EXISTS tarifas_admin_insert ON public.tarifas_trabajador;
CREATE POLICY tarifas_admin_insert ON public.tarifas_trabajador FOR INSERT TO app_user WITH CHECK (app.rol_actual() = 'administrador');
DROP POLICY IF EXISTS tarifas_admin_update ON public.tarifas_trabajador;
CREATE POLICY tarifas_admin_update ON public.tarifas_trabajador FOR UPDATE TO app_user
  USING (app.rol_actual() = 'administrador') WITH CHECK (app.rol_actual() = 'administrador');

-- ---------------------------------------------------------------------------
-- 9. Planillas y pagos (M005 y permisos de M007: calcular, verificar, aprobar, pagar)
-- Administrador y supervisor calculan y verifican; los triggers de M005 impiden cambiar lo aprobado y las
-- restricciones chk_segreg_* exigen personas distintas. El trabajador solo lee su propio detalle y sus pagos.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS periodos_select ON public.periodos_planilla;
CREATE POLICY periodos_select ON public.periodos_planilla FOR SELECT TO app_user USING (app.rol_actual() IN ('administrador', 'supervisor'));
DROP POLICY IF EXISTS periodos_admin_insert ON public.periodos_planilla;
CREATE POLICY periodos_admin_insert ON public.periodos_planilla FOR INSERT TO app_user WITH CHECK (app.rol_actual() = 'administrador');
DROP POLICY IF EXISTS periodos_update ON public.periodos_planilla;
CREATE POLICY periodos_update ON public.periodos_planilla FOR UPDATE TO app_user
  USING (app.rol_actual() IN ('administrador', 'supervisor')) WITH CHECK (app.rol_actual() IN ('administrador', 'supervisor'));

DROP POLICY IF EXISTS planillas_select ON public.planillas;
CREATE POLICY planillas_select ON public.planillas FOR SELECT TO app_user USING (app.rol_actual() IN ('administrador', 'supervisor'));
DROP POLICY IF EXISTS planillas_insert ON public.planillas;
CREATE POLICY planillas_insert ON public.planillas FOR INSERT TO app_user
  WITH CHECK (app.rol_actual() IN ('administrador', 'supervisor') AND calculada_por = app.usuario_actual());
DROP POLICY IF EXISTS planillas_update ON public.planillas;
CREATE POLICY planillas_update ON public.planillas FOR UPDATE TO app_user
  USING (app.rol_actual() IN ('administrador', 'supervisor')) WITH CHECK (app.rol_actual() IN ('administrador', 'supervisor'));

DROP POLICY IF EXISTS detalle_select ON public.planilla_detalle;
CREATE POLICY detalle_select ON public.planilla_detalle FOR SELECT TO app_user
  USING (trabajador_id = app.usuario_actual() OR app.rol_actual() IN ('administrador', 'supervisor'));
DROP POLICY IF EXISTS detalle_gestion ON public.planilla_detalle;
CREATE POLICY detalle_gestion ON public.planilla_detalle FOR ALL TO app_user
  USING (app.rol_actual() IN ('administrador', 'supervisor')) WITH CHECK (app.rol_actual() IN ('administrador', 'supervisor'));

DROP POLICY IF EXISTS conceptos_select ON public.detalle_conceptos;
CREATE POLICY conceptos_select ON public.detalle_conceptos FOR SELECT TO app_user
  USING (app.es_mi_detalle(detalle_id) OR app.rol_actual() IN ('administrador', 'supervisor'));
DROP POLICY IF EXISTS conceptos_gestion ON public.detalle_conceptos;
CREATE POLICY conceptos_gestion ON public.detalle_conceptos FOR ALL TO app_user
  USING (app.rol_actual() IN ('administrador', 'supervisor')) WITH CHECK (app.rol_actual() IN ('administrador', 'supervisor'));

DROP POLICY IF EXISTS pagos_select ON public.pagos;
CREATE POLICY pagos_select ON public.pagos FOR SELECT TO app_user
  USING (app.rol_actual() = 'administrador' OR app.es_mi_detalle(detalle_id));
DROP POLICY IF EXISTS pagos_admin_insert ON public.pagos;
CREATE POLICY pagos_admin_insert ON public.pagos FOR INSERT TO app_user
  WITH CHECK (app.rol_actual() = 'administrador' AND registrado_por = app.usuario_actual());
DROP POLICY IF EXISTS pagos_admin_update ON public.pagos;
CREATE POLICY pagos_admin_update ON public.pagos FOR UPDATE TO app_user
  USING (app.rol_actual() = 'administrador') WITH CHECK (app.rol_actual() = 'administrador');

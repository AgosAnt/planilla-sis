-- M010: Políticas RLS (Row-Level Security) para todas las tablas

-- 1. FUNCIÓN MAESTRA PARA EL BACKEND 
-- Permite al sistema hacer login saltándose el RLS de forma controlada
CREATE OR REPLACE FUNCTION app.credenciales_por_email(p_email VARCHAR)
RETURNS TABLE(id UUID, password_hash VARCHAR, rol VARCHAR, activo BOOLEAN)
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.password_hash, r.nombre::VARCHAR, p.activo
    FROM public.perfiles p
    JOIN public.roles r ON p.rol_id = r.id
    WHERE p.email = p_email;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION app.credenciales_por_email(VARCHAR) TO app_user;

-- 2. ACTIVAR RLS EN TODAS LAS TABLAS RESTANTES
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
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;

-- 3. POLÍTICAS POR GRUPO 

-- Catálogos (Lectura a todos, escritura solo a admin en feriados)
CREATE POLICY lectura_catalogos_roles ON public.roles FOR SELECT USING (app.usuario_actual() IS NOT NULL);
CREATE POLICY lectura_catalogos_turnos ON public.turnos FOR SELECT USING (app.usuario_actual() IS NOT NULL);
CREATE POLICY lectura_catalogos_tdes ON public.tipos_descanso FOR SELECT USING (app.usuario_actual() IS NOT NULL);
CREATE POLICY lectura_catalogos_cpag ON public.conceptos_pago FOR SELECT USING (app.usuario_actual() IS NOT NULL);
CREATE POLICY lectura_catalogos_mpag ON public.metodos_pago FOR SELECT USING (app.usuario_actual() IS NOT NULL);
CREATE POLICY lectura_catalogos_estr ON public.estados_trabajador FOR SELECT USING (app.usuario_actual() IS NOT NULL);
CREATE POLICY lectura_catalogos_perm ON public.permisos FOR SELECT USING (app.usuario_actual() IS NOT NULL);
CREATE POLICY lectura_catalogos_rper ON public.rol_permiso FOR SELECT USING (app.usuario_actual() IS NOT NULL);
CREATE POLICY lectura_catalogos_feriados ON public.feriados FOR SELECT USING (app.usuario_actual() IS NOT NULL);
CREATE POLICY admin_feriados_mod ON public.feriados USING (app.rol_actual() = 'administrador');

-- Configuración (Lectura a todos, update solo a admin)
CREATE POLICY lectura_parametros ON public.parametros_pago FOR SELECT USING (app.usuario_actual() IS NOT NULL);
CREATE POLICY admin_parametros_update ON public.parametros_pago FOR UPDATE USING (app.rol_actual() = 'administrador');

-- Auditoría (Solo inserta el mismo usuario, solo admin lee)
CREATE POLICY insert_auditoria ON public.auditoria FOR INSERT WITH CHECK (actor_id = app.usuario_actual());
CREATE POLICY admin_auditoria_select ON public.auditoria FOR SELECT USING (app.rol_actual() = 'administrador');

-- Personas (Jerarquía de perfiles y sesiones)
CREATE POLICY perfiles_lectura ON public.perfiles FOR SELECT USING (id = app.usuario_actual() OR app.rol_actual() = 'administrador' OR app.supervisa_trabajador(id));
CREATE POLICY perfiles_escritura ON public.perfiles FOR ALL USING (app.rol_actual() = 'administrador');
CREATE POLICY sesiones_propias ON public.sesiones_refresh USING (perfil_id = app.usuario_actual());

-- Rutas
CREATE POLICY rutas_lectura ON public.rutas FOR SELECT USING (app.usuario_actual() IS NOT NULL);
CREATE POLICY rutas_puntos_lectura ON public.ruta_puntos FOR SELECT USING (app.usuario_actual() IS NOT NULL);
CREATE POLICY rutas_escritura ON public.rutas USING (app.rol_actual() = 'administrador' OR supervisor_id = app.usuario_actual());
CREATE POLICY asignaciones_lectura ON public.asignaciones_ruta FOR SELECT USING (trabajador_id = app.usuario_actual() OR app.rol_actual() = 'administrador' OR EXISTS (SELECT 1 FROM public.rutas r WHERE r.id = ruta_id AND r.supervisor_id = app.usuario_actual()));

-- Jornadas

-- Planillas y Pagos
CREATE POLICY tarifas_lectura ON public.tarifas_trabajador FOR SELECT USING (trabajador_id = app.usuario_actual() OR app.rol_actual() = 'administrador' OR app.supervisa_trabajador(trabajador_id));
CREATE POLICY tarifas_escritura ON public.tarifas_trabajador USING (app.rol_actual() = 'administrador');
CREATE POLICY hist_estado_lectura ON public.historial_estado_trabajador FOR SELECT USING (trabajador_id = app.usuario_actual() OR app.rol_actual() = 'administrador' OR app.supervisa_trabajador(trabajador_id));
CREATE POLICY hist_estado_escritura ON public.historial_estado_trabajador USING (app.rol_actual() = 'administrador' OR app.supervisa_trabajador(trabajador_id));
CREATE POLICY planilla_det_lectura ON public.planilla_detalle FOR SELECT USING (trabajador_id = app.usuario_actual() OR app.rol_actual() IN ('administrador', 'supervisor'));
CREATE POLICY planillas_globales_lectura ON public.planillas FOR SELECT USING (app.rol_actual() IN ('administrador', 'supervisor'));
CREATE POLICY periodos_lectura ON public.periodos_planilla FOR SELECT USING (app.rol_actual() IN ('administrador', 'supervisor'));
CREATE POLICY det_conceptos_lectura ON public.detalle_conceptos FOR SELECT USING (app.rol_actual() IN ('administrador', 'supervisor'));
CREATE POLICY pagos_escritura ON public.pagos USING (app.rol_actual() = 'administrador');
CREATE POLICY acuerdos_lectura ON public.acuerdos_turno FOR SELECT USING (EXISTS (SELECT 1 FROM public.asignaciones_ruta ar WHERE ar.id = asignacion_id AND (ar.trabajador_id = app.usuario_actual() OR app.rol_actual() = 'administrador' OR app.supervisa_trabajador(ar.trabajador_id))));
CREATE POLICY descansos_lectura ON public.descansos FOR SELECT USING (EXISTS (SELECT 1 FROM public.registros_tiempo rt WHERE rt.id = registro_tiempo_id AND (rt.trabajador_id = app.usuario_actual() OR app.rol_actual() = 'administrador' OR app.supervisa_trabajador(rt.trabajador_id))));
CREATE POLICY pagos_lectura ON public.pagos FOR SELECT USING (EXISTS (SELECT 1 FROM public.planilla_detalle pd WHERE pd.id = detalle_id AND pd.trabajador_id = app.usuario_actual()));

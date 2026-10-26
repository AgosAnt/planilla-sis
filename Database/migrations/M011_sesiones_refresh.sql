-- M011: rotación de refresh tokens (ADR-001) sobre la tabla sesiones_refresh de M002.
-- Requiere M002 a M010. Ejecutar con un rol administrador, en una sola transacción:
--   psql -v ON_ERROR_STOP=1 -1 -d <base> -f M011_sesiones_refresh.sql
-- Es idempotente: se puede ejecutar dos veces sin error.
--
-- IMPORTANTE: se aplica (en cada base y en Supabase) ANTES de mergear el PR del backend que implementa
-- POST /auth/refresh (feature/refresh-tokens), porque ese backend llama a app.rotar_sesion_refresh.
--
-- Cada inicio de sesión abre una "familia": la primera fila y todas las que salen de rotarla comparten familia_id,
-- que el backend usa como identificador estable de la sesión (jti del access token, base del token CSRF).
-- Crear la sesión al iniciar sesión, revocarla al salir y revocarlas todas al cambiar la contraseña ocurren con el
-- usuario identificado, así que pasan por la política sesiones_propias de M010. Solo la rotación necesita una función
-- SECURITY DEFINER: al renovar, el backend aún no sabe de quién es el token y el RLS no le dejaría buscarlo.

-- ---------------------------------------------------------------------------
-- 1. Familia de la sesión
-- ---------------------------------------------------------------------------
ALTER TABLE public.sesiones_refresh ADD COLUMN IF NOT EXISTS familia_id uuid;
UPDATE public.sesiones_refresh SET familia_id = id WHERE familia_id IS NULL;
ALTER TABLE public.sesiones_refresh ALTER COLUMN familia_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sesiones_refresh_familia ON public.sesiones_refresh(familia_id) WHERE revocado_at IS NULL;

-- ---------------------------------------------------------------------------
-- 2. Rotación (POST /auth/refresh)
-- ---------------------------------------------------------------------------
-- Recibe el hash (SHA-256) del refresh token presentado y el del nuevo; nunca el token en claro.
-- resultado:
--   OK           se emitió la fila nueva (misma familia) y la anterior quedó reemplazada; devuelve el perfil
--   INVALIDO     el hash no existe
--   EXPIRADO     la fila venció
--   REVOCADO     la sesión se cerró (logout o cambio de contraseña)
--   INACTIVO     el usuario fue desactivado: se revoca la familia
--   CONCURRENTE  el token se rotó hace menos de p_gracia_seg y la sesión sigue abierta (dos pestañas renovando a la
--                vez): no se revoca nada
--   REUSO        el token ya se había rotado antes de la gracia: posible robo. Se revocan TODAS las sesiones
--                del usuario y queda en la auditoría (ADR-001)
CREATE OR REPLACE FUNCTION app.rotar_sesion_refresh(p_hash text, p_nuevo_hash text, p_expira timestamptz,
                                                    p_gracia_seg int, p_ip inet, p_user_agent text)
RETURNS TABLE (resultado text, perfil_id uuid, familia_id uuid, email varchar, nombres varchar, apellidos varchar,
               rol varchar, debe_cambiar_password boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  s public.sesiones_refresh%ROWTYPE;
  v_nueva uuid;
BEGIN
  SELECT * INTO s FROM public.sesiones_refresh sr WHERE sr.token_hash = p_hash FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'INVALIDO'::text, NULL::uuid, NULL::uuid, NULL::varchar, NULL::varchar, NULL::varchar, NULL::varchar, NULL::boolean;
    RETURN;
  END IF;

  IF s.reemplazado_por IS NOT NULL THEN
    -- La gracia solo aplica si la sesión sigue abierta (tras un logout, el token viejo es simplemente REVOCADO)
    IF NOT EXISTS (SELECT 1 FROM public.sesiones_refresh sr WHERE sr.familia_id = s.familia_id AND sr.revocado_at IS NULL)
       AND s.revocado_at > NOW() - make_interval(secs => p_gracia_seg) THEN
      RETURN QUERY SELECT 'REVOCADO'::text, s.perfil_id, s.familia_id, NULL::varchar, NULL::varchar, NULL::varchar, NULL::varchar, NULL::boolean;
      RETURN;
    END IF;
    IF s.revocado_at > NOW() - make_interval(secs => p_gracia_seg) THEN
      RETURN QUERY SELECT 'CONCURRENTE'::text, s.perfil_id, s.familia_id, NULL::varchar, NULL::varchar, NULL::varchar, NULL::varchar, NULL::boolean;
      RETURN;
    END IF;
    UPDATE public.sesiones_refresh sr SET revocado_at = NOW() WHERE sr.perfil_id = s.perfil_id AND sr.revocado_at IS NULL;
    INSERT INTO public.auditoria (actor_id, actor_rol, entidad, entidad_id, accion, datos_despues)
    VALUES (s.perfil_id, app.rol_de_perfil(s.perfil_id), 'sesiones_refresh', s.familia_id::text, 'LOGIN',
            jsonb_build_object('resultado', 'REUSO_REFRESH', 'sesiones_revocadas', 'todas'));
    RETURN QUERY SELECT 'REUSO'::text, s.perfil_id, s.familia_id, NULL::varchar, NULL::varchar, NULL::varchar, NULL::varchar, NULL::boolean;
    RETURN;
  END IF;

  IF s.revocado_at IS NOT NULL THEN
    RETURN QUERY SELECT 'REVOCADO'::text, s.perfil_id, s.familia_id, NULL::varchar, NULL::varchar, NULL::varchar, NULL::varchar, NULL::boolean;
    RETURN;
  END IF;

  IF s.expira_at <= NOW() THEN
    RETURN QUERY SELECT 'EXPIRADO'::text, s.perfil_id, s.familia_id, NULL::varchar, NULL::varchar, NULL::varchar, NULL::varchar, NULL::boolean;
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.perfiles p WHERE p.id = s.perfil_id AND p.activo) THEN
    UPDATE public.sesiones_refresh sr SET revocado_at = NOW() WHERE sr.familia_id = s.familia_id AND sr.revocado_at IS NULL;
    RETURN QUERY SELECT 'INACTIVO'::text, s.perfil_id, s.familia_id, NULL::varchar, NULL::varchar, NULL::varchar, NULL::varchar, NULL::boolean;
    RETURN;
  END IF;

  INSERT INTO public.sesiones_refresh (perfil_id, token_hash, expira_at, ip, user_agent, familia_id)
  VALUES (s.perfil_id, p_nuevo_hash, p_expira, p_ip, p_user_agent, s.familia_id)
  RETURNING id INTO v_nueva;
  UPDATE public.sesiones_refresh sr SET revocado_at = NOW(), reemplazado_por = v_nueva WHERE sr.id = s.id;

  RETURN QUERY
    SELECT 'OK'::text, p.id, s.familia_id, p.email, p.nombres, p.apellidos, r.nombre, p.debe_cambiar_password
    FROM public.perfiles p JOIN public.roles r ON r.id = p.rol_id
    WHERE p.id = s.perfil_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION app.rotar_sesion_refresh(text, text, timestamptz, int, inet, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.rotar_sesion_refresh(text, text, timestamptz, int, inet, text) TO app_user;

-- Pruebas de RLS por rol. Todo corre dentro de una transaccion que termina en ROLLBACK:
-- no deja datos. Ejecutar como administrador:  psql -d <base> -f M008_pruebas_rls.sql
-- Cada linea muestra "esperado" y "obtenido": deben coincidir.
\set ON_ERROR_STOP on
\pset format aligned
BEGIN;

-- Datos de prueba (como administrador, que no esta sujeto a RLS)
INSERT INTO public.perfiles (id,email,password_hash,rol_id,codigo_empleado,nombres,apellidos,documento) VALUES
 ('a0000000-0000-0000-0000-000000000001','t-admin@test','x',1,'T-ADM','Ada','Admin','T-D1'),
 ('a0000000-0000-0000-0000-000000000002','t-sup1@test','x',2,'T-SUP1','Sara','Sup','T-D2'),
 ('a0000000-0000-0000-0000-000000000003','t-sup2@test','x',2,'T-SUP2','Saul','Sup','T-D3'),
 ('a0000000-0000-0000-0000-000000000004','t-w1@test','x',3,'T-W1','Walter','Uno','T-D4'),
 ('a0000000-0000-0000-0000-000000000005','t-w2@test','x',3,'T-W2','Wanda','Dos','T-D5');
INSERT INTO public.rutas (id,codigo,nombre,supervisor_id) VALUES
 ('b0000000-0000-0000-0000-000000000001','T-R1','Ruta 1','a0000000-0000-0000-0000-000000000002'),
 ('b0000000-0000-0000-0000-000000000002','T-R2','Ruta 2','a0000000-0000-0000-0000-000000000003');
INSERT INTO public.asignaciones_ruta (ruta_id,trabajador_id,asignado_por,fecha_inicio) VALUES
 ('b0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000001','2026-01-01'),
 ('b0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000001','2026-01-01');
INSERT INTO public.registros_tiempo (trabajador_id,ingreso_at,salida_at,client_uuid) VALUES
 ('a0000000-0000-0000-0000-000000000004','2026-10-01 13:00+00','2026-10-01 21:00+00',gen_random_uuid()),
 ('a0000000-0000-0000-0000-000000000005','2026-10-01 13:00+00','2026-10-01 21:00+00',gen_random_uuid());
INSERT INTO public.eventos_diarios (client_uuid,trabajador_id,tipo_evento,ocurrido_en) VALUES
 (gen_random_uuid(),'a0000000-0000-0000-0000-000000000004','NOTA',now()),
 (gen_random_uuid(),'a0000000-0000-0000-0000-000000000005','NOTA',now());

-- A partir de aqui actuamos como el rol de la aplicacion (el mismo que usa el backend)
SET LOCAL ROLE app_user;

\echo
\echo '=== POLITICA 1: registros_tiempo ==='
SELECT set_config('app.jwt_claims','{}',true) \gset
SELECT 'sin claims: ve 0 registros' AS prueba, 0 AS esperado, count(*) AS obtenido
FROM public.registros_tiempo WHERE client_uuid IS NOT NULL AND trabajador_id::text LIKE 'a0000000%';

SELECT set_config('app.jwt_claims','{"sub":"a0000000-0000-0000-0000-000000000004","rol":"trabajador"}',true) \gset
SELECT 'trabajador W1: ve solo su registro' AS prueba, 1 AS esperado, count(*) AS obtenido
FROM public.registros_tiempo WHERE trabajador_id::text LIKE 'a0000000%';

DO $$ BEGIN
  INSERT INTO public.registros_tiempo (trabajador_id,ingreso_at,client_uuid)
  VALUES ('a0000000-0000-0000-0000-000000000005', now(), gen_random_uuid());
  RAISE NOTICE 'FALLO: W1 pudo insertar un registro a nombre de W2';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'OK: W1 no puede insertar registros a nombre de otro trabajador';
END $$;

WITH u AS (UPDATE public.registros_tiempo SET observaciones='cierre de jornada'
           WHERE trabajador_id='a0000000-0000-0000-0000-000000000004' RETURNING 1)
SELECT 'W1 edita su registro PENDIENTE (PATCH salida)' AS prueba, 1 AS esperado, count(*) AS obtenido FROM u;

SELECT set_config('app.jwt_claims','{"sub":"a0000000-0000-0000-0000-000000000002","rol":"supervisor"}',true) \gset
SELECT 'supervisor SUP1: ve solo a W1 (su ruta)' AS prueba, 1 AS esperado, count(*) AS obtenido
FROM public.registros_tiempo WHERE trabajador_id::text LIKE 'a0000000%';

WITH u AS (UPDATE public.registros_tiempo SET estado_validacion='APROBADA'
           WHERE trabajador_id='a0000000-0000-0000-0000-000000000004' RETURNING 1)
SELECT 'SUP1 valida registro de W1 (su trabajador)' AS prueba, 1 AS esperado, count(*) AS obtenido FROM u;

WITH u AS (UPDATE public.registros_tiempo SET estado_validacion='APROBADA'
           WHERE trabajador_id='a0000000-0000-0000-0000-000000000005' RETURNING 1)
SELECT 'SUP1 intenta validar registro de W2 (ruta ajena)' AS prueba, 0 AS esperado, count(*) AS obtenido FROM u;

SELECT set_config('app.jwt_claims','{"sub":"a0000000-0000-0000-0000-000000000004","rol":"trabajador"}',true) \gset
WITH u AS (UPDATE public.registros_tiempo SET observaciones='intento'
           WHERE trabajador_id='a0000000-0000-0000-0000-000000000004' RETURNING 1)
SELECT 'W1 edita su registro YA APROBADO (debe bloquearse)' AS prueba, 0 AS esperado, count(*) AS obtenido FROM u;

SELECT set_config('app.jwt_claims','{"sub":"a0000000-0000-0000-0000-000000000001","rol":"administrador"}',true) \gset
SELECT 'administrador: ve ambos registros' AS prueba, 2 AS esperado, count(*) AS obtenido
FROM public.registros_tiempo WHERE trabajador_id::text LIKE 'a0000000%';

\echo
\echo '=== POLITICA 2: eventos_diarios ==='
SELECT set_config('app.jwt_claims','{"sub":"a0000000-0000-0000-0000-000000000004","rol":"trabajador"}',true) \gset
SELECT 'trabajador W1: ve solo su evento' AS prueba, 1 AS esperado, count(*) AS obtenido
FROM public.eventos_diarios WHERE trabajador_id::text LIKE 'a0000000%';

WITH u AS (UPDATE public.eventos_diarios SET estado_atencion='ATENDIDO'
           WHERE trabajador_id='a0000000-0000-0000-0000-000000000004' RETURNING 1)
SELECT 'W1 intenta cambiar estado_atencion (append-only)' AS prueba, 0 AS esperado, count(*) AS obtenido FROM u;

SELECT set_config('app.jwt_claims','{"sub":"a0000000-0000-0000-0000-000000000003","rol":"supervisor"}',true) \gset
SELECT 'supervisor SUP2: ve solo el evento de W2' AS prueba, 1 AS esperado, count(*) AS obtenido
FROM public.eventos_diarios WHERE trabajador_id::text LIKE 'a0000000%';

WITH u AS (UPDATE public.eventos_diarios SET estado_atencion='EN_ATENCION'
           WHERE trabajador_id='a0000000-0000-0000-0000-000000000005' RETURNING 1)
SELECT 'SUP2 atiende evento de W2 (su trabajador)' AS prueba, 1 AS esperado, count(*) AS obtenido FROM u;

WITH u AS (UPDATE public.eventos_diarios SET estado_atencion='EN_ATENCION'
           WHERE trabajador_id='a0000000-0000-0000-0000-000000000004' RETURNING 1)
SELECT 'SUP2 intenta atender evento de W1 (ruta ajena)' AS prueba, 0 AS esperado, count(*) AS obtenido FROM u;

RESET ROLE;
ROLLBACK;
\echo
\echo 'Listo: ROLLBACK aplicado, sin datos residuales.'

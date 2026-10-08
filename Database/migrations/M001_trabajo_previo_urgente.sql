-- M001: Índice parcial de jornada abierta para evitar registros duplicados
CREATE UNIQUE INDEX IF NOT EXISTS registros_uno_abierto 
ON public.registros_tiempo (trabajador_id) 
WHERE salida_at IS NULL;

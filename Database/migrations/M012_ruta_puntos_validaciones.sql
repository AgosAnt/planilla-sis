-- M012: validaciones de los puntos de la geocerca (ruta_puntos, M003).
-- La API (PUT /rutas/{rutaId}/puntos) valida lo mismo; estas restricciones son la segunda barrera para que
-- un punto con coordenadas imposibles o un radio absurdo no deje a la app móvil marcando desde cualquier lugar.
-- El RLS de la tabla ya está en M010 (ruta_puntos_select y ruta_puntos_gestion). Se puede ejecutar más de una vez.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conrelid = 'public.ruta_puntos'::regclass AND conname = 'chk_ruta_puntos_coordenadas') THEN
    ALTER TABLE public.ruta_puntos ADD CONSTRAINT chk_ruta_puntos_coordenadas
      CHECK (latitud BETWEEN -90 AND 90 AND longitud BETWEEN -180 AND 180);
  END IF;

  -- 10 m: menos que la precisión de un GPS de teléfono. 5000 m: más ya no es un punto de control.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conrelid = 'public.ruta_puntos'::regclass AND conname = 'chk_ruta_puntos_radio') THEN
    ALTER TABLE public.ruta_puntos ADD CONSTRAINT chk_ruta_puntos_radio CHECK (radio_m BETWEEN 10 AND 5000);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conrelid = 'public.ruta_puntos'::regclass AND conname = 'chk_ruta_puntos_orden') THEN
    ALTER TABLE public.ruta_puntos ADD CONSTRAINT chk_ruta_puntos_orden CHECK (orden >= 1);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conrelid = 'public.ruta_puntos'::regclass AND conname = 'chk_ruta_puntos_nombre') THEN
    ALTER TABLE public.ruta_puntos ADD CONSTRAINT chk_ruta_puntos_nombre CHECK (btrim(nombre) <> '');
  END IF;
END
$$;

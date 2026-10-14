CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE TABLE IF NOT EXISTS public.tarifas_trabajador (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), trabajador_id UUID NOT NULL REFERENCES public.perfiles(id),
 monto_hora NUMERIC(10,2) NOT NULL CHECK(monto_hora>=0), monto_hora_extra NUMERIC(10,2) CHECK(monto_hora_extra>=0),
 moneda VARCHAR(3) NOT NULL DEFAULT 'GTQ', vigente_desde DATE NOT NULL, vigente_hasta DATE,
 creado_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CONSTRAINT chk_fechas_tarifas CHECK(vigente_hasta IS NULL OR vigente_hasta>=vigente_desde),
 CONSTRAINT sin_solapamiento_tarifas EXCLUDE USING gist (trabajador_id WITH =,daterange(vigente_desde,COALESCE(vigente_hasta,'infinity'::date),'[]') WITH &&)
);
CREATE TABLE IF NOT EXISTS public.parametros_pago (
 id SMALLINT PRIMARY KEY DEFAULT 1 CHECK(id=1), factor_hora_extra NUMERIC(4,2) NOT NULL DEFAULT 1.50,
 factor_hora_nocturna NUMERIC(4,2) NOT NULL DEFAULT 1.25, minutos_tolerancia_llegada INT NOT NULL DEFAULT 10,
 regla_redondeo VARCHAR(20) NOT NULL DEFAULT 'EXACTO' CHECK(regla_redondeo IN ('EXACTO','CADA_15_MIN','CADA_30_MIN')),
 actualizado_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO public.parametros_pago(id) VALUES(1) ON CONFLICT(id) DO NOTHING;
CREATE TABLE IF NOT EXISTS public.periodos_planilla (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), codigo VARCHAR(50) NOT NULL UNIQUE,
 fecha_inicio DATE NOT NULL, fecha_fin DATE NOT NULL,
 estado VARCHAR(20) NOT NULL DEFAULT 'BORRADOR' CHECK(estado IN ('BORRADOR','EN_CALCULO','CERRADO','PAGADO')),
 creado_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), CONSTRAINT chk_fechas_periodo CHECK(fecha_fin>=fecha_inicio),
 UNIQUE(fecha_inicio,fecha_fin)
);
CREATE TABLE IF NOT EXISTS public.planillas (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), periodo_id UUID NOT NULL REFERENCES public.periodos_planilla(id),
 ruta_id UUID REFERENCES public.rutas(id), estado VARCHAR(20) NOT NULL DEFAULT 'CALCULADA' CHECK(estado IN ('CALCULADA','VERIFICADA','APROBADA','PAGADA')),
 calculada_por UUID NOT NULL REFERENCES public.perfiles(id), calculada_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 verificada_por UUID REFERENCES public.perfiles(id), verificada_at TIMESTAMPTZ,
 aprobada_por UUID REFERENCES public.perfiles(id), aprobada_at TIMESTAMPTZ, hash_integridad TEXT,
 CONSTRAINT chk_segreg_calc_verif CHECK(verificada_por IS NULL OR calculada_por<>verificada_por),
 CONSTRAINT chk_segreg_calc_aprob CHECK(aprobada_por IS NULL OR calculada_por<>aprobada_por),
 CONSTRAINT chk_segreg_verif_aprob CHECK(verificada_por IS NULL OR aprobada_por IS NULL OR verificada_por<>aprobada_por),
 CONSTRAINT chk_planilla_campos_estado CHECK(
  (estado='CALCULADA' OR (verificada_por IS NOT NULL AND verificada_at IS NOT NULL))
  AND (estado IN ('CALCULADA','VERIFICADA') OR (aprobada_por IS NOT NULL AND aprobada_at IS NOT NULL AND hash_integridad IS NOT NULL))
 ),
 CONSTRAINT uq_planilla_periodo_ruta UNIQUE NULLS NOT DISTINCT(periodo_id,ruta_id)
);
CREATE TABLE IF NOT EXISTS public.planilla_detalle (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), planilla_id UUID NOT NULL REFERENCES public.planillas(id) ON DELETE CASCADE,
 trabajador_id UUID NOT NULL REFERENCES public.perfiles(id), horas_ordinarias NUMERIC(6,2) NOT NULL DEFAULT 0,
 horas_extra_diurnas NUMERIC(6,2) NOT NULL DEFAULT 0, horas_extra_nocturnas NUMERIC(6,2) NOT NULL DEFAULT 0,
 monto_bruto NUMERIC(10,2) NOT NULL DEFAULT 0, total_bonificaciones NUMERIC(10,2) NOT NULL DEFAULT 0,
 total_deducciones NUMERIC(10,2) NOT NULL DEFAULT 0, neto NUMERIC(10,2) NOT NULL DEFAULT 0,
 calculo_detalle JSONB NOT NULL DEFAULT '{}'::jsonb, UNIQUE(planilla_id,trabajador_id)
);
CREATE INDEX IF NOT EXISTS idx_planilla_detalle_trabajador ON public.planilla_detalle(trabajador_id);
CREATE TABLE IF NOT EXISTS public.conceptos_pago (
 id SMALLINT PRIMARY KEY, codigo VARCHAR(20) NOT NULL UNIQUE, nombre VARCHAR(100) NOT NULL,
 tipo VARCHAR(20) NOT NULL CHECK(tipo IN ('BONIFICACION','DEDUCCION')), es_ley BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO public.conceptos_pago VALUES
 (1,'BONO_LEY','Bonificación Incentivo Ley','BONIFICACION',true),
 (2,'IGSS','Cuota Laboral IGSS','DEDUCCION',true),(3,'ISR','Retención ISR Salarios','DEDUCCION',true)
ON CONFLICT(id) DO NOTHING;
CREATE TABLE IF NOT EXISTS public.detalle_conceptos (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), detalle_id UUID NOT NULL REFERENCES public.planilla_detalle(id) ON DELETE CASCADE,
 concepto_id SMALLINT NOT NULL REFERENCES public.conceptos_pago(id), monto NUMERIC(10,2) NOT NULL CHECK(monto>=0), observacion TEXT
);
CREATE INDEX IF NOT EXISTS idx_detalle_conceptos_detalle ON public.detalle_conceptos(detalle_id);
CREATE TABLE IF NOT EXISTS public.metodos_pago (id SMALLINT PRIMARY KEY,nombre VARCHAR(50) NOT NULL);
INSERT INTO public.metodos_pago VALUES(1,'Transferencia Bancaria'),(2,'Cheque'),(3,'Efectivo') ON CONFLICT(id) DO NOTHING;
CREATE TABLE IF NOT EXISTS public.pagos (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), detalle_id UUID NOT NULL REFERENCES public.planilla_detalle(id),
 metodo_pago_id SMALLINT NOT NULL REFERENCES public.metodos_pago(id),
 estado VARCHAR(20) NOT NULL DEFAULT 'PROCESADO' CHECK(estado IN ('PROCESADO','RECHAZADO','ANULADO')),
 referencia_transaccion VARCHAR(100), monto_pagado NUMERIC(10,2) NOT NULL CHECK(monto_pagado>0),
 pagado_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), registrado_por UUID NOT NULL REFERENCES public.perfiles(id)
);
CREATE INDEX IF NOT EXISTS idx_pagos_detalle ON public.pagos(detalle_id);
CREATE UNIQUE INDEX IF NOT EXISTS pagos_uno_procesado_por_detalle ON public.pagos(detalle_id) WHERE estado='PROCESADO';

-- Bloqueos con FOR UPDATE serializan aprobaciones y ediciones concurrentes.
CREATE OR REPLACE FUNCTION public.fn_planilla_detalle_inmutable() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE v_estado TEXT; v_id UUID;
BEGIN
 IF TG_OP IN ('UPDATE','DELETE') THEN
  SELECT p.estado INTO v_estado FROM public.planillas p WHERE p.id=OLD.planilla_id FOR UPDATE;
  IF v_estado IN ('APROBADA','PAGADA') THEN RAISE EXCEPTION 'RN-07: planilla % inmutable',v_estado; END IF;
 END IF;
 IF TG_OP IN ('INSERT','UPDATE') THEN
  SELECT p.estado INTO v_estado FROM public.planillas p WHERE p.id=NEW.planilla_id FOR UPDATE;
  IF v_estado IN ('APROBADA','PAGADA') THEN RAISE EXCEPTION 'RN-07: planilla % inmutable',v_estado; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE TRIGGER trg_planilla_detalle_inmutable BEFORE INSERT OR UPDATE OR DELETE ON public.planilla_detalle FOR EACH ROW EXECUTE FUNCTION public.fn_planilla_detalle_inmutable();
CREATE OR REPLACE FUNCTION public.fn_detalle_conceptos_inmutable() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE v_estado TEXT; v_planilla UUID;
BEGIN
 IF TG_OP IN ('UPDATE','DELETE') THEN
  SELECT planilla_id INTO v_planilla FROM public.planilla_detalle WHERE id=OLD.detalle_id;
  SELECT estado INTO v_estado FROM public.planillas WHERE id=v_planilla FOR UPDATE;
  IF v_estado IN ('APROBADA','PAGADA') THEN RAISE EXCEPTION 'RN-07: conceptos inmutables'; END IF;
 END IF;
 IF TG_OP IN ('INSERT','UPDATE') THEN
  SELECT planilla_id INTO v_planilla FROM public.planilla_detalle WHERE id=NEW.detalle_id;
  SELECT estado INTO v_estado FROM public.planillas WHERE id=v_planilla FOR UPDATE;
  IF v_estado IN ('APROBADA','PAGADA') THEN RAISE EXCEPTION 'RN-07: conceptos inmutables'; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE TRIGGER trg_detalle_conceptos_inmutable BEFORE INSERT OR UPDATE OR DELETE ON public.detalle_conceptos FOR EACH ROW EXECUTE FUNCTION public.fn_detalle_conceptos_inmutable();
CREATE OR REPLACE FUNCTION public.fn_planillas_inmutable() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF TG_OP='DELETE' THEN
  IF OLD.estado IN ('APROBADA','PAGADA') THEN RAISE EXCEPTION 'RN-07: no borrar planilla %',OLD.estado; END IF;
  RETURN OLD;
 END IF;
 IF OLD.estado='PAGADA' THEN RAISE EXCEPTION 'RN-07: planilla PAGADA inmutable'; END IF;
 IF OLD.estado='APROBADA' AND (NEW.estado<>'PAGADA' OR (to_jsonb(OLD)-'estado') IS DISTINCT FROM (to_jsonb(NEW)-'estado')) THEN
  RAISE EXCEPTION 'RN-07: solo APROBADA -> PAGADA sin otros cambios';
 END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE TRIGGER trg_planillas_inmutable BEFORE UPDATE OR DELETE ON public.planillas FOR EACH ROW EXECUTE FUNCTION public.fn_planillas_inmutable();
CREATE OR REPLACE FUNCTION public.fn_pagos_validar() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE v_estado TEXT; v_neto NUMERIC; v_planilla UUID;
BEGIN
 IF NEW.estado='PROCESADO' THEN
  SELECT d.planilla_id,d.neto INTO v_planilla,v_neto FROM public.planilla_detalle d WHERE d.id=NEW.detalle_id;
  SELECT estado INTO v_estado FROM public.planillas WHERE id=v_planilla FOR UPDATE;
  IF v_estado IS NULL OR v_estado NOT IN ('APROBADA','PAGADA') THEN RAISE EXCEPTION 'Solo pagos de planillas aprobadas'; END IF;
  IF NEW.monto_pagado<>v_neto THEN RAISE EXCEPTION 'Monto % distinto del neto %',NEW.monto_pagado,v_neto; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE TRIGGER trg_pagos_validar BEFORE INSERT OR UPDATE ON public.pagos FOR EACH ROW EXECUTE FUNCTION public.fn_pagos_validar();

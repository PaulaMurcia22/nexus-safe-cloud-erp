-- Extiende sedes internas para representar sedes de clientes sin asumir propiedad del origen.
DO $$
DECLARE constraint_row RECORD;
BEGIN
  IF to_regclass('public.sites') IS NULL THEN
    RAISE EXCEPTION 'Ejecute 04_Create_network_domain.sql antes de 05_Alter_sites_customer_scope.sql';
  END IF;

  -- Consulta las restricciones efectivamente instaladas y quita solo el CHECK de códigos fijos.
  FOR constraint_row IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.sites'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE ANY (ARRAY['%MEDELLIN%', '%BOGOTA%', '%REMOTE_SHARED%'])
  LOOP
    EXECUTE format('ALTER TABLE public.sites DROP CONSTRAINT %I', constraint_row.conname);
  END LOOP;

  -- Descubre el nombre real de UNIQUE(code); no depende del nombre autogenerado.
  FOR constraint_row IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.sites'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) = 'UNIQUE (code)'
  LOOP
    EXECUTE format('ALTER TABLE public.sites DROP CONSTRAINT %I', constraint_row.conname);
  END LOOP;
END $$;

ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS kind VARCHAR(20) NOT NULL DEFAULT 'INTERNAL_OFFICE';
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS data_origin VARCHAR(10) NOT NULL DEFAULT 'MANUAL';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.sites'::regclass AND conname='ck_sites_kind') THEN
    ALTER TABLE public.sites ADD CONSTRAINT ck_sites_kind CHECK (kind IN ('INTERNAL_OFFICE','CLIENT_SITE'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.sites'::regclass AND conname='ck_sites_data_origin') THEN
    ALTER TABLE public.sites ADD CONSTRAINT ck_sites_data_origin CHECK (data_origin IN ('IMPORTED','SYNTHETIC','MANUAL'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.sites'::regclass AND conname='ck_sites_customer_scope') THEN
    ALTER TABLE public.sites ADD CONSTRAINT ck_sites_customer_scope CHECK ((kind='INTERNAL_OFFICE' AND customer_id IS NULL) OR (kind='CLIENT_SITE' AND customer_id IS NOT NULL));
  END IF;
END $$;

UPDATE public.sites
SET kind='INTERNAL_OFFICE', customer_id=NULL
WHERE code IN ('MEDELLIN','BOGOTA','REMOTE_SHARED');

CREATE UNIQUE INDEX IF NOT EXISTS ux_sites_scope_code
  ON public.sites ((COALESCE(customer_id,'00000000-0000-0000-0000-000000000000'::uuid)), code);

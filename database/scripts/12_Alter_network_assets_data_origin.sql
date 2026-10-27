-- Compatibilidad para bases creadas antes de incluir data_origin en 04_Create_network_domain.sql.
-- En instalaciones nuevas, 04 crea la columna; esta migración queda como no-op.
-- En bases existentes, conserva filas y clasifica las actuales como MANUAL.
ALTER TABLE public.network_assets
  ADD COLUMN IF NOT EXISTS data_origin VARCHAR(10) NOT NULL DEFAULT 'MANUAL';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.network_assets'::regclass
      AND conname = 'ck_network_assets_data_origin'
  ) THEN
    ALTER TABLE public.network_assets
      ADD CONSTRAINT ck_network_assets_data_origin
      CHECK (data_origin IN ('IMPORTED', 'SYNTHETIC', 'MANUAL'));
  END IF;
END $$;

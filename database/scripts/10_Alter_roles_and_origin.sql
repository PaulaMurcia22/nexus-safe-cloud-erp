ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS data_origin VARCHAR(10) NOT NULL DEFAULT 'MANUAL';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS data_origin VARCHAR(10) NOT NULL DEFAULT 'MANUAL';

DO $$
DECLARE constraint_row RECORD;
BEGIN
  FOR constraint_row IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid='public.users'::regclass
      AND contype='c'
      AND pg_get_constraintdef(oid) ILIKE '%role%'
      AND pg_get_constraintdef(oid) ILIKE '%ADMIN%'
  LOOP
    EXECUTE format('ALTER TABLE public.users DROP CONSTRAINT %I', constraint_row.conname);
  END LOOP;

  FOR constraint_row IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid='public.projects'::regclass
      AND contype='c'
      AND pg_get_constraintdef(oid) ILIKE '%service_type%'
      AND pg_get_constraintdef(oid) ILIKE '%SOFTWARE_DEVELOPMENT%'
  LOOP
    EXECUTE format('ALTER TABLE public.projects DROP CONSTRAINT %I', constraint_row.conname);
  END LOOP;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.users'::regclass AND conname='ck_users_role') THEN
    ALTER TABLE public.users ADD CONSTRAINT ck_users_role CHECK (role IN ('ADMIN','MANAGEMENT','COMMERCIAL','FINANCE','IT_OPERATIONS','PMO','TECHNICIAN'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.projects'::regclass AND conname='ck_projects_service_type') THEN
    ALTER TABLE public.projects ADD CONSTRAINT ck_projects_service_type CHECK (service_type IN ('SOFTWARE_DEVELOPMENT','INFRASTRUCTURE_SUPPORT','CLOUD_CONSULTING','CYBERSECURITY','MANAGED_MONITORING'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.clients'::regclass AND conname='ck_clients_data_origin') THEN
    ALTER TABLE public.clients ADD CONSTRAINT ck_clients_data_origin CHECK (data_origin IN ('IMPORTED','SYNTHETIC','MANUAL'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.projects'::regclass AND conname='ck_projects_data_origin') THEN
    ALTER TABLE public.projects ADD CONSTRAINT ck_projects_data_origin CHECK (data_origin IN ('IMPORTED','SYNTHETIC','MANUAL'));
  END IF;
END $$;

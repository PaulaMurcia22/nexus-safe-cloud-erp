-- Directorio laboral interno. No almacena identificaciones, datos bancarios ni salarios.
CREATE TABLE IF NOT EXISTS public.hr_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_number VARCHAR(24) NOT NULL UNIQUE,
  full_name VARCHAR(160) NOT NULL CHECK (length(trim(full_name)) >= 2),
  work_email VARCHAR(254) NOT NULL UNIQUE,
  job_title VARCHAR(120) NOT NULL,
  department VARCHAR(80) NOT NULL,
  office_location VARCHAR(24) NOT NULL CHECK (office_location IN ('MEDELLIN','BOGOTA','REMOTE_SHARED')),
  start_date DATE NOT NULL,
  status VARCHAR(12) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ON_LEAVE','INACTIVE')),
  contract_type VARCHAR(16) NOT NULL CHECK (contract_type IN ('FULL_TIME','FIXED_TERM','CONTRACTOR','PART_TIME')),
  data_origin VARCHAR(10) NOT NULL DEFAULT 'MANUAL' CHECK (data_origin IN ('IMPORTED','SYNTHETIC','MANUAL')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_hr_employees_status_department ON public.hr_employees(status,department);
CREATE INDEX IF NOT EXISTS ix_hr_employees_location ON public.hr_employees(office_location);

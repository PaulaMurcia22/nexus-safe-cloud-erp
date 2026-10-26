CREATE TABLE IF NOT EXISTS public.findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.network_assets(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  contract_id UUID REFERENCES public.service_contracts(id) ON UPDATE CASCADE ON DELETE SET NULL,
  kind VARCHAR(40) NOT NULL,
  signal_key VARCHAR(120) NOT NULL,
  severity VARCHAR(10) NOT NULL CHECK (severity IN ('CRITICAL','HIGH','MEDIUM','LOW')),
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','ACKNOWLEDGED','IN_PROGRESS','RESOLVED','WONT_FIX')),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  description TEXT,
  data_origin VARCHAR(10) NOT NULL DEFAULT 'MANUAL' CHECK (data_origin IN ('IMPORTED','SYNTHETIC','MANUAL')),
  extra JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_findings_open_identity
  ON public.findings(asset_id, kind, signal_key)
  WHERE status IN ('OPEN','ACKNOWLEDGED','IN_PROGRESS');
CREATE INDEX IF NOT EXISTS ix_findings_status_severity ON public.findings(status, severity, detected_at DESC);

CREATE TABLE IF NOT EXISTS public.work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(40) NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  site_id UUID REFERENCES public.sites(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  contract_id UUID REFERENCES public.service_contracts(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  finding_id UUID REFERENCES public.findings(id) ON UPDATE CASCADE ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE SET NULL,
  assigned_user_id UUID REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  title VARCHAR(180) NOT NULL,
  description TEXT,
  status VARCHAR(16) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_PROGRESS','BLOCKED','COMPLETED','CANCELLED')),
  estimated_hours NUMERIC(8,2) CHECK (estimated_hours IS NULL OR estimated_hours >= 0),
  billable BOOLEAN NOT NULL DEFAULT TRUE,
  data_origin VARCHAR(10) NOT NULL DEFAULT 'MANUAL' CHECK (data_origin IN ('IMPORTED','SYNTHETIC','MANUAL')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON UPDATE CASCADE ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  entry_date DATE NOT NULL,
  hours NUMERIC(5,2) NOT NULL CHECK (hours > 0 AND hours <= 24),
  description TEXT NOT NULL,
  data_origin VARCHAR(10) NOT NULL DEFAULT 'MANUAL' CHECK (data_origin IN ('IMPORTED','SYNTHETIC','MANUAL')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  name VARCHAR(180) NOT NULL,
  description TEXT,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  status VARCHAR(10) NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED','CLOSED','INVOICED')),
  closed_at TIMESTAMPTZ,
  data_origin VARCHAR(10) NOT NULL DEFAULT 'MANUAL' CHECK (data_origin IN ('IMPORTED','SYNTHETIC','MANUAL')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, name)
);

CREATE INDEX IF NOT EXISTS ix_work_orders_assignment ON public.work_orders(assigned_user_id, status);
CREATE INDEX IF NOT EXISTS ix_time_entries_order_date ON public.time_entries(work_order_id, entry_date);
CREATE UNIQUE INDEX IF NOT EXISTS ux_time_entries_synthetic_identity
  ON public.time_entries(work_order_id,user_id,entry_date,description)
  WHERE data_origin='SYNTHETIC';

CREATE TABLE IF NOT EXISTS public.monitoring_signal_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(100) NOT NULL,
  equipment_type VARCHAR(180) NOT NULL UNIQUE,
  signals JSONB NOT NULL DEFAULT '[]'::jsonb,
  data_type VARCHAR(100),
  protocols JSONB NOT NULL DEFAULT '[]'::jsonb,
  ports JSONB NOT NULL DEFAULT '[]'::jsonb,
  suggested_platform VARCHAR(180),
  priority VARCHAR(10) NOT NULL CHECK (priority IN ('HIGH','MEDIUM','LOW')),
  notes TEXT,
  source_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_row INTEGER,
  data_origin VARCHAR(10) NOT NULL DEFAULT 'IMPORTED' CHECK (data_origin IN ('IMPORTED','SYNTHETIC','MANUAL')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.catalog_type_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_category VARCHAR(40) NOT NULL,
  asset_model VARCHAR(180) NOT NULL DEFAULT '*',
  equipment_type VARCHAR(180) NOT NULL REFERENCES public.monitoring_signal_catalog(equipment_type) ON UPDATE CASCADE ON DELETE RESTRICT,
  confidence VARCHAR(10) NOT NULL CHECK (confidence IN ('HIGH','MEDIUM','LOW')),
  mapping_basis TEXT NOT NULL,
  data_origin VARCHAR(10) NOT NULL DEFAULT 'MANUAL' CHECK (data_origin IN ('IMPORTED','SYNTHETIC','MANUAL')),
  UNIQUE(asset_category, asset_model, equipment_type)
);

CREATE TABLE IF NOT EXISTS public.service_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  site_id UUID REFERENCES public.sites(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  code VARCHAR(40) NOT NULL UNIQUE,
  status VARCHAR(10) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','ACTIVE','ENDED')),
  starts_on DATE NOT NULL,
  ends_on DATE,
  monthly_fee NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (monthly_fee >= 0),
  data_origin VARCHAR(10) NOT NULL DEFAULT 'MANUAL' CHECK (data_origin IN ('IMPORTED','SYNTHETIC','MANUAL')),
  extra JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_on IS NULL OR ends_on >= starts_on)
);

CREATE TABLE IF NOT EXISTS public.contract_scope_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.service_contracts(id) ON UPDATE CASCADE ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.network_assets(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  signal_key VARCHAR(120) NOT NULL,
  included BOOLEAN NOT NULL DEFAULT TRUE,
  data_origin VARCHAR(10) NOT NULL DEFAULT 'MANUAL' CHECK (data_origin IN ('IMPORTED','SYNTHETIC','MANUAL')),
  UNIQUE(contract_id, asset_id, signal_key)
);

CREATE INDEX IF NOT EXISTS ix_service_contracts_customer ON public.service_contracts(customer_id, status);
CREATE INDEX IF NOT EXISTS ix_contract_scope_asset ON public.contract_scope_items(asset_id);

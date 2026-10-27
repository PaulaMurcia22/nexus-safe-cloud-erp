-- CRM SaaS: pipeline comercial y valor recurrente esperado.
-- expected_mrr es una estimación de oportunidad, no ingreso contable ni recaudo.
CREATE TABLE IF NOT EXISTS public.crm_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE SET NULL,
  company_name VARCHAR(200) NOT NULL CHECK (length(trim(company_name)) >= 2),
  title VARCHAR(180) NOT NULL CHECK (length(trim(title)) >= 2),
  stage VARCHAR(20) NOT NULL DEFAULT 'LEAD' CHECK (stage IN ('LEAD','QUALIFIED','PROPOSAL','NEGOTIATION','WON','LOST')),
  expected_mrr NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (expected_mrr >= 0),
  probability SMALLINT NOT NULL DEFAULT 10 CHECK (probability BETWEEN 0 AND 100),
  close_date DATE,
  source VARCHAR(40) NOT NULL DEFAULT 'OTHER' CHECK (source IN ('WEBSITE','REFERRAL','PARTNER','OUTBOUND','EVENT','OTHER')),
  notes TEXT,
  data_origin VARCHAR(10) NOT NULL DEFAULT 'MANUAL' CHECK (data_origin IN ('IMPORTED','SYNTHETIC','MANUAL')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_crm_opportunities_stage_date ON public.crm_opportunities(stage, close_date);
CREATE INDEX IF NOT EXISTS ix_crm_opportunities_customer ON public.crm_opportunities(customer_id);
CREATE INDEX IF NOT EXISTS ix_crm_opportunities_company ON public.crm_opportunities(lower(company_name));

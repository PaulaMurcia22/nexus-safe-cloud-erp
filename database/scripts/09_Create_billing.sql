CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  milestone_id UUID UNIQUE REFERENCES public.project_milestones(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  number VARCHAR(50) NOT NULL UNIQUE,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  subtotal NUMERIC(14,2) NOT NULL CHECK (subtotal >= 0),
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (tax_rate BETWEEN 0 AND 100),
  total NUMERIC(14,2) NOT NULL CHECK (total >= 0),
  status VARCHAR(10) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','ISSUED','PAID','VOID')),
  paid_at TIMESTAMPTZ,
  e_invoice_status VARCHAR(24) NOT NULL DEFAULT 'NOT_SENT' CHECK (e_invoice_status IN ('NOT_SENT','SIMULATED_ACCEPTED')),
  data_origin VARCHAR(10) NOT NULL DEFAULT 'MANUAL' CHECK (data_origin IN ('IMPORTED','SYNTHETIC','MANUAL')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (due_date >= issue_date)
);

CREATE INDEX IF NOT EXISTS ix_invoices_receivables ON public.invoices(status, due_date) WHERE status='ISSUED';

CREATE OR REPLACE VIEW public.v_receivables_aging AS
SELECT
  i.customer_id,
  c.legal_name AS customer_name,
  COUNT(*)::INTEGER AS invoice_count,
  SUM(i.total) FILTER (WHERE CURRENT_DATE-i.due_date BETWEEN 1 AND 30) AS days_0_30,
  SUM(i.total) FILTER (WHERE CURRENT_DATE-i.due_date BETWEEN 31 AND 60) AS days_31_60,
  SUM(i.total) FILTER (WHERE CURRENT_DATE-i.due_date BETWEEN 61 AND 90) AS days_61_90,
  SUM(i.total) FILTER (WHERE CURRENT_DATE-i.due_date > 90) AS days_over_90,
  SUM(i.total) FILTER (WHERE i.due_date >= CURRENT_DATE) AS not_due
FROM public.invoices i
JOIN public.clients c ON c.id=i.customer_id
WHERE i.status='ISSUED'
GROUP BY i.customer_id, c.legal_name;

-- SaaS procurement and expense tracking. Origin is retained for audit and demo reconciliation.
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(180) NOT NULL,
  tax_id VARCHAR(40),
  category VARCHAR(60) NOT NULL,
  contact_name VARCHAR(140),
  email VARCHAR(254),
  phone VARCHAR(40),
  website VARCHAR(255),
  payment_terms_days SMALLINT NOT NULL DEFAULT 30 CHECK (payment_terms_days BETWEEN 0 AND 365),
  status VARCHAR(12) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  data_origin VARCHAR(10) NOT NULL DEFAULT 'MANUAL' CHECK (data_origin IN ('IMPORTED','SYNTHETIC','MANUAL')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_suppliers_status ON public.suppliers(status,name);
CREATE UNIQUE INDEX IF NOT EXISTS uq_suppliers_tax_id ON public.suppliers(tax_id) WHERE tax_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(40) NOT NULL UNIQUE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  description VARCHAR(300) NOT NULL,
  ordered_on DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_on DATE,
  currency CHAR(3) NOT NULL DEFAULT 'COP' CHECK (currency IN ('COP','USD')),
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (tax_rate BETWEEN 0 AND 100),
  total NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  status VARCHAR(12) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','RECEIVED','CANCELLED')),
  notes TEXT,
  requested_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  data_origin VARCHAR(10) NOT NULL DEFAULT 'MANUAL' CHECK (data_origin IN ('IMPORTED','SYNTHETIC','MANUAL')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (expected_on IS NULL OR expected_on >= ordered_on)
);
CREATE INDEX IF NOT EXISTS ix_purchase_orders_supplier ON public.purchase_orders(supplier_id,ordered_on DESC);

CREATE TABLE IF NOT EXISTS public.purchase_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  description VARCHAR(240) NOT NULL,
  quantity NUMERIC(12,3) NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(14,2) NOT NULL CHECK (unit_price >= 0),
  line_total NUMERIC(16,2) GENERATED ALWAYS AS (round(quantity * unit_price,2)) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_purchase_order_lines_order ON public.purchase_order_lines(purchase_order_id);

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES public.suppliers(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  description VARCHAR(240) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('CLOUD_INFRASTRUCTURE','SOFTWARE_LICENSES','SECURITY_TOOLS','CONNECTIVITY','PAYROLL','MARKETING','OFFICE','PROFESSIONAL_SERVICES','OTHER')),
  expense_date DATE NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'COP' CHECK (currency IN ('COP','USD')),
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  status VARCHAR(10) NOT NULL DEFAULT 'RECORDED' CHECK (status IN ('RECORDED','APPROVED','PAID','VOID')),
  payment_reference VARCHAR(100),
  notes TEXT,
  recorded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  data_origin VARCHAR(10) NOT NULL DEFAULT 'MANUAL' CHECK (data_origin IN ('IMPORTED','SYNTHETIC','MANUAL')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_expenses_date_category ON public.expenses(expense_date DESC,category);

-- Libro gerencial de ingresos y costos para SaaS.
-- No constituye una declaración de cumplimiento contable o tributario local.
CREATE TABLE IF NOT EXISTS public.accounting_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  account_type VARCHAR(12) NOT NULL CHECK (account_type IN ('ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE')),
  normal_balance VARCHAR(6) NOT NULL CHECK (normal_balance IN ('DEBIT','CREDIT')),
  parent_id UUID REFERENCES public.accounting_accounts(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  data_origin VARCHAR(10) NOT NULL DEFAULT 'MANUAL' CHECK (data_origin IN ('IMPORTED','SYNTHETIC','MANUAL')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_accounting_accounts_type ON public.accounting_accounts(account_type,code);

CREATE TABLE IF NOT EXISTS public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number VARCHAR(40) NOT NULL UNIQUE,
  entry_date DATE NOT NULL,
  description VARCHAR(300) NOT NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','POSTED','VOID')),
  source_type VARCHAR(30) NOT NULL DEFAULT 'MANUAL' CHECK (source_type IN ('MANUAL','SUBSCRIPTION','INVOICE','EXPENSE','PURCHASE_ORDER','PAYMENT','ADJUSTMENT')),
  source_id UUID,
  created_by UUID REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  posted_at TIMESTAMPTZ,
  void_reason VARCHAR(500),
  data_origin VARCHAR(10) NOT NULL DEFAULT 'MANUAL' CHECK (data_origin IN ('IMPORTED','SYNTHETIC','MANUAL')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((status IN ('POSTED','VOID')) = (posted_at IS NOT NULL)),
  CHECK ((status='VOID') = (void_reason IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS ix_journal_entries_date_status ON public.journal_entries(entry_date DESC,status);

CREATE TABLE IF NOT EXISTS public.journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON UPDATE CASCADE ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounting_accounts(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  description VARCHAR(240) NOT NULL DEFAULT '',
  debit NUMERIC(16,2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit NUMERIC(16,2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0))
);
CREATE INDEX IF NOT EXISTS ix_journal_entry_lines_entry ON public.journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS ix_journal_entry_lines_account ON public.journal_entry_lines(account_id);

INSERT INTO public.accounting_accounts(code,name,account_type,normal_balance,data_origin) VALUES
 ('1000','Efectivo y bancos','ASSET','DEBIT','MANUAL'),
 ('1100','Cuentas por cobrar','ASSET','DEBIT','MANUAL'),
 ('1200','Anticipos y gastos pagados por anticipado','ASSET','DEBIT','MANUAL'),
 ('2000','Cuentas por pagar a proveedores','LIABILITY','CREDIT','MANUAL'),
 ('2100','Impuestos por pagar','LIABILITY','CREDIT','MANUAL'),
 ('2200','Ingresos diferidos por suscripciones','LIABILITY','CREDIT','MANUAL'),
 ('3000','Capital y patrimonio','EQUITY','CREDIT','MANUAL'),
 ('3100','Resultados acumulados','EQUITY','CREDIT','MANUAL'),
 ('4000','Ingresos por suscripciones SaaS','REVENUE','CREDIT','MANUAL'),
 ('4100','Ingresos por implementación y servicios','REVENUE','CREDIT','MANUAL'),
 ('5000','Infraestructura cloud y hosting','EXPENSE','DEBIT','MANUAL'),
 ('5100','Nómina y servicios profesionales','EXPENSE','DEBIT','MANUAL'),
 ('5200','Ventas y mercadeo','EXPENSE','DEBIT','MANUAL'),
 ('5300','Licencias y herramientas de seguridad','EXPENSE','DEBIT','MANUAL'),
 ('5400','Conectividad y telecomunicaciones','EXPENSE','DEBIT','MANUAL'),
 ('5500','Gastos generales y administrativos','EXPENSE','DEBIT','MANUAL')
ON CONFLICT(code) DO NOTHING;

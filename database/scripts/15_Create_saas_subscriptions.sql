-- Catálogo de planes y suscripciones recurrentes para Nexus como SaaS.
-- La procedencia se mantiene para auditoría, pero no forma parte de la vista comercial.
CREATE TABLE IF NOT EXISTS public.saas_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  monthly_price NUMERIC(14,2) NOT NULL CHECK (monthly_price >= 0),
  extra_seat_price NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (extra_seat_price >= 0),
  annual_discount_pct NUMERIC(5,2) NOT NULL DEFAULT 10 CHECK (annual_discount_pct BETWEEN 0 AND 50),
  currency CHAR(3) NOT NULL DEFAULT 'COP' CHECK (currency IN ('COP','USD')),
  included_seats INTEGER NOT NULL DEFAULT 1 CHECK (included_seats > 0),
  features JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(features) = 'array'),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  data_origin VARCHAR(10) NOT NULL DEFAULT 'MANUAL' CHECK (data_origin IN ('IMPORTED','SYNTHETIC','MANUAL')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Hace que volver a aplicar este archivo sea compatible con instalaciones que
-- ya crearon el catálogo antes de agregar el precio por asiento excedente.
ALTER TABLE public.saas_plans ADD COLUMN IF NOT EXISTS extra_seat_price NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (extra_seat_price >= 0);

CREATE TABLE IF NOT EXISTS public.saas_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  plan_id UUID NOT NULL REFERENCES public.saas_plans(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  code VARCHAR(40) NOT NULL UNIQUE,
  billing_interval VARCHAR(10) NOT NULL CHECK (billing_interval IN ('MONTHLY','YEARLY')),
  status VARCHAR(12) NOT NULL DEFAULT 'TRIAL' CHECK (status IN ('TRIAL','ACTIVE','PAST_DUE','CANCELED')),
  seats INTEGER NOT NULL DEFAULT 1 CHECK (seats > 0),
  recurring_amount NUMERIC(14,2) NOT NULL CHECK (recurring_amount >= 0),
  monthly_value NUMERIC(14,2) NOT NULL CHECK (monthly_value >= 0),
  currency CHAR(3) NOT NULL CHECK (currency IN ('COP','USD')),
  starts_on DATE NOT NULL,
  trial_ends_on DATE,
  current_period_start DATE NOT NULL,
  current_period_end DATE NOT NULL,
  next_renewal_on DATE,
  canceled_at TIMESTAMPTZ,
  notes TEXT NOT NULL DEFAULT '',
  data_origin VARCHAR(10) NOT NULL DEFAULT 'MANUAL' CHECK (data_origin IN ('IMPORTED','SYNTHETIC','MANUAL')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (current_period_end >= current_period_start),
  CHECK (trial_ends_on IS NULL OR trial_ends_on >= starts_on),
  CHECK ((status = 'CANCELED') = (canceled_at IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS ix_saas_subscriptions_customer ON public.saas_subscriptions(customer_id, status);
CREATE INDEX IF NOT EXISTS ix_saas_subscriptions_renewal ON public.saas_subscriptions(next_renewal_on) WHERE status IN ('ACTIVE','PAST_DUE');

INSERT INTO public.saas_plans(code,name,description,monthly_price,extra_seat_price,annual_discount_pct,currency,included_seats,features,data_origin)
VALUES
 ('ESSENTIAL','Nexus Essential','Monitoreo de infraestructura para equipos pequeños.',299000,39000,8,'COP',3,'["Inventario de activos","Alertas esenciales","Panel de disponibilidad"]'::jsonb,'MANUAL'),
 ('PROFESSIONAL','Nexus Professional','Observabilidad de red y operación para equipos en crecimiento.',799000,59000,12,'COP',10,'["Inventario y topología","Alertas configurables","Informes ejecutivos","Gestión de órdenes"]'::jsonb,'MANUAL'),
 ('ENTERPRISE','Nexus Enterprise','Gestión avanzada y soporte para operaciones multisede.',2400000,79000,15,'COP',30,'["Múltiples sedes","Integración API","Auditoría avanzada","SLA prioritario"]'::jsonb,'MANUAL')
ON CONFLICT(code) DO NOTHING;

-- Completa únicamente los precios nuevos que quedan en cero en catálogos ya existentes.
UPDATE public.saas_plans SET extra_seat_price=39000,updated_at=now() WHERE code='ESSENTIAL' AND extra_seat_price=0;
UPDATE public.saas_plans SET extra_seat_price=59000,updated_at=now() WHERE code='PROFESSIONAL' AND extra_seat_price=0;
UPDATE public.saas_plans SET extra_seat_price=79000,updated_at=now() WHERE code='ENTERPRISE' AND extra_seat_price=0;

-- Tabla maestra de clientes empresariales.
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legal_name VARCHAR(200) NOT NULL CHECK (length(trim(legal_name)) >= 2),
    nit VARCHAR(30) NOT NULL,
    nit_normalized VARCHAR(30) NOT NULL,
    industry VARCHAR(120) NOT NULL,
    contact_name VARCHAR(160) NOT NULL,
    contact_position VARCHAR(120),
    contact_email VARCHAR(254) NOT NULL,
    contact_phone VARCHAR(40),
    city VARCHAR(100) NOT NULL,
    address VARCHAR(240),
    status VARCHAR(10) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_clients_nit_normalized UNIQUE (nit_normalized)
);

CREATE INDEX IF NOT EXISTS ix_clients_legal_name ON clients (lower(legal_name));

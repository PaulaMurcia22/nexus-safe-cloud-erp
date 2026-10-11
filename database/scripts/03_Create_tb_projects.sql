-- Tabla de proyectos asociados obligatoriamente a un cliente.
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(40) NOT NULL,
    name VARCHAR(160) NOT NULL CHECK (length(trim(name)) >= 2),
    description TEXT,
    customer_id UUID NOT NULL REFERENCES clients(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    service_type VARCHAR(30) NOT NULL CHECK (service_type IN ('SOFTWARE_DEVELOPMENT', 'INFRASTRUCTURE_SUPPORT', 'CLOUD_CONSULTING', 'CYBERSECURITY')),
    status VARCHAR(20) NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED')),
    priority VARCHAR(10) NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
    responsible_user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    responsible_location VARCHAR(20) NOT NULL CHECK (responsible_location IN ('MEDELLIN', 'BOGOTA', 'REMOTE_SHARED')),
    start_date DATE,
    estimated_end_date DATE,
    estimated_budget NUMERIC(14, 2) CHECK (estimated_budget IS NULL OR estimated_budget >= 0),
    estimated_hours NUMERIC(10, 2) CHECK (estimated_hours IS NULL OR estimated_hours >= 0),
    progress_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_projects_code UNIQUE (code),
    CONSTRAINT ck_projects_dates CHECK (estimated_end_date IS NULL OR start_date IS NULL OR estimated_end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS ix_projects_customer_id ON projects (customer_id);
CREATE INDEX IF NOT EXISTS ix_projects_status ON projects (status);

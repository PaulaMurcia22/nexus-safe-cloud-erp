-- Fase 1/3: modelo de inventario de red, importación auditable y extensión por campos definidos.
-- Referencias a clientes/proyectos son opcionales: la propiedad y sede aún no están confirmadas.
CREATE TABLE IF NOT EXISTS sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL, city VARCHAR(100) NOT NULL,
  CONSTRAINT ck_sites_code CHECK (code IN ('MEDELLIN','BOGOTA','REMOTE_SHARED'))
);
INSERT INTO sites(code,name,city) VALUES
 ('MEDELLIN','Medellín','Medellín'),('BOGOTA','Bogotá','Bogotá'),('REMOTE_SHARED','Remoto compartido','Remoto')
ON CONFLICT(code) DO NOTHING;

CREATE TABLE IF NOT EXISTS network_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), source_id VARCHAR(200), name VARCHAR(200) NOT NULL,
  category VARCHAR(40) NOT NULL, model VARCHAR(160), role VARCHAR(100),
  criticality VARCHAR(10) NOT NULL DEFAULT 'MEDIUM' CHECK (criticality IN ('CRITICAL','HIGH','MEDIUM','LOW')),
  serial_raw VARCHAR(200), serial_normalized VARCHAR(200) UNIQUE, sys_name VARCHAR(200), system_version VARCHAR(200),
  power_on BOOLEAN, config_lines INTEGER, config_register VARCHAR(80),
  site_id UUID REFERENCES sites(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  customer_id UUID REFERENCES clients(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  project_id UUID REFERENCES projects(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  status VARCHAR(10) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','RETIRED')),
  data_origin VARCHAR(10) NOT NULL DEFAULT 'MANUAL',
  extra JSONB NOT NULL DEFAULT '{}'::jsonb, manual_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL, updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT ck_network_assets_config_lines CHECK (config_lines IS NULL OR config_lines >= 0),
  CONSTRAINT ck_network_assets_data_origin CHECK (data_origin IN ('IMPORTED','SYNTHETIC','MANUAL'))
);
CREATE INDEX IF NOT EXISTS ix_network_assets_name ON network_assets(name);
CREATE INDEX IF NOT EXISTS ix_network_assets_category ON network_assets(category);
CREATE INDEX IF NOT EXISTS ix_network_assets_criticality ON network_assets(criticality);
CREATE INDEX IF NOT EXISTS ix_network_assets_site_id ON network_assets(site_id);
CREATE INDEX IF NOT EXISTS ix_network_assets_customer_id ON network_assets(customer_id);
CREATE INDEX IF NOT EXISTS ix_network_assets_serial ON network_assets(serial_normalized);
ALTER TABLE network_assets ADD COLUMN IF NOT EXISTS manual_overrides JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS asset_ip_addresses (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), asset_id UUID NOT NULL REFERENCES network_assets(id) ON DELETE CASCADE,
 ip INET NOT NULL, netmask VARCHAR(64), gateway INET, dns JSONB NOT NULL DEFAULT '[]'::jsonb,
 dhcp_server INET, source_field VARCHAR(100), UNIQUE(asset_id,ip)
);
CREATE TABLE IF NOT EXISTS asset_mac_addresses (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), asset_id UUID NOT NULL REFERENCES network_assets(id) ON DELETE CASCADE,
 mac VARCHAR(17) NOT NULL CHECK (mac ~ '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'), source_field VARCHAR(100), UNIQUE(asset_id,mac)
);
CREATE TABLE IF NOT EXISTS asset_interfaces (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), asset_id UUID NOT NULL REFERENCES network_assets(id) ON DELETE CASCADE,
 name VARCHAR(160) NOT NULL, interface_type VARCHAR(30) NOT NULL DEFAULT 'OTHER' CHECK (interface_type IN ('TRUNK','L3','ACCESS','OTHER')),
 ip INET, netmask VARCHAR(64), vlan_detail TEXT, detail JSONB NOT NULL DEFAULT '{}'::jsonb, UNIQUE(asset_id,name)
);
CREATE TABLE IF NOT EXISTS network_links (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), source_asset_id UUID REFERENCES network_assets(id) ON DELETE SET NULL,
 target_asset_id UUID REFERENCES network_assets(id) ON DELETE SET NULL, source_name VARCHAR(200), target_name VARCHAR(200),
 source_port VARCHAR(160), target_port VARCHAR(160), link_type VARCHAR(80), cable_type VARCHAR(80),
 functional BOOLEAN, length_m NUMERIC(10,2) CHECK (length_m IS NULL OR length_m >= 0),
 criticality VARCHAR(10) CHECK (criticality IS NULL OR criticality IN ('CRITICAL','HIGH','MEDIUM','LOW')),
 source_row INTEGER UNIQUE, extra JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE IF NOT EXISTS dhcp_pools (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), asset_id UUID REFERENCES network_assets(id) ON DELETE SET NULL,
 name VARCHAR(160) NOT NULL UNIQUE, network CIDR, netmask VARCHAR(64), gateway INET, dns JSONB NOT NULL DEFAULT '[]'::jsonb,
 source_row INTEGER, active BOOLEAN NOT NULL DEFAULT TRUE, extra JSONB NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE dhcp_pools ADD COLUMN IF NOT EXISTS extra JSONB NOT NULL DEFAULT '{}'::jsonb;
CREATE TABLE IF NOT EXISTS asset_controls (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), asset_id UUID NOT NULL REFERENCES network_assets(id) ON DELETE CASCADE,
 control VARCHAR(12) NOT NULL CHECK (control IN ('NETFLOW','SYSLOG','SNMP','NTP','SSH','AAA','HSRP')),
 status VARCHAR(20) NOT NULL CHECK (status IN ('CONFIGURED','NOT_DETECTED','NOT_APPLICABLE')),
 detail TEXT, source_row INTEGER, UNIQUE(asset_id,control)
);
CREATE TABLE IF NOT EXISTS monitoring_technologies (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), technology VARCHAR(160) NOT NULL UNIQUE,
 transport_port VARCHAR(160), collect_description TEXT, vendor_confirmation TEXT,
 confirmation_status VARCHAR(12) NOT NULL DEFAULT 'PENDING' CHECK (confirmation_status IN ('PENDING','CONFIRMED')),
 collector_host VARCHAR(255), collector_port INTEGER CHECK (collector_port IS NULL OR collector_port BETWEEN 1 AND 65535),
 extra JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE IF NOT EXISTS import_batches (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), file_name TEXT NOT NULL, sha256 CHAR(64) NOT NULL,
 status VARCHAR(12) NOT NULL CHECK (status IN ('RUNNING','COMPLETED','FAILED','DRY_RUN')),
 rows_read INTEGER NOT NULL DEFAULT 0, inserted_count INTEGER NOT NULL DEFAULT 0,
 updated_count INTEGER NOT NULL DEFAULT 0, rejected_count INTEGER NOT NULL DEFAULT 0,
 user_id UUID REFERENCES users(id) ON DELETE SET NULL, started_at TIMESTAMPTZ NOT NULL DEFAULT now(), finished_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS import_issues (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), batch_id UUID NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
 sheet VARCHAR(160) NOT NULL, row_number INTEGER, field VARCHAR(160), severity VARCHAR(10) NOT NULL CHECK (severity IN ('INFO','WARNING','ERROR')),
 message TEXT NOT NULL, original_value TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_import_issues_batch ON import_issues(batch_id);
CREATE TABLE IF NOT EXISTS audit_log (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
 action VARCHAR(80) NOT NULL, entity VARCHAR(120) NOT NULL, entity_id UUID,
 before_data JSONB, after_data JSONB, occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS custom_field_definitions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), entity VARCHAR(80) NOT NULL, field_key VARCHAR(80) NOT NULL,
 label VARCHAR(160) NOT NULL, field_type VARCHAR(12) NOT NULL CHECK (field_type IN ('TEXT','NUMBER','DATE','LIST')),
 required BOOLEAN NOT NULL DEFAULT FALSE, options JSONB NOT NULL DEFAULT '[]'::jsonb,
 active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(entity,field_key)
);

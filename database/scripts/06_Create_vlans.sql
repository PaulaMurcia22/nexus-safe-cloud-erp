CREATE TABLE IF NOT EXISTS public.vlans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES public.sites(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  vlan_number INTEGER NOT NULL CHECK (vlan_number BETWEEN 1 AND 4094),
  name VARCHAR(120) NOT NULL,
  area VARCHAR(120),
  subnet CIDR,
  gateway INET,
  sensitivity VARCHAR(12) NOT NULL DEFAULT 'NORMAL' CHECK (sensitivity IN ('NORMAL','SENSITIVE')),
  dhcp_pool_id UUID REFERENCES public.dhcp_pools(id) ON UPDATE CASCADE ON DELETE SET NULL,
  data_origin VARCHAR(10) NOT NULL DEFAULT 'MANUAL' CHECK (data_origin IN ('IMPORTED','SYNTHETIC','MANUAL')),
  source_row INTEGER,
  extra JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_vlans_site_number
  ON public.vlans ((COALESCE(site_id,'00000000-0000-0000-0000-000000000000'::uuid)), vlan_number);
CREATE INDEX IF NOT EXISTS ix_vlans_sensitivity ON public.vlans(sensitivity);

CREATE TABLE IF NOT EXISTS public.asset_vlan_membership (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.network_assets(id) ON UPDATE CASCADE ON DELETE CASCADE,
  vlan_id UUID NOT NULL REFERENCES public.vlans(id) ON UPDATE CASCADE ON DELETE CASCADE,
  basis VARCHAR(20) NOT NULL CHECK (basis IN ('IP_IN_CIDR','INTERFACE','NAME_INFERRED')),
  data_origin VARCHAR(10) NOT NULL DEFAULT 'IMPORTED' CHECK (data_origin IN ('IMPORTED','SYNTHETIC','MANUAL')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(asset_id, vlan_id)
);

CREATE INDEX IF NOT EXISTS ix_asset_vlan_membership_vlan ON public.asset_vlan_membership(vlan_id);

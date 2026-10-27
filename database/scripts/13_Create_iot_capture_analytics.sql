-- Métricas de capturas IoT/TCP. Se persisten metadatos y agregados solamente;
-- nunca se almacenan payloads ASCII/hex ni contenido de mensajes.
CREATE TABLE IF NOT EXISTS public.iot_captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(180) NOT NULL,
  source_file VARCHAR(255) NOT NULL,
  source_sha256 CHAR(64) NOT NULL UNIQUE,
  imported_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  total_packets INTEGER NOT NULL CHECK (total_packets >= 0),
  packets_with_payload INTEGER NOT NULL CHECK (packets_with_payload >= 0),
  total_frame_bytes BIGINT NOT NULL CHECK (total_frame_bytes >= 0),
  total_payload_bytes BIGINT NOT NULL CHECK (total_payload_bytes >= 0),
  duration_seconds NUMERIC(14,6) NOT NULL CHECK (duration_seconds >= 0),
  payload_efficiency NUMERIC(7,4) NOT NULL CHECK (payload_efficiency BETWEEN 0 AND 100),
  started_at TIMESTAMPTZ,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_origin VARCHAR(10) NOT NULL DEFAULT 'IMPORTED' CHECK (data_origin IN ('IMPORTED','SYNTHETIC','MANUAL'))
);

CREATE TABLE IF NOT EXISTS public.iot_capture_packets (
  capture_id UUID NOT NULL REFERENCES public.iot_captures(id) ON DELETE CASCADE,
  packet_number INTEGER NOT NULL CHECK (packet_number > 0),
  occurred_at TIMESTAMPTZ,
  relative_seconds NUMERIC(14,6) NOT NULL CHECK (relative_seconds >= 0),
  frame_bytes INTEGER NOT NULL CHECK (frame_bytes >= 0),
  payload_bytes INTEGER NOT NULL DEFAULT 0 CHECK (payload_bytes >= 0),
  source_ip INET,
  source_port INTEGER CHECK (source_port BETWEEN 0 AND 65535),
  destination_ip INET,
  destination_port INTEGER CHECK (destination_port BETWEEN 0 AND 65535),
  protocol VARCHAR(32),
  tcp_flags VARCHAR(120),
  PRIMARY KEY (capture_id,packet_number)
);

CREATE TABLE IF NOT EXISTS public.iot_capture_payloads (
  capture_id UUID NOT NULL,
  packet_number INTEGER NOT NULL,
  flow VARCHAR(255) NOT NULL,
  payload_bytes INTEGER NOT NULL CHECK (payload_bytes >= 0),
  payload_type VARCHAR(16) NOT NULL CHECK (payload_type IN ('TEXT','BINARY','OTHER')),
  PRIMARY KEY (capture_id,packet_number),
  FOREIGN KEY (capture_id,packet_number) REFERENCES public.iot_capture_packets(capture_id,packet_number) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.iot_capture_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capture_id UUID NOT NULL REFERENCES public.iot_captures(id) ON DELETE CASCADE,
  endpoint_a VARCHAR(120) NOT NULL,
  endpoint_b VARCHAR(120) NOT NULL,
  source_port INTEGER CHECK (source_port BETWEEN 0 AND 65535),
  packets INTEGER NOT NULL CHECK (packets >= 0),
  frame_bytes BIGINT NOT NULL CHECK (frame_bytes >= 0),
  payload_bytes BIGINT NOT NULL CHECK (payload_bytes >= 0),
  start_seconds NUMERIC(14,6) NOT NULL CHECK (start_seconds >= 0),
  end_seconds NUMERIC(14,6) NOT NULL CHECK (end_seconds >= start_seconds),
  UNIQUE(capture_id,endpoint_a,endpoint_b,start_seconds)
);

CREATE INDEX IF NOT EXISTS ix_iot_captures_imported_at ON public.iot_captures(imported_at DESC);
CREATE INDEX IF NOT EXISTS ix_iot_capture_packets_timeline ON public.iot_capture_packets(capture_id,relative_seconds);
CREATE INDEX IF NOT EXISTS ix_iot_capture_conversations_port ON public.iot_capture_conversations(capture_id,source_port);

CREATE TABLE IF NOT EXISTS public.auth_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  email_attempted VARCHAR(254) NOT NULL,
  success BOOLEAN NOT NULL,
  ip INET,
  user_agent TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_auth_events_email_time ON public.auth_events(lower(email_attempted), occurred_at DESC);
CREATE INDEX IF NOT EXISTS ix_auth_events_user_time ON public.auth_events(user_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash CHAR(64) NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_user_sessions_user_expiry ON public.user_sessions(user_id, expires_at);

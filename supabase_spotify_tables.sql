-- Run this in Supabase SQL Editor for the current project.
-- It creates the tables required by /api/spotify/* routes.

BEGIN;

CREATE TABLE IF NOT EXISTS public.spotify_tokens (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text,
  refresh_token text,
  expires_at bigint,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.spotify_states (
  token text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at bigint NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spotify_states_expires_at
  ON public.spotify_states (expires_at);

CREATE OR REPLACE FUNCTION public.set_spotify_tokens_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_spotify_tokens_updated_at ON public.spotify_tokens;
CREATE TRIGGER trg_spotify_tokens_updated_at
BEFORE UPDATE ON public.spotify_tokens
FOR EACH ROW
EXECUTE FUNCTION public.set_spotify_tokens_updated_at();

ALTER TABLE public.spotify_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spotify_states ENABLE ROW LEVEL SECURITY;

-- Client never reads/writes these directly. API routes use service role key.
REVOKE ALL ON TABLE public.spotify_tokens FROM anon, authenticated;
REVOKE ALL ON TABLE public.spotify_states FROM anon, authenticated;
GRANT ALL ON TABLE public.spotify_tokens TO service_role;
GRANT ALL ON TABLE public.spotify_states TO service_role;

COMMIT;

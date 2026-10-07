-- Fixed-window rate limiting, backed by Postgres so it works across serverless
-- instances without any external service.
--
-- Keys are opaque strings chosen by the app (it stores SHA-256 hashes, never raw
-- IPs or emails). Only the service role may use the table or the function.

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

CREATE INDEX IF NOT EXISTS rate_limits_window_start_idx
  ON public.rate_limits (window_start);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Atomically records one hit for p_key in the current window and returns
-- whether the caller is still within p_limit hits for that window.
CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_key TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_window TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  IF p_window_seconds <= 0 OR p_limit < 0 THEN
    RAISE EXCEPTION 'invalid rate limit parameters';
  END IF;

  v_window := to_timestamp(
    floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds
  );

  INSERT INTO public.rate_limits AS rl (key, window_start, count)
  VALUES (p_key, v_window, 1)
  ON CONFLICT (key, window_start)
  DO UPDATE SET count = rl.count + 1
  RETURNING rl.count INTO v_count;

  -- Opportunistic cleanup of expired windows (about 1% of calls).
  IF random() < 0.01 THEN
    DELETE FROM public.rate_limits
    WHERE window_start < now() - interval '1 day';
  END IF;

  RETURN v_count <= p_limit;
END;
$$;

REVOKE ALL ON public.rate_limits FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.consume_rate_limit(TEXT, INTEGER, INTEGER)
  FROM anon, authenticated, PUBLIC;
GRANT ALL ON public.rate_limits TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(TEXT, INTEGER, INTEGER)
  TO service_role;

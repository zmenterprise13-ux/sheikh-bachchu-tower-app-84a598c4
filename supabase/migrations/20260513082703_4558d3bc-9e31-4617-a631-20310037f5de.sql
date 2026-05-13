-- Device tokens table
CREATE TABLE public.device_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL,
  platform text NOT NULL DEFAULT 'android',
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (token)
);

CREATE INDEX idx_device_push_tokens_user ON public.device_push_tokens(user_id);

ALTER TABLE public.device_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own tokens"
  ON public.device_push_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all tokens"
  ON public.device_push_tokens
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Helper to invoke edge function via pg_net
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.notify_push_on_dues()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _url text;
  _key text;
BEGIN
  SELECT decrypted_secret INTO _url FROM vault.decrypted_secrets WHERE name = 'project_url' LIMIT 1;
  SELECT decrypted_secret INTO _key FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;
  IF _url IS NULL OR _key IS NULL THEN
    RETURN NEW;
  END IF;
  PERFORM extensions.http_post(
    url := _url || '/functions/v1/send-push-notification',
    body := jsonb_build_object(
      'user_ids', ARRAY[NEW.user_id],
      'title', NEW.title,
      'body', NEW.body
    )::text,
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer '||_key
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_push_on_notice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _url text;
  _key text;
BEGIN
  SELECT decrypted_secret INTO _url FROM vault.decrypted_secrets WHERE name = 'project_url' LIMIT 1;
  SELECT decrypted_secret INTO _key FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;
  IF _url IS NULL OR _key IS NULL THEN
    RETURN NEW;
  END IF;
  PERFORM extensions.http_post(
    url := _url || '/functions/v1/send-push-notification',
    body := jsonb_build_object(
      'broadcast', true,
      'title', COALESCE(NEW.title_bn, NEW.title),
      'body', COALESCE(NEW.body_bn, NEW.body)
    )::text,
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer '||_key
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_push_on_dues
  AFTER INSERT ON public.dues_notifications
  FOR EACH ROW EXECUTE FUNCTION public.notify_push_on_dues();

CREATE TRIGGER trg_push_on_notice
  AFTER INSERT ON public.notices
  FOR EACH ROW EXECUTE FUNCTION public.notify_push_on_notice();
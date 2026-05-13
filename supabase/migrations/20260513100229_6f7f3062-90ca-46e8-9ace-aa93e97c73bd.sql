-- Ensure http extension is available for extensions.http_post
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Function: send push to owner+tenant of the flat when a personal notice arrives
CREATE OR REPLACE FUNCTION public.notify_push_on_personal_notice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uids uuid[];
BEGIN
  SELECT ARRAY(
    SELECT u FROM (
      SELECT owner_user_id AS u FROM public.flats WHERE id = NEW.flat_id
      UNION
      SELECT tenant_user_id AS u FROM public.flats WHERE id = NEW.flat_id
    ) s WHERE u IS NOT NULL
  ) INTO _uids;

  IF _uids IS NULL OR array_length(_uids,1) IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM extensions.http_post(
    url := 'https://ogurhyuwaurxxivwgqnx.supabase.co/functions/v1/send-push-notification',
    body := jsonb_build_object(
      'user_ids', _uids,
      'title', COALESCE(NEW.title_bn, NEW.title),
      'body',  COALESCE(NEW.body_bn,  NEW.body)
    )::text,
    headers := jsonb_build_object('Content-Type','application/json')
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- Attach triggers (drop-if-exists for idempotency)
DROP TRIGGER IF EXISTS trg_push_on_notice ON public.notices;
CREATE TRIGGER trg_push_on_notice
AFTER INSERT ON public.notices
FOR EACH ROW EXECUTE FUNCTION public.notify_push_on_notice();

DROP TRIGGER IF EXISTS trg_push_on_dues ON public.dues_notifications;
CREATE TRIGGER trg_push_on_dues
AFTER INSERT ON public.dues_notifications
FOR EACH ROW EXECUTE FUNCTION public.notify_push_on_dues();

DROP TRIGGER IF EXISTS trg_push_on_personal_notice ON public.personal_notices;
CREATE TRIGGER trg_push_on_personal_notice
AFTER INSERT ON public.personal_notices
FOR EACH ROW EXECUTE FUNCTION public.notify_push_on_personal_notice();
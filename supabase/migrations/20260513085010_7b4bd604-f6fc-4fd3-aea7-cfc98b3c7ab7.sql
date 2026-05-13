
CREATE OR REPLACE FUNCTION public.notify_push_on_dues()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM extensions.http_post(
    url := 'https://ogurhyuwaurxxivwgqnx.supabase.co/functions/v1/send-push-notification',
    body := jsonb_build_object(
      'user_ids', ARRAY[NEW.user_id],
      'title', NEW.title,
      'body', NEW.body
    )::text,
    headers := jsonb_build_object('Content-Type','application/json')
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_push_on_notice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM extensions.http_post(
    url := 'https://ogurhyuwaurxxivwgqnx.supabase.co/functions/v1/send-push-notification',
    body := jsonb_build_object(
      'broadcast', true,
      'title', COALESCE(NEW.title_bn, NEW.title),
      'body', COALESCE(NEW.body_bn, NEW.body)
    )::text,
    headers := jsonb_build_object('Content-Type','application/json')
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_push_on_dues ON public.dues_notifications;
CREATE TRIGGER trg_notify_push_on_dues
AFTER INSERT ON public.dues_notifications
FOR EACH ROW EXECUTE FUNCTION public.notify_push_on_dues();

DROP TRIGGER IF EXISTS trg_notify_push_on_notice ON public.notices;
CREATE TRIGGER trg_notify_push_on_notice
AFTER INSERT ON public.notices
FOR EACH ROW EXECUTE FUNCTION public.notify_push_on_notice();

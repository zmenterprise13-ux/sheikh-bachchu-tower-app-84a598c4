-- History table for billing settings changes
CREATE TABLE public.billing_settings_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settings_id uuid,
  changed_by uuid,
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  eid_month_1 text,
  eid_month_2 text,
  eid_due_day_1 integer,
  eid_due_day_2 integer,
  regular_due_day integer,
  other_due_offset_days integer,
  prev_eid_month_1 text,
  prev_eid_month_2 text,
  prev_eid_due_day_1 integer,
  prev_eid_due_day_2 integer,
  prev_regular_due_day integer,
  prev_other_due_offset_days integer,
  changed_fields text[] NOT NULL DEFAULT '{}'
);

ALTER TABLE public.billing_settings_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view billing settings history"
ON public.billing_settings_history
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert billing settings history"
ON public.billing_settings_history
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_billing_settings_history_changed_at
ON public.billing_settings_history (changed_at DESC);

-- Trigger to auto-record on update/insert
CREATE OR REPLACE FUNCTION public.log_billing_settings_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fields text[] := '{}';
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF COALESCE(NEW.eid_month_1,'') IS DISTINCT FROM COALESCE(OLD.eid_month_1,'') THEN fields := array_append(fields,'eid_month_1'); END IF;
    IF COALESCE(NEW.eid_month_2,'') IS DISTINCT FROM COALESCE(OLD.eid_month_2,'') THEN fields := array_append(fields,'eid_month_2'); END IF;
    IF NEW.eid_due_day_1 IS DISTINCT FROM OLD.eid_due_day_1 THEN fields := array_append(fields,'eid_due_day_1'); END IF;
    IF NEW.eid_due_day_2 IS DISTINCT FROM OLD.eid_due_day_2 THEN fields := array_append(fields,'eid_due_day_2'); END IF;
    IF NEW.regular_due_day IS DISTINCT FROM OLD.regular_due_day THEN fields := array_append(fields,'regular_due_day'); END IF;
    IF NEW.other_due_offset_days IS DISTINCT FROM OLD.other_due_offset_days THEN fields := array_append(fields,'other_due_offset_days'); END IF;

    IF array_length(fields,1) IS NULL THEN
      RETURN NEW;
    END IF;

    INSERT INTO public.billing_settings_history (
      settings_id, changed_by, changed_fields,
      eid_month_1, eid_month_2, eid_due_day_1, eid_due_day_2, regular_due_day, other_due_offset_days,
      prev_eid_month_1, prev_eid_month_2, prev_eid_due_day_1, prev_eid_due_day_2, prev_regular_due_day, prev_other_due_offset_days
    ) VALUES (
      NEW.id, auth.uid(), fields,
      NEW.eid_month_1, NEW.eid_month_2, NEW.eid_due_day_1, NEW.eid_due_day_2, NEW.regular_due_day, NEW.other_due_offset_days,
      OLD.eid_month_1, OLD.eid_month_2, OLD.eid_due_day_1, OLD.eid_due_day_2, OLD.regular_due_day, OLD.other_due_offset_days
    );
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.billing_settings_history (
      settings_id, changed_by, changed_fields,
      eid_month_1, eid_month_2, eid_due_day_1, eid_due_day_2, regular_due_day, other_due_offset_days
    ) VALUES (
      NEW.id, auth.uid(), ARRAY['initial'],
      NEW.eid_month_1, NEW.eid_month_2, NEW.eid_due_day_1, NEW.eid_due_day_2, NEW.regular_due_day, NEW.other_due_offset_days
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_billing_settings_change
AFTER INSERT OR UPDATE ON public.billing_settings
FOR EACH ROW EXECUTE FUNCTION public.log_billing_settings_change();
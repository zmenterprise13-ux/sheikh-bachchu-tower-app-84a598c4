
CREATE TABLE IF NOT EXISTS public.billing_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  eid_month_1 text,
  eid_month_2 text,
  eid_due_day_1 integer NOT NULL DEFAULT 10,
  eid_due_day_2 integer NOT NULL DEFAULT 10,
  regular_due_day integer NOT NULL DEFAULT 10,
  other_due_offset_days integer NOT NULL DEFAULT 15,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT eid_month_1_format CHECK (eid_month_1 IS NULL OR eid_month_1 ~ '^\d{4}-\d{2}$'),
  CONSTRAINT eid_month_2_format CHECK (eid_month_2 IS NULL OR eid_month_2 ~ '^\d{4}-\d{2}$'),
  CONSTRAINT eid_due_day_1_range CHECK (eid_due_day_1 BETWEEN 1 AND 28),
  CONSTRAINT eid_due_day_2_range CHECK (eid_due_day_2 BETWEEN 1 AND 28),
  CONSTRAINT regular_due_day_range CHECK (regular_due_day BETWEEN 1 AND 28),
  CONSTRAINT other_due_offset_range CHECK (other_due_offset_days BETWEEN 0 AND 60)
);

ALTER TABLE public.billing_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view billing settings"
  ON public.billing_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage billing settings"
  ON public.billing_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER billing_settings_updated_at
  BEFORE UPDATE ON public.billing_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.billing_settings (regular_due_day, other_due_offset_days)
SELECT 10, 15
WHERE NOT EXISTS (SELECT 1 FROM public.billing_settings);

ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS due_date date;

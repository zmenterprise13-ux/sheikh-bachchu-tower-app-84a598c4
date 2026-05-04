CREATE TABLE public.opening_cash_overrides (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month text NOT NULL UNIQUE,
  amount numeric NOT NULL DEFAULT 0,
  note text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT opening_cash_overrides_month_format CHECK (month ~ '^\d{4}-\d{2}$')
);

ALTER TABLE public.opening_cash_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage opening cash overrides"
ON public.opening_cash_overrides
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated view opening cash overrides"
ON public.opening_cash_overrides
FOR SELECT
TO authenticated
USING (true);

CREATE TRIGGER update_opening_cash_overrides_updated_at
BEFORE UPDATE ON public.opening_cash_overrides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
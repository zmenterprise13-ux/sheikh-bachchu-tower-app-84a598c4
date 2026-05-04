
CREATE TABLE public.other_incomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  source_name text,
  description text,
  reference text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.other_incomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage other incomes"
ON public.other_incomes FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners view other incomes"
ON public.other_incomes FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'owner'::app_role));

CREATE TRIGGER trg_other_incomes_updated_at
BEFORE UPDATE ON public.other_incomes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_other_incomes_date ON public.other_incomes(date);

-- Update monthly_finance_summary to include other_income
CREATE OR REPLACE FUNCTION public.monthly_finance_summary(_month text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _start date;
  _end date;
  _billed numeric;
  _collected numeric;
  _expense numeric;
  _other_income numeric;
  _by_cat jsonb;
  _by_income_cat jsonb;
  _is_admin boolean;
  _pub record;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _month !~ '^\d{4}-\d{2}$' THEN
    RAISE EXCEPTION 'Invalid month format, expected YYYY-MM';
  END IF;

  _is_admin := has_role(auth.uid(), 'admin'::app_role);
  SELECT * INTO _pub FROM public.published_monthly_reports WHERE month = _month;

  IF NOT _is_admin THEN
    IF _pub IS NULL THEN
      RETURN jsonb_build_object(
        'month', _month, 'published', false,
        'billed', 0, 'collected', 0, 'expense', 0, 'other_income', 0,
        'by_category', '[]'::jsonb, 'by_income_category', '[]'::jsonb
      );
    END IF;
    RETURN COALESCE(_pub.snapshot, '{}'::jsonb)
      || jsonb_build_object('month', _month, 'published', true,
        'published_at', _pub.published_at, 'notes', _pub.notes);
  END IF;

  _start := (_month || '-01')::date;
  _end := (_start + INTERVAL '1 month')::date;

  SELECT COALESCE(SUM(total),0), COALESCE(SUM(paid_amount),0)
    INTO _billed, _collected
  FROM public.bills WHERE month = _month;

  SELECT COALESCE(SUM(amount),0) INTO _expense
  FROM public.expenses WHERE date >= _start AND date < _end;

  SELECT COALESCE(SUM(amount),0) INTO _other_income
  FROM public.other_incomes WHERE date >= _start AND date < _end;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('category', category, 'amount', amt) ORDER BY amt DESC), '[]'::jsonb)
    INTO _by_cat
  FROM (SELECT category, SUM(amount)::numeric AS amt FROM public.expenses
        WHERE date >= _start AND date < _end GROUP BY category) s;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('category', category, 'amount', amt) ORDER BY amt DESC), '[]'::jsonb)
    INTO _by_income_cat
  FROM (SELECT category, SUM(amount)::numeric AS amt FROM public.other_incomes
        WHERE date >= _start AND date < _end GROUP BY category) s;

  RETURN jsonb_build_object(
    'month', _month,
    'billed', _billed,
    'collected', _collected,
    'expense', _expense,
    'other_income', _other_income,
    'by_category', _by_cat,
    'by_income_category', _by_income_cat,
    'published', _pub IS NOT NULL,
    'published_at', CASE WHEN _pub IS NOT NULL THEN _pub.published_at ELSE NULL END,
    'notes', CASE WHEN _pub IS NOT NULL THEN _pub.notes ELSE NULL END
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.publish_monthly_report(_month text, _notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _start date;
  _end date;
  _billed numeric;
  _collected numeric;
  _expense numeric;
  _other_income numeric;
  _by_cat jsonb;
  _by_income_cat jsonb;
  _snapshot jsonb;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can publish monthly reports';
  END IF;
  IF _month !~ '^\d{4}-\d{2}$' THEN
    RAISE EXCEPTION 'Invalid month format';
  END IF;

  _start := (_month || '-01')::date;
  _end := (_start + INTERVAL '1 month')::date;

  SELECT COALESCE(SUM(total),0), COALESCE(SUM(paid_amount),0) INTO _billed, _collected
  FROM public.bills WHERE month = _month;

  SELECT COALESCE(SUM(amount),0) INTO _expense
  FROM public.expenses WHERE date >= _start AND date < _end;

  SELECT COALESCE(SUM(amount),0) INTO _other_income
  FROM public.other_incomes WHERE date >= _start AND date < _end;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('category', category, 'amount', amt) ORDER BY amt DESC), '[]'::jsonb)
    INTO _by_cat
  FROM (SELECT category, SUM(amount)::numeric AS amt FROM public.expenses
        WHERE date >= _start AND date < _end GROUP BY category) s;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('category', category, 'amount', amt) ORDER BY amt DESC), '[]'::jsonb)
    INTO _by_income_cat
  FROM (SELECT category, SUM(amount)::numeric AS amt FROM public.other_incomes
        WHERE date >= _start AND date < _end GROUP BY category) s;

  _snapshot := jsonb_build_object(
    'billed', _billed, 'collected', _collected,
    'expense', _expense, 'other_income', _other_income,
    'by_category', _by_cat, 'by_income_category', _by_income_cat
  );

  INSERT INTO public.published_monthly_reports (month, published_at, published_by, notes, snapshot)
  VALUES (_month, now(), auth.uid(), _notes, _snapshot)
  ON CONFLICT (month) DO UPDATE
    SET published_at = now(), published_by = auth.uid(),
        notes = EXCLUDED.notes, snapshot = EXCLUDED.snapshot, updated_at = now();

  RETURN _snapshot || jsonb_build_object('month', _month, 'published', true);
END;
$function$;

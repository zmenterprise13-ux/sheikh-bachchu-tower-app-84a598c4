CREATE TABLE IF NOT EXISTS public.published_monthly_reports (
  month text PRIMARY KEY,
  published_at timestamptz NOT NULL DEFAULT now(),
  published_by uuid,
  notes text,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.published_monthly_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage published reports" ON public.published_monthly_reports;
CREATE POLICY "Admins manage published reports"
  ON public.published_monthly_reports
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated view published reports" ON public.published_monthly_reports;
CREATE POLICY "Authenticated view published reports"
  ON public.published_monthly_reports
  FOR SELECT TO authenticated
  USING (true);

DROP TRIGGER IF EXISTS update_published_monthly_reports_updated_at ON public.published_monthly_reports;
CREATE TRIGGER update_published_monthly_reports_updated_at
BEFORE UPDATE ON public.published_monthly_reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.monthly_finance_summary(_month text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _start date;
  _end date;
  _billed numeric;
  _collected numeric;
  _expense numeric;
  _by_cat jsonb;
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
        'month', _month,
        'published', false,
        'billed', 0,
        'collected', 0,
        'expense', 0,
        'by_category', '[]'::jsonb
      );
    END IF;
    RETURN COALESCE(_pub.snapshot, '{}'::jsonb)
      || jsonb_build_object(
        'month', _month,
        'published', true,
        'published_at', _pub.published_at,
        'notes', _pub.notes
      );
  END IF;

  _start := (_month || '-01')::date;
  _end := (_start + INTERVAL '1 month')::date;

  SELECT COALESCE(SUM(total),0), COALESCE(SUM(paid_amount),0)
    INTO _billed, _collected
  FROM public.bills WHERE month = _month;

  SELECT COALESCE(SUM(amount),0) INTO _expense
  FROM public.expenses WHERE date >= _start AND date < _end;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('category', category, 'amount', amt) ORDER BY amt DESC), '[]'::jsonb)
    INTO _by_cat
  FROM (
    SELECT category, SUM(amount)::numeric AS amt
    FROM public.expenses
    WHERE date >= _start AND date < _end
    GROUP BY category
  ) s;

  RETURN jsonb_build_object(
    'month', _month,
    'billed', _billed,
    'collected', _collected,
    'expense', _expense,
    'by_category', _by_cat,
    'published', _pub IS NOT NULL,
    'published_at', CASE WHEN _pub IS NOT NULL THEN _pub.published_at ELSE NULL END,
    'notes', CASE WHEN _pub IS NOT NULL THEN _pub.notes ELSE NULL END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.publish_monthly_report(_month text, _notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _start date;
  _end date;
  _billed numeric;
  _collected numeric;
  _expense numeric;
  _by_cat jsonb;
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

  SELECT COALESCE(SUM(total),0), COALESCE(SUM(paid_amount),0)
    INTO _billed, _collected
  FROM public.bills WHERE month = _month;

  SELECT COALESCE(SUM(amount),0) INTO _expense
  FROM public.expenses WHERE date >= _start AND date < _end;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('category', category, 'amount', amt) ORDER BY amt DESC), '[]'::jsonb)
    INTO _by_cat
  FROM (
    SELECT category, SUM(amount)::numeric AS amt
    FROM public.expenses
    WHERE date >= _start AND date < _end
    GROUP BY category
  ) s;

  _snapshot := jsonb_build_object(
    'billed', _billed,
    'collected', _collected,
    'expense', _expense,
    'by_category', _by_cat
  );

  INSERT INTO public.published_monthly_reports (month, published_at, published_by, notes, snapshot)
  VALUES (_month, now(), auth.uid(), _notes, _snapshot)
  ON CONFLICT (month) DO UPDATE
    SET published_at = now(),
        published_by = auth.uid(),
        notes = EXCLUDED.notes,
        snapshot = EXCLUDED.snapshot,
        updated_at = now();

  RETURN _snapshot || jsonb_build_object('month', _month, 'published', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.unpublish_monthly_report(_month text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can unpublish monthly reports';
  END IF;
  DELETE FROM public.published_monthly_reports WHERE month = _month;
END;
$$;

GRANT EXECUTE ON FUNCTION public.publish_monthly_report(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unpublish_monthly_report(text) TO authenticated;
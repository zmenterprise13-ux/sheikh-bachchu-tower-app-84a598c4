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
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _month !~ '^\d{4}-\d{2}$' THEN
    RAISE EXCEPTION 'Invalid month format, expected YYYY-MM';
  END IF;

  _start := (_month || '-01')::date;
  _end := (_start + INTERVAL '1 month')::date;

  SELECT COALESCE(SUM(total),0), COALESCE(SUM(paid_amount),0)
    INTO _billed, _collected
  FROM public.bills
  WHERE month = _month;

  SELECT COALESCE(SUM(amount),0)
    INTO _expense
  FROM public.expenses
  WHERE date >= _start AND date < _end;

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
    'by_category', _by_cat
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.monthly_finance_summary(text) TO authenticated;
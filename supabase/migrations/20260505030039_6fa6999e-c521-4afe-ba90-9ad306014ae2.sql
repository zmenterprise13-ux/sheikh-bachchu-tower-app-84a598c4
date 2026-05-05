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
  _loan_taken numeric;
  _loan_repaid numeric;
  _by_cat jsonb;
  _by_income_cat jsonb;
  _is_admin boolean;
  _pub record;
  _opening numeric := 0;
  _anchor record;
  _anchor_start date;
  _act_collected numeric := 0;
  _act_other numeric := 0;
  _act_loan_taken numeric := 0;
  _act_expense numeric := 0;
  _act_loan_repaid numeric := 0;
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
        'loan_taken', 0, 'loan_repaid', 0, 'opening_cash', 0,
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

  SELECT COALESCE(SUM(principal),0) INTO _loan_taken
  FROM public.loans WHERE loan_date >= _start AND loan_date < _end;

  SELECT COALESCE(SUM(amount),0) INTO _loan_repaid
  FROM public.loan_repayments WHERE paid_date >= _start AND paid_date < _end;

  -- Opening cash: anchor override at-or-before _month + activity between anchor and _month start
  SELECT month, amount INTO _anchor
  FROM public.opening_cash_overrides
  WHERE month <= _month
  ORDER BY month DESC
  LIMIT 1;

  IF _anchor.month IS NOT NULL THEN
    _opening := COALESCE(_anchor.amount, 0);
    _anchor_start := (_anchor.month || '-01')::date;
  ELSE
    _opening := 0;
    _anchor_start := '1900-01-01'::date;
  END IF;

  IF _anchor.month IS NULL OR _anchor.month <> _month THEN
    SELECT COALESCE(SUM(paid_amount),0) INTO _act_collected
    FROM public.bills
    WHERE month >= to_char(_anchor_start, 'YYYY-MM') AND month < _month;

    SELECT COALESCE(SUM(amount),0) INTO _act_other
    FROM public.other_incomes
    WHERE date >= _anchor_start AND date < _start;

    SELECT COALESCE(SUM(principal),0) INTO _act_loan_taken
    FROM public.loans
    WHERE loan_date >= _anchor_start AND loan_date < _start;

    SELECT COALESCE(SUM(amount),0) INTO _act_expense
    FROM public.expenses
    WHERE date >= _anchor_start AND date < _start;

    SELECT COALESCE(SUM(amount),0) INTO _act_loan_repaid
    FROM public.loan_repayments
    WHERE paid_date >= _anchor_start AND paid_date < _start;

    _opening := _opening + _act_collected + _act_other + _act_loan_taken
                         - _act_expense - _act_loan_repaid;
  END IF;

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
    'loan_taken', _loan_taken,
    'loan_repaid', _loan_repaid,
    'opening_cash', _opening,
    'by_category', _by_cat,
    'by_income_category', _by_income_cat,
    'published', _pub IS NOT NULL,
    'published_at', CASE WHEN _pub IS NOT NULL THEN _pub.published_at ELSE NULL END,
    'notes', CASE WHEN _pub IS NOT NULL THEN _pub.notes ELSE NULL END
  );
END;
$function$;
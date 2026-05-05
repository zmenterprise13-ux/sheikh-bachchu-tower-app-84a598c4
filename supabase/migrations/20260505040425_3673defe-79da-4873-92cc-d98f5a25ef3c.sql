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
  _flat_buckets jsonb;
  _bill_components jsonb;
  _loan_by_lender jsonb;
  _loan_repaid_by_lender jsonb;
  _outstanding_loans jsonb;
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

  SELECT COALESCE(jsonb_agg(jsonb_build_object('amount', amt, 'count', cnt) ORDER BY amt DESC), '[]'::jsonb)
    INTO _flat_buckets
  FROM (
    SELECT total::numeric AS amt, COUNT(*)::int AS cnt
    FROM public.bills WHERE month = _month AND total > 0
    GROUP BY total
  ) s;

  SELECT jsonb_object_agg(comp, rows) INTO _bill_components FROM (
    SELECT 'service_charge' AS comp, COALESCE(jsonb_agg(jsonb_build_object('rate', rate, 'count', cnt) ORDER BY rate DESC), '[]'::jsonb) AS rows
      FROM (SELECT service_charge::numeric AS rate, COUNT(*)::int AS cnt FROM public.bills
            WHERE month = _month AND service_charge > 0 GROUP BY service_charge) x
    UNION ALL
    SELECT 'gas_bill', COALESCE(jsonb_agg(jsonb_build_object('rate', rate, 'count', cnt) ORDER BY rate DESC), '[]'::jsonb)
      FROM (SELECT gas_bill::numeric AS rate, COUNT(*)::int AS cnt FROM public.bills
            WHERE month = _month AND gas_bill > 0 GROUP BY gas_bill) x
    UNION ALL
    SELECT 'parking', COALESCE(jsonb_agg(jsonb_build_object('rate', rate, 'count', cnt) ORDER BY rate DESC), '[]'::jsonb)
      FROM (SELECT parking::numeric AS rate, COUNT(*)::int AS cnt FROM public.bills
            WHERE month = _month AND parking > 0 GROUP BY parking) x
    UNION ALL
    SELECT 'eid_bonus', COALESCE(jsonb_agg(jsonb_build_object('rate', rate, 'count', cnt) ORDER BY rate DESC), '[]'::jsonb)
      FROM (SELECT eid_bonus::numeric AS rate, COUNT(*)::int AS cnt FROM public.bills
            WHERE month = _month AND eid_bonus > 0 GROUP BY eid_bonus) x
    UNION ALL
    SELECT 'other_charge', COALESCE(jsonb_agg(jsonb_build_object('rate', rate, 'count', cnt) ORDER BY rate DESC), '[]'::jsonb)
      FROM (SELECT other_charge::numeric AS rate, COUNT(*)::int AS cnt FROM public.bills
            WHERE month = _month AND other_charge > 0 GROUP BY other_charge) x
  ) c;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('lender', lender, 'lender_bn', lender_bn, 'amount', amt) ORDER BY amt DESC), '[]'::jsonb)
    INTO _loan_by_lender
  FROM (SELECT lender_name AS lender, lender_name_bn AS lender_bn, SUM(principal)::numeric AS amt
        FROM public.loans WHERE loan_date >= _start AND loan_date < _end
        GROUP BY lender_name, lender_name_bn) s;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('lender', lender, 'lender_bn', lender_bn, 'amount', amt) ORDER BY amt DESC), '[]'::jsonb)
    INTO _loan_repaid_by_lender
  FROM (SELECT l.lender_name AS lender, l.lender_name_bn AS lender_bn, SUM(lr.amount)::numeric AS amt
        FROM public.loan_repayments lr
        JOIN public.loans l ON l.id = lr.loan_id
        WHERE lr.paid_date >= _start AND lr.paid_date < _end
        GROUP BY l.lender_name, l.lender_name_bn) s;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('lender', lender, 'lender_bn', lender_bn, 'outstanding', outstanding) ORDER BY outstanding DESC), '[]'::jsonb)
    INTO _outstanding_loans
  FROM (
    SELECT l.lender_name AS lender,
           l.lender_name_bn AS lender_bn,
           (SUM(l.principal) - COALESCE((
              SELECT SUM(lr.amount) FROM public.loan_repayments lr
              JOIN public.loans l2 ON l2.id = lr.loan_id
              WHERE l2.lender_name = l.lender_name
                AND COALESCE(l2.lender_name_bn,'') = COALESCE(l.lender_name_bn,'')
                AND lr.paid_date < _end
           ),0))::numeric AS outstanding
    FROM public.loans l
    WHERE l.loan_date < _end
    GROUP BY l.lender_name, l.lender_name_bn
    HAVING (SUM(l.principal) - COALESCE((
              SELECT SUM(lr.amount) FROM public.loan_repayments lr
              JOIN public.loans l2 ON l2.id = lr.loan_id
              WHERE l2.lender_name = l.lender_name
                AND COALESCE(l2.lender_name_bn,'') = COALESCE(l.lender_name_bn,'')
                AND lr.paid_date < _end
           ),0)) > 0
  ) s;

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
    'flat_buckets', _flat_buckets,
    'bill_components', COALESCE(_bill_components, '{}'::jsonb),
    'loan_by_lender', _loan_by_lender,
    'loan_repaid_by_lender', _loan_repaid_by_lender,
    'outstanding_loans', _outstanding_loans,
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
  _start date; _end date;
  _billed numeric; _collected numeric; _expense numeric; _other_income numeric;
  _loan_taken numeric; _loan_repaid numeric;
  _by_cat jsonb; _by_income_cat jsonb;
  _flat_buckets jsonb; _bill_components jsonb; _loan_by_lender jsonb;
  _loan_repaid_by_lender jsonb;
  _outstanding_loans jsonb;
  _opening_cash numeric;
  _anchor record;
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

  SELECT COALESCE(SUM(principal),0) INTO _loan_taken
  FROM public.loans WHERE loan_date >= _start AND loan_date < _end;

  SELECT COALESCE(SUM(amount),0) INTO _loan_repaid
  FROM public.loan_repayments WHERE paid_date >= _start AND paid_date < _end;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('category', category, 'amount', amt) ORDER BY amt DESC), '[]'::jsonb)
    INTO _by_cat
  FROM (SELECT category, SUM(amount)::numeric AS amt FROM public.expenses
        WHERE date >= _start AND date < _end GROUP BY category) s;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('category', category, 'amount', amt) ORDER BY amt DESC), '[]'::jsonb)
    INTO _by_income_cat
  FROM (SELECT category, SUM(amount)::numeric AS amt FROM public.other_incomes
        WHERE date >= _start AND date < _end GROUP BY category) s;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('amount', amt, 'count', cnt) ORDER BY amt DESC), '[]'::jsonb)
    INTO _flat_buckets
  FROM (
    SELECT total::numeric AS amt, COUNT(*)::int AS cnt
    FROM public.bills WHERE month = _month AND total > 0
    GROUP BY total
  ) s;

  SELECT jsonb_object_agg(comp, rows) INTO _bill_components FROM (
    SELECT 'service_charge' AS comp, COALESCE(jsonb_agg(jsonb_build_object('rate', rate, 'count', cnt) ORDER BY rate DESC), '[]'::jsonb) AS rows
      FROM (SELECT service_charge::numeric AS rate, COUNT(*)::int AS cnt FROM public.bills
            WHERE month = _month AND service_charge > 0 GROUP BY service_charge) x
    UNION ALL
    SELECT 'gas_bill', COALESCE(jsonb_agg(jsonb_build_object('rate', rate, 'count', cnt) ORDER BY rate DESC), '[]'::jsonb)
      FROM (SELECT gas_bill::numeric AS rate, COUNT(*)::int AS cnt FROM public.bills
            WHERE month = _month AND gas_bill > 0 GROUP BY gas_bill) x
    UNION ALL
    SELECT 'parking', COALESCE(jsonb_agg(jsonb_build_object('rate', rate, 'count', cnt) ORDER BY rate DESC), '[]'::jsonb)
      FROM (SELECT parking::numeric AS rate, COUNT(*)::int AS cnt FROM public.bills
            WHERE month = _month AND parking > 0 GROUP BY parking) x
    UNION ALL
    SELECT 'eid_bonus', COALESCE(jsonb_agg(jsonb_build_object('rate', rate, 'count', cnt) ORDER BY rate DESC), '[]'::jsonb)
      FROM (SELECT eid_bonus::numeric AS rate, COUNT(*)::int AS cnt FROM public.bills
            WHERE month = _month AND eid_bonus > 0 GROUP BY eid_bonus) x
    UNION ALL
    SELECT 'other_charge', COALESCE(jsonb_agg(jsonb_build_object('rate', rate, 'count', cnt) ORDER BY rate DESC), '[]'::jsonb)
      FROM (SELECT other_charge::numeric AS rate, COUNT(*)::int AS cnt FROM public.bills
            WHERE month = _month AND other_charge > 0 GROUP BY other_charge) x
  ) c;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('lender', lender, 'lender_bn', lender_bn, 'amount', amt) ORDER BY amt DESC), '[]'::jsonb)
    INTO _loan_by_lender
  FROM (SELECT lender_name AS lender, lender_name_bn AS lender_bn, SUM(principal)::numeric AS amt
        FROM public.loans WHERE loan_date >= _start AND loan_date < _end
        GROUP BY lender_name, lender_name_bn) s;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('lender', lender, 'lender_bn', lender_bn, 'amount', amt) ORDER BY amt DESC), '[]'::jsonb)
    INTO _loan_repaid_by_lender
  FROM (SELECT l.lender_name AS lender, l.lender_name_bn AS lender_bn, SUM(lr.amount)::numeric AS amt
        FROM public.loan_repayments lr
        JOIN public.loans l ON l.id = lr.loan_id
        WHERE lr.paid_date >= _start AND lr.paid_date < _end
        GROUP BY l.lender_name, l.lender_name_bn) s;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('lender', lender, 'lender_bn', lender_bn, 'outstanding', outstanding) ORDER BY outstanding DESC), '[]'::jsonb)
    INTO _outstanding_loans
  FROM (
    SELECT l.lender_name AS lender,
           l.lender_name_bn AS lender_bn,
           (SUM(l.principal) - COALESCE((
              SELECT SUM(lr.amount) FROM public.loan_repayments lr
              JOIN public.loans l2 ON l2.id = lr.loan_id
              WHERE l2.lender_name = l.lender_name
                AND COALESCE(l2.lender_name_bn,'') = COALESCE(l.lender_name_bn,'')
                AND lr.paid_date < _end
           ),0))::numeric AS outstanding
    FROM public.loans l
    WHERE l.loan_date < _end
    GROUP BY l.lender_name, l.lender_name_bn
    HAVING (SUM(l.principal) - COALESCE((
              SELECT SUM(lr.amount) FROM public.loan_repayments lr
              JOIN public.loans l2 ON l2.id = lr.loan_id
              WHERE l2.lender_name = l.lender_name
                AND COALESCE(l2.lender_name_bn,'') = COALESCE(l.lender_name_bn,'')
                AND lr.paid_date < _end
           ),0)) > 0
  ) s;

  SELECT month, amount INTO _anchor
  FROM public.opening_cash_overrides WHERE month <= _month
  ORDER BY month DESC LIMIT 1;

  IF _anchor.month IS NOT NULL AND _anchor.month = _month THEN
    _opening_cash := _anchor.amount;
  ELSE
    DECLARE
      _anchor_date date := COALESCE((_anchor.month || '-01')::date, '1900-01-01'::date);
      _prev_collected numeric; _prev_other numeric; _prev_expense numeric;
      _prev_loan_in numeric; _prev_loan_out numeric;
    BEGIN
      SELECT COALESCE(SUM(paid_amount),0) INTO _prev_collected FROM public.bills
        WHERE month >= COALESCE(_anchor.month,'') AND month < _month;
      SELECT COALESCE(SUM(amount),0) INTO _prev_other FROM public.other_incomes
        WHERE date >= _anchor_date AND date < _start;
      SELECT COALESCE(SUM(amount),0) INTO _prev_expense FROM public.expenses
        WHERE date >= _anchor_date AND date < _start;
      SELECT COALESCE(SUM(principal),0) INTO _prev_loan_in FROM public.loans
        WHERE loan_date >= _anchor_date AND loan_date < _start;
      SELECT COALESCE(SUM(amount),0) INTO _prev_loan_out FROM public.loan_repayments
        WHERE paid_date >= _anchor_date AND paid_date < _start;
      _opening_cash := COALESCE(_anchor.amount,0) + _prev_collected + _prev_other - _prev_expense + _prev_loan_in - _prev_loan_out;
    END;
  END IF;

  _snapshot := jsonb_build_object(
    'billed', _billed, 'collected', _collected,
    'expense', _expense, 'other_income', _other_income,
    'loan_taken', _loan_taken, 'loan_repaid', _loan_repaid,
    'by_category', _by_cat, 'by_income_category', _by_income_cat,
    'flat_buckets', _flat_buckets,
    'bill_components', COALESCE(_bill_components, '{}'::jsonb),
    'loan_by_lender', _loan_by_lender,
    'loan_repaid_by_lender', _loan_repaid_by_lender,
    'outstanding_loans', _outstanding_loans,
    'opening_cash', _opening_cash
  );

  INSERT INTO public.published_monthly_reports (month, published_at, published_by, notes, snapshot)
  VALUES (_month, now(), auth.uid(), _notes, _snapshot)
  ON CONFLICT (month) DO UPDATE
    SET published_at = now(), published_by = auth.uid(),
        notes = EXCLUDED.notes, snapshot = EXCLUDED.snapshot, updated_at = now();

  RETURN _snapshot || jsonb_build_object('month', _month, 'published', true);
END;
$function$;
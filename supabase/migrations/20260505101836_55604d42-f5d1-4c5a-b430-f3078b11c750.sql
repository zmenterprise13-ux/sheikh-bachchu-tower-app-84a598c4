
-- Staff (accountant + manager) read access + role-scoped writes

-- Helper: anything authenticated staff/admin can read
-- BILLS: staff can view all
CREATE POLICY "Staff view bills" ON public.bills
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'accountant') OR has_role(auth.uid(),'manager'));

-- PAYMENT REQUESTS: accountant manage; manager view
CREATE POLICY "Accountant manage payment requests" ON public.payment_requests
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'accountant'))
  WITH CHECK (has_role(auth.uid(),'accountant'));

CREATE POLICY "Manager view payment requests" ON public.payment_requests
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'manager'));

-- BILLS write for accountant
CREATE POLICY "Accountant manage bills" ON public.bills
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'accountant'))
  WITH CHECK (has_role(auth.uid(),'accountant'));

-- EXPENSES: accountant manage, manager view
CREATE POLICY "Accountant manage expenses" ON public.expenses
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'accountant'))
  WITH CHECK (has_role(auth.uid(),'accountant'));

CREATE POLICY "Staff view expenses" ON public.expenses
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'manager'));

-- OTHER INCOMES
CREATE POLICY "Accountant manage other incomes" ON public.other_incomes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'accountant'))
  WITH CHECK (has_role(auth.uid(),'accountant'));

CREATE POLICY "Manager view other incomes" ON public.other_incomes
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'manager'));

-- EXPENSE CATEGORIES: accountant manage
CREATE POLICY "Accountant manage expense categories" ON public.expense_categories
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'accountant'))
  WITH CHECK (has_role(auth.uid(),'accountant'));

-- LOANS: manager + accountant manage
CREATE POLICY "Staff manage loans" ON public.loans
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'manager') OR has_role(auth.uid(),'accountant'))
  WITH CHECK (has_role(auth.uid(),'manager') OR has_role(auth.uid(),'accountant'));

CREATE POLICY "Staff manage loan repayments" ON public.loan_repayments
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'manager') OR has_role(auth.uid(),'accountant'))
  WITH CHECK (has_role(auth.uid(),'manager') OR has_role(auth.uid(),'accountant'));

-- FLATS: manager manage; accountant view (already authenticated can view all)
CREATE POLICY "Manager manage flats" ON public.flats
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'manager'))
  WITH CHECK (has_role(auth.uid(),'manager'));

-- SHOPS: manager manage
CREATE POLICY "Manager manage shops" ON public.shops
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'manager'))
  WITH CHECK (has_role(auth.uid(),'manager'));

CREATE POLICY "Staff view shops" ON public.shops
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'accountant') OR has_role(auth.uid(),'manager'));

-- PARKING: manager manage (authenticated already can view)
CREATE POLICY "Manager manage parking" ON public.parking_slots
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'manager'))
  WITH CHECK (has_role(auth.uid(),'manager'));

-- NOTICES: manager manage (authenticated already view)
CREATE POLICY "Manager manage notices" ON public.notices
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'manager'))
  WITH CHECK (has_role(auth.uid(),'manager'));

-- COMMITTEE: manager manage
CREATE POLICY "Manager manage committee" ON public.committee_members
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'manager'))
  WITH CHECK (has_role(auth.uid(),'manager'));

-- TENANT INFO: manager manage
CREATE POLICY "Manager manage tenant info" ON public.tenant_info
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'manager'))
  WITH CHECK (has_role(auth.uid(),'manager'));

CREATE POLICY "Manager manage tenant family" ON public.tenant_family_members
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'manager'))
  WITH CHECK (has_role(auth.uid(),'manager'));

-- PROFILES: staff view all (for showing user names in admin pages)
CREATE POLICY "Staff view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'accountant') OR has_role(auth.uid(),'manager'));

-- USER ROLES: staff view all (read-only)
CREATE POLICY "Staff view all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'accountant') OR has_role(auth.uid(),'manager'));

-- PUBLISHED REPORTS: already viewable
-- OPENING CASH: already viewable; allow accountant manage
CREATE POLICY "Accountant manage opening cash overrides" ON public.opening_cash_overrides
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'accountant'))
  WITH CHECK (has_role(auth.uid(),'accountant'));

-- Update monthly_finance_summary to allow staff to see admin-view (not just owners gated)
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
  _is_staff boolean;
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

  _is_staff := has_role(auth.uid(), 'admin'::app_role)
            OR has_role(auth.uid(), 'accountant'::app_role)
            OR has_role(auth.uid(), 'manager'::app_role);
  SELECT * INTO _pub FROM public.published_monthly_reports WHERE month = _month;

  IF NOT _is_staff THEN
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

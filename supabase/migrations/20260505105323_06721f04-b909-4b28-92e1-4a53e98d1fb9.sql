
-- ===== LOANS =====
DROP POLICY IF EXISTS "Staff manage loans" ON public.loans;

CREATE POLICY "Manager manage loans"
  ON public.loans FOR ALL TO authenticated
  USING (has_role(auth.uid(),'manager'::app_role))
  WITH CHECK (has_role(auth.uid(),'manager'::app_role));

CREATE POLICY "Accountant insert loans"
  ON public.loans FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(),'accountant'::app_role)
    AND approval_status = 'pending'
    AND submitted_by = auth.uid()
  );

CREATE POLICY "Accountant view loans"
  ON public.loans FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'accountant'::app_role));

-- ===== LOAN REPAYMENTS =====
DROP POLICY IF EXISTS "Staff manage loan repayments" ON public.loan_repayments;

CREATE POLICY "Manager manage loan repayments"
  ON public.loan_repayments FOR ALL TO authenticated
  USING (has_role(auth.uid(),'manager'::app_role))
  WITH CHECK (has_role(auth.uid(),'manager'::app_role));

CREATE POLICY "Accountant insert loan repayments"
  ON public.loan_repayments FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(),'accountant'::app_role)
    AND approval_status = 'pending'
    AND submitted_by = auth.uid()
  );

CREATE POLICY "Accountant view loan repayments"
  ON public.loan_repayments FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'accountant'::app_role));

-- Make loan_repayments check constraint
DO $$ BEGIN
  ALTER TABLE public.loan_repayments ADD CONSTRAINT loan_repayments_approval_status_chk CHECK (approval_status IN ('pending','approved','rejected'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===== PAYMENT REQUESTS =====
DROP POLICY IF EXISTS "Accountant manage payment requests" ON public.payment_requests;

CREATE POLICY "Accountant view payment requests"
  ON public.payment_requests FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'accountant'::app_role));

CREATE POLICY "Manager manage payment requests"
  ON public.payment_requests FOR ALL TO authenticated
  USING (has_role(auth.uid(),'manager'::app_role))
  WITH CHECK (has_role(auth.uid(),'manager'::app_role));

DROP POLICY IF EXISTS "Manager view payment requests" ON public.payment_requests;

-- ===== Block accountant approvals via trigger =====
CREATE OR REPLACE FUNCTION public.apply_payment_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  b_total numeric;
  b_paid numeric;
  new_paid numeric;
BEGIN
  IF NEW.status IN ('approved','rejected') AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    IF NOT (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'manager'::app_role)) THEN
      RAISE EXCEPTION 'Only admin or manager can approve/reject payment requests';
    END IF;
  END IF;

  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    SELECT total, paid_amount INTO b_total, b_paid FROM public.bills WHERE id = NEW.bill_id FOR UPDATE;
    new_paid := COALESCE(b_paid,0) + COALESCE(NEW.amount,0);
    UPDATE public.bills
      SET paid_amount = new_paid,
          status = CASE
            WHEN new_paid >= COALESCE(b_total,0) AND COALESCE(b_total,0) > 0 THEN 'paid'::bill_status
            WHEN new_paid > 0 THEN 'partial'::bill_status
            ELSE 'unpaid'::bill_status
          END,
          paid_at = CASE WHEN new_paid >= COALESCE(b_total,0) AND COALESCE(b_total,0) > 0 THEN CURRENT_DATE ELSE paid_at END,
          updated_at = now()
      WHERE id = NEW.bill_id;
    NEW.reviewed_at := now();
  ELSIF NEW.status = 'rejected' AND (OLD.status IS DISTINCT FROM 'rejected') THEN
    NEW.reviewed_at := now();
  END IF;
  RETURN NEW;
END;
$function$;

-- ===== monthly_finance_summary: only approved rows count =====
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
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _month !~ '^\d{4}-\d{2}$' THEN RAISE EXCEPTION 'Invalid month format, expected YYYY-MM'; END IF;

  _is_staff := has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'accountant'::app_role) OR has_role(auth.uid(),'manager'::app_role);
  SELECT * INTO _pub FROM public.published_monthly_reports WHERE month = _month;

  IF NOT _is_staff THEN
    IF _pub IS NULL THEN
      RETURN jsonb_build_object('month',_month,'published',false,
        'billed',0,'collected',0,'expense',0,'other_income',0,
        'loan_taken',0,'loan_repaid',0,'opening_cash',0,
        'by_category','[]'::jsonb,'by_income_category','[]'::jsonb);
    END IF;
    RETURN COALESCE(_pub.snapshot,'{}'::jsonb)
      || jsonb_build_object('month',_month,'published',true,
        'published_at',_pub.published_at,'notes',_pub.notes);
  END IF;

  _start := (_month || '-01')::date;
  _end := (_start + INTERVAL '1 month')::date;

  SELECT COALESCE(SUM(total),0), COALESCE(SUM(paid_amount),0) INTO _billed, _collected
  FROM public.bills WHERE month = _month;

  SELECT COALESCE(SUM(amount),0) INTO _expense
  FROM public.expenses WHERE date >= _start AND date < _end AND approval_status='approved';

  SELECT COALESCE(SUM(amount),0) INTO _other_income
  FROM public.other_incomes WHERE date >= _start AND date < _end AND approval_status='approved';

  SELECT COALESCE(SUM(principal),0) INTO _loan_taken
  FROM public.loans WHERE loan_date >= _start AND loan_date < _end AND approval_status='approved';

  SELECT COALESCE(SUM(amount),0) INTO _loan_repaid
  FROM public.loan_repayments WHERE paid_date >= _start AND paid_date < _end AND approval_status='approved';

  SELECT month, amount INTO _anchor FROM public.opening_cash_overrides
  WHERE month <= _month ORDER BY month DESC LIMIT 1;

  IF _anchor.month IS NOT NULL THEN
    _opening := COALESCE(_anchor.amount,0);
    _anchor_start := (_anchor.month || '-01')::date;
  ELSE
    _opening := 0; _anchor_start := '1900-01-01'::date;
  END IF;

  IF _anchor.month IS NULL OR _anchor.month <> _month THEN
    SELECT COALESCE(SUM(paid_amount),0) INTO _act_collected FROM public.bills
      WHERE month >= to_char(_anchor_start,'YYYY-MM') AND month < _month;
    SELECT COALESCE(SUM(amount),0) INTO _act_other FROM public.other_incomes
      WHERE date >= _anchor_start AND date < _start AND approval_status='approved';
    SELECT COALESCE(SUM(principal),0) INTO _act_loan_taken FROM public.loans
      WHERE loan_date >= _anchor_start AND loan_date < _start AND approval_status='approved';
    SELECT COALESCE(SUM(amount),0) INTO _act_expense FROM public.expenses
      WHERE date >= _anchor_start AND date < _start AND approval_status='approved';
    SELECT COALESCE(SUM(amount),0) INTO _act_loan_repaid FROM public.loan_repayments
      WHERE paid_date >= _anchor_start AND paid_date < _start AND approval_status='approved';
    _opening := _opening + _act_collected + _act_other + _act_loan_taken - _act_expense - _act_loan_repaid;
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('category',category,'amount',amt) ORDER BY amt DESC),'[]'::jsonb) INTO _by_cat
  FROM (SELECT category, SUM(amount)::numeric AS amt FROM public.expenses
        WHERE date >= _start AND date < _end AND approval_status='approved' GROUP BY category) s;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('category',category,'amount',amt) ORDER BY amt DESC),'[]'::jsonb) INTO _by_income_cat
  FROM (SELECT category, SUM(amount)::numeric AS amt FROM public.other_incomes
        WHERE date >= _start AND date < _end AND approval_status='approved' GROUP BY category) s;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('amount',amt,'count',cnt) ORDER BY amt DESC),'[]'::jsonb) INTO _flat_buckets
  FROM (SELECT total::numeric AS amt, COUNT(*)::int AS cnt FROM public.bills
        WHERE month = _month AND total > 0 GROUP BY total) s;

  SELECT jsonb_object_agg(comp, rows) INTO _bill_components FROM (
    SELECT 'service_charge' AS comp, COALESCE(jsonb_agg(jsonb_build_object('rate',rate,'count',cnt) ORDER BY rate DESC),'[]'::jsonb) AS rows
      FROM (SELECT service_charge::numeric AS rate, COUNT(*)::int AS cnt FROM public.bills WHERE month=_month AND service_charge>0 GROUP BY service_charge) x
    UNION ALL
    SELECT 'gas_bill', COALESCE(jsonb_agg(jsonb_build_object('rate',rate,'count',cnt) ORDER BY rate DESC),'[]'::jsonb)
      FROM (SELECT gas_bill::numeric AS rate, COUNT(*)::int AS cnt FROM public.bills WHERE month=_month AND gas_bill>0 GROUP BY gas_bill) x
    UNION ALL
    SELECT 'parking', COALESCE(jsonb_agg(jsonb_build_object('rate',rate,'count',cnt) ORDER BY rate DESC),'[]'::jsonb)
      FROM (SELECT parking::numeric AS rate, COUNT(*)::int AS cnt FROM public.bills WHERE month=_month AND parking>0 GROUP BY parking) x
    UNION ALL
    SELECT 'eid_bonus', COALESCE(jsonb_agg(jsonb_build_object('rate',rate,'count',cnt) ORDER BY rate DESC),'[]'::jsonb)
      FROM (SELECT eid_bonus::numeric AS rate, COUNT(*)::int AS cnt FROM public.bills WHERE month=_month AND eid_bonus>0 GROUP BY eid_bonus) x
    UNION ALL
    SELECT 'other_charge', COALESCE(jsonb_agg(jsonb_build_object('rate',rate,'count',cnt) ORDER BY rate DESC),'[]'::jsonb)
      FROM (SELECT other_charge::numeric AS rate, COUNT(*)::int AS cnt FROM public.bills WHERE month=_month AND other_charge>0 GROUP BY other_charge) x
  ) c;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('lender',lender,'lender_bn',lender_bn,'amount',amt) ORDER BY amt DESC),'[]'::jsonb) INTO _loan_by_lender
  FROM (SELECT lender_name AS lender, lender_name_bn AS lender_bn, SUM(principal)::numeric AS amt FROM public.loans
        WHERE loan_date >= _start AND loan_date < _end AND approval_status='approved'
        GROUP BY lender_name, lender_name_bn) s;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('lender',lender,'lender_bn',lender_bn,'amount',amt) ORDER BY amt DESC),'[]'::jsonb) INTO _loan_repaid_by_lender
  FROM (SELECT l.lender_name AS lender, l.lender_name_bn AS lender_bn, SUM(lr.amount)::numeric AS amt
        FROM public.loan_repayments lr JOIN public.loans l ON l.id=lr.loan_id
        WHERE lr.paid_date >= _start AND lr.paid_date < _end AND lr.approval_status='approved' AND l.approval_status='approved'
        GROUP BY l.lender_name, l.lender_name_bn) s;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('lender',lender,'lender_bn',lender_bn,'outstanding',outstanding) ORDER BY outstanding DESC),'[]'::jsonb) INTO _outstanding_loans
  FROM (
    SELECT l.lender_name AS lender, l.lender_name_bn AS lender_bn,
      (SUM(l.principal) - COALESCE((
        SELECT SUM(lr.amount) FROM public.loan_repayments lr
        JOIN public.loans l2 ON l2.id=lr.loan_id
        WHERE l2.lender_name=l.lender_name AND COALESCE(l2.lender_name_bn,'')=COALESCE(l.lender_name_bn,'')
          AND lr.paid_date < _end AND lr.approval_status='approved'
      ),0))::numeric AS outstanding
    FROM public.loans l
    WHERE l.loan_date < _end AND l.approval_status='approved'
    GROUP BY l.lender_name, l.lender_name_bn
    HAVING (SUM(l.principal) - COALESCE((
        SELECT SUM(lr.amount) FROM public.loan_repayments lr
        JOIN public.loans l2 ON l2.id=lr.loan_id
        WHERE l2.lender_name=l.lender_name AND COALESCE(l2.lender_name_bn,'')=COALESCE(l.lender_name_bn,'')
          AND lr.paid_date < _end AND lr.approval_status='approved'
      ),0)) > 0
  ) s;

  RETURN jsonb_build_object(
    'month',_month,'billed',_billed,'collected',_collected,
    'expense',_expense,'other_income',_other_income,
    'loan_taken',_loan_taken,'loan_repaid',_loan_repaid,'opening_cash',_opening,
    'by_category',_by_cat,'by_income_category',_by_income_cat,
    'flat_buckets',_flat_buckets,'bill_components',COALESCE(_bill_components,'{}'::jsonb),
    'loan_by_lender',_loan_by_lender,'loan_repaid_by_lender',_loan_repaid_by_lender,
    'outstanding_loans',_outstanding_loans,
    'published',_pub IS NOT NULL,
    'published_at',CASE WHEN _pub IS NOT NULL THEN _pub.published_at ELSE NULL END,
    'notes',CASE WHEN _pub IS NOT NULL THEN _pub.notes ELSE NULL END
  );
END;
$function$;
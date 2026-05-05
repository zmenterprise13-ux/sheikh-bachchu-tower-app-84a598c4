-- Allow accountant to insert payment_requests (for cash collection forwarded to admin approval)
DROP POLICY IF EXISTS "Accountant insert payment requests" ON public.payment_requests;
CREATE POLICY "Accountant insert payment requests"
  ON public.payment_requests FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'accountant'::app_role)
    AND submitted_by = auth.uid()
    AND status IN ('pending','reviewed')
  );

-- Allow accountant to update status from pending → reviewed (and add review_note)
DROP POLICY IF EXISTS "Accountant review payment requests" ON public.payment_requests;
CREATE POLICY "Accountant review payment requests"
  ON public.payment_requests FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'accountant'::app_role))
  WITH CHECK (has_role(auth.uid(), 'accountant'::app_role));

-- Update trigger: accountant can set 'reviewed', only admin/manager can approve/reject
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

  IF NEW.status = 'reviewed' AND (OLD.status IS DISTINCT FROM 'reviewed') THEN
    IF NOT (has_role(auth.uid(),'accountant'::app_role) OR has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'manager'::app_role)) THEN
      RAISE EXCEPTION 'Only staff can mark as reviewed';
    END IF;
    NEW.reviewed_at := now();
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
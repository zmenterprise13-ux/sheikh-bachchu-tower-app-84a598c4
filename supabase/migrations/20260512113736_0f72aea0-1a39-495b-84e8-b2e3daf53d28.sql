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
  _uid uuid := auth.uid();
BEGIN
  IF NEW.status IN ('approved','rejected') AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    -- Allow system / service-role updates (e.g. SSLCommerz IPN) when no auth user is present
    IF _uid IS NOT NULL AND NOT (has_role(_uid,'admin'::app_role) OR has_role(_uid,'manager'::app_role)) THEN
      RAISE EXCEPTION 'Only admin or manager can approve/reject payment requests';
    END IF;
  END IF;

  IF NEW.status = 'reviewed' AND (OLD.status IS DISTINCT FROM 'reviewed') THEN
    IF _uid IS NOT NULL AND NOT (has_role(_uid,'accountant'::app_role) OR has_role(_uid,'admin'::app_role) OR has_role(_uid,'manager'::app_role)) THEN
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
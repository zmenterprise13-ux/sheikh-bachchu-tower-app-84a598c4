
CREATE TABLE IF NOT EXISTS public.payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id uuid NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  flat_id uuid NOT NULL REFERENCES public.flats(id) ON DELETE CASCADE,
  submitted_by uuid,
  amount numeric NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'cash',
  reference text,
  note text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pr_bill ON public.payment_requests(bill_id);
CREATE INDEX IF NOT EXISTS idx_pr_flat ON public.payment_requests(flat_id);
CREATE INDEX IF NOT EXISTS idx_pr_status ON public.payment_requests(status);

ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage payment requests"
ON public.payment_requests FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners view own payment requests"
ON public.payment_requests FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM flats f WHERE f.id = payment_requests.flat_id AND f.owner_user_id = auth.uid()));

CREATE POLICY "Owners insert own payment requests"
ON public.payment_requests FOR INSERT TO authenticated
WITH CHECK (
  submitted_by = auth.uid()
  AND EXISTS (SELECT 1 FROM flats f WHERE f.id = payment_requests.flat_id AND f.owner_user_id = auth.uid())
  AND status = 'pending'
);

CREATE TRIGGER trg_pr_updated_at
BEFORE UPDATE ON public.payment_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Apply payment to bill when approved
CREATE OR REPLACE FUNCTION public.apply_payment_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  b_total numeric;
  b_paid numeric;
  new_paid numeric;
BEGIN
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
$$;

CREATE TRIGGER trg_apply_payment_request
BEFORE UPDATE ON public.payment_requests
FOR EACH ROW EXECUTE FUNCTION public.apply_payment_request();

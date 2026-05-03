
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS arrears numeric NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.bills_recompute_total()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.total := COALESCE(NEW.service_charge,0)
             + COALESCE(NEW.gas_bill,0)
             + COALESCE(NEW.parking,0)
             + COALESCE(NEW.eid_bonus,0)
             + COALESCE(NEW.other_charge,0)
             + COALESCE(NEW.arrears,0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bills_recompute_total_trg ON public.bills;
CREATE TRIGGER bills_recompute_total_trg
BEFORE INSERT OR UPDATE ON public.bills
FOR EACH ROW EXECUTE FUNCTION public.bills_recompute_total();

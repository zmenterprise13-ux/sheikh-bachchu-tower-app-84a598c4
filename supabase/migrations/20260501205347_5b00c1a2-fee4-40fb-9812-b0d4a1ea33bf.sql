
ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS eid_bonus numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_charge numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_note text;

ALTER TABLE public.flats
  ADD COLUMN IF NOT EXISTS eid_bonus numeric NOT NULL DEFAULT 0;

-- Recompute total whenever charges change
CREATE OR REPLACE FUNCTION public.bills_recompute_total()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.total := COALESCE(NEW.service_charge,0)
             + COALESCE(NEW.gas_bill,0)
             + COALESCE(NEW.parking,0)
             + COALESCE(NEW.eid_bonus,0)
             + COALESCE(NEW.other_charge,0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bills_recompute_total ON public.bills;
CREATE TRIGGER trg_bills_recompute_total
BEFORE INSERT OR UPDATE ON public.bills
FOR EACH ROW EXECUTE FUNCTION public.bills_recompute_total();

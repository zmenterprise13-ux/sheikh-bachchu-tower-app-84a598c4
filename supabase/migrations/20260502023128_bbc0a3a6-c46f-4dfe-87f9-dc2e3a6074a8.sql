-- New enum for bill generation status
DO $$ BEGIN
  CREATE TYPE public.bill_generation_status AS ENUM ('generated', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS generation_status public.bill_generation_status NOT NULL DEFAULT 'generated',
  ADD COLUMN IF NOT EXISTS generation_error text;

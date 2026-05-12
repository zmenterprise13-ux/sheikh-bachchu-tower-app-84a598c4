
ALTER TABLE public.payment_requests
  ADD COLUMN IF NOT EXISTS gateway_tran_id text,
  ADD COLUMN IF NOT EXISTS gateway_val_id text,
  ADD COLUMN IF NOT EXISTS gateway_raw jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS payment_requests_gateway_tran_id_uq
  ON public.payment_requests (gateway_tran_id)
  WHERE gateway_tran_id IS NOT NULL;

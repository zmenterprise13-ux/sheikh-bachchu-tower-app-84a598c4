
-- Sequential receipt number for payment_requests (format BTW0000001 in app)
CREATE SEQUENCE IF NOT EXISTS public.payment_request_receipt_seq START 1;

ALTER TABLE public.payment_requests
  ADD COLUMN IF NOT EXISTS receipt_seq bigint;

-- Backfill existing rows in chronological order
WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY created_at, id) AS rn
  FROM public.payment_requests
  WHERE receipt_seq IS NULL
)
UPDATE public.payment_requests pr
SET receipt_seq = ordered.rn
FROM ordered
WHERE pr.id = ordered.id;

-- Advance sequence past existing values
SELECT setval('public.payment_request_receipt_seq',
  GREATEST(COALESCE((SELECT MAX(receipt_seq) FROM public.payment_requests), 0), 1),
  true);

-- Default for new rows
ALTER TABLE public.payment_requests
  ALTER COLUMN receipt_seq SET DEFAULT nextval('public.payment_request_receipt_seq');

ALTER TABLE public.payment_requests
  ALTER COLUMN receipt_seq SET NOT NULL;

-- Unique
CREATE UNIQUE INDEX IF NOT EXISTS payment_requests_receipt_seq_key
  ON public.payment_requests(receipt_seq);

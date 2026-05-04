
-- Backfill any null holding_no with a placeholder so we can enforce NOT NULL
UPDATE public.flats
SET holding_no = 'H-' || flat_no
WHERE holding_no IS NULL OR btrim(holding_no) = '';

ALTER TABLE public.flats
  ALTER COLUMN holding_no SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS flats_holding_no_unique
  ON public.flats (lower(btrim(holding_no)));

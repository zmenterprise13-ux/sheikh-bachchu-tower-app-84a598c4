ALTER TABLE public.committee_members
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS bio_bn text;
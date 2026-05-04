ALTER TABLE public.committee_members
  ADD COLUMN IF NOT EXISTS flat_id uuid REFERENCES public.flats(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_committee_members_flat_id ON public.committee_members(flat_id);
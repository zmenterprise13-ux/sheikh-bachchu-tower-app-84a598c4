ALTER TABLE public.committee_members
ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'committee';

CREATE INDEX IF NOT EXISTS idx_committee_members_category ON public.committee_members(category);
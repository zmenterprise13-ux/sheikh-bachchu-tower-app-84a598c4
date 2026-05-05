
-- 1) Add approval columns to financial tables
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS reject_reason text,
  ADD COLUMN IF NOT EXISTS submitted_by uuid;

ALTER TABLE public.other_incomes
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS reject_reason text,
  ADD COLUMN IF NOT EXISTS submitted_by uuid;

ALTER TABLE public.loans
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS reject_reason text,
  ADD COLUMN IF NOT EXISTS submitted_by uuid;

ALTER TABLE public.loan_repayments
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS reject_reason text,
  ADD COLUMN IF NOT EXISTS submitted_by uuid;

-- Constrain values
DO $$ BEGIN
  ALTER TABLE public.expenses ADD CONSTRAINT expenses_approval_status_chk CHECK (approval_status IN ('pending','approved','rejected'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.other_incomes ADD CONSTRAINT other_incomes_approval_status_chk CHECK (approval_status IN ('pending','approved','rejected'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.loans ADD CONSTRAINT loans_approval_status_chk CHECK (approval_status IN ('pending','approved','rejected'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
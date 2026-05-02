-- Loans table: building-er pokkho theke ke kar kach theke loan niyeche
CREATE TABLE public.loans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lender_flat_id UUID REFERENCES public.flats(id) ON DELETE SET NULL,
  lender_name TEXT NOT NULL,
  lender_name_bn TEXT,
  principal NUMERIC NOT NULL DEFAULT 0,
  loan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  purpose TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active | settled
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_loans_lender_flat ON public.loans(lender_flat_id);
CREATE INDEX idx_loans_status ON public.loans(status);

ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage loans"
ON public.loans FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_loans_updated_at
BEFORE UPDATE ON public.loans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Repayments
CREATE TABLE public.loan_repayments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  paid_date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_loan_repayments_loan ON public.loan_repayments(loan_id);

ALTER TABLE public.loan_repayments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage loan repayments"
ON public.loan_repayments FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_loan_repayments_updated_at
BEFORE UPDATE ON public.loan_repayments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== EXPENSES =====
DROP POLICY IF EXISTS "Accountant manage expenses" ON public.expenses;

CREATE POLICY "Accountant insert expenses"
  ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(),'accountant'::app_role)
    AND approval_status = 'pending'
    AND submitted_by = auth.uid()
  );

CREATE POLICY "Accountant view expenses"
  ON public.expenses FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'accountant'::app_role));

-- ===== OTHER INCOMES =====
DROP POLICY IF EXISTS "Accountant manage other incomes" ON public.other_incomes;

CREATE POLICY "Accountant insert other incomes"
  ON public.other_incomes FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(),'accountant'::app_role)
    AND approval_status = 'pending'
    AND submitted_by = auth.uid()
  );

CREATE POLICY "Accountant view other incomes"
  ON public.other_incomes FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'accountant'::app_role));

-- ===== LOANS =====
-- Existing "Staff manage loans" allows accountant 
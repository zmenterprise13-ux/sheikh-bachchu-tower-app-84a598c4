
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_type text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('expense-attachments', 'expense-attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read expense attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'expense-attachments');

CREATE POLICY "Staff upload expense attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'expense-attachments'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
    OR public.has_role(auth.uid(), 'accountant'::app_role)
  )
);

CREATE POLICY "Staff update expense attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'expense-attachments'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
    OR public.has_role(auth.uid(), 'accountant'::app_role)
  )
);

CREATE POLICY "Staff delete expense attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'expense-attachments'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
    OR public.has_role(auth.uid(), 'accountant'::app_role)
  )
);

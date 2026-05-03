CREATE TABLE public.expense_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_bn TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(name)
);

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage expense categories"
ON public.expense_categories
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated view expense categories"
ON public.expense_categories
FOR SELECT
TO authenticated
USING (true);

CREATE TRIGGER update_expense_categories_updated_at
BEFORE UPDATE ON public.expense_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.expense_categories (name, name_bn, sort_order) VALUES
  ('Caretaker Salary', 'কেয়ারটেকার বেতন', 1),
  ('Security', 'নিরাপত্তা', 2),
  ('Cleaning', 'পরিচ্ছন্নতা', 3),
  ('Electricity', 'বিদ্যুৎ', 4),
  ('Water Pump', 'পানির পাম্প', 5),
  ('Lift Maintenance', 'লিফট মেইনটেন্যান্স', 6),
  ('Repair', 'মেরামত', 7),
  ('Others', 'অন্যান্য', 8);
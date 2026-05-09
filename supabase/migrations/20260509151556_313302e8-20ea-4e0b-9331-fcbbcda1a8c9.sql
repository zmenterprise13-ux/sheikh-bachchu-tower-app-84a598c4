ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS service_month text;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_service_month_format CHECK (service_month IS NULL OR service_month ~ '^\d{4}-\d{2}$');
CREATE INDEX IF NOT EXISTS idx_expenses_service_month ON public.expenses(service_month);
CREATE TABLE public.tenancy_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flat_id uuid NOT NULL,
  tenant_name text NOT NULL,
  tenant_name_bn text,
  phone text,
  nid_number text,
  occupation text,
  photo_url text,
  family_count integer NOT NULL DEFAULT 0,
  move_in_date date,
  move_out_date date,
  move_out_month text,
  leave_reason text,
  notes text,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  archived_by uuid,
  archived_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenancy_periods_flat ON public.tenancy_periods(flat_id, move_out_date DESC);

ALTER TABLE public.tenancy_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage tenancy periods"
ON public.tenancy_periods FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Manager manage tenancy periods"
ON public.tenancy_periods FOR ALL TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Owners view own flat tenancy periods"
ON public.tenancy_periods FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM flats f WHERE f.id = tenancy_periods.flat_id AND f.owner_user_id = auth.uid()));

CREATE POLICY "Owners insert own flat tenancy periods"
ON public.tenancy_periods FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM flats f WHERE f.id = tenancy_periods.flat_id AND f.owner_user_id = auth.uid()));

CREATE POLICY "Tenants view own flat tenancy periods"
ON public.tenancy_periods FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM flats f WHERE f.id = tenancy_periods.flat_id AND f.tenant_user_id = auth.uid()));

CREATE TRIGGER update_tenancy_periods_updated_at
BEFORE UPDATE ON public.tenancy_periods
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
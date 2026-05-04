-- Tenant info table (one per flat)
CREATE TABLE public.tenant_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flat_id uuid NOT NULL UNIQUE,
  tenant_name text NOT NULL,
  tenant_name_bn text,
  father_name text,
  mother_name text,
  spouse_name text,
  permanent_address text,
  present_address text,
  phone text,
  emergency_phone text,
  email text,
  occupation text,
  workplace text,
  nid_number text,
  photo_url text,
  move_in_date date,
  total_members integer DEFAULT 0,
  notes text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenant_info_flat_id ON public.tenant_info(flat_id);

ALTER TABLE public.tenant_info ENABLE ROW LEVEL SECURITY;

-- Admins manage all
CREATE POLICY "Admins manage tenant info" ON public.tenant_info
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Flat owners can view & manage tenant info for their own flat
CREATE POLICY "Owners view own flat tenant info" ON public.tenant_info
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM flats f WHERE f.id = tenant_info.flat_id AND f.owner_user_id = auth.uid()));

CREATE POLICY "Owners insert own flat tenant info" ON public.tenant_info
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM flats f WHERE f.id = tenant_info.flat_id AND f.owner_user_id = auth.uid()));

CREATE POLICY "Owners update own flat tenant info" ON public.tenant_info
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM flats f WHERE f.id = tenant_info.flat_id AND f.owner_user_id = auth.uid()));

CREATE POLICY "Owners delete own flat tenant info" ON public.tenant_info
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM flats f WHERE f.id = tenant_info.flat_id AND f.owner_user_id = auth.uid()));

CREATE TRIGGER trg_tenant_info_updated_at
  BEFORE UPDATE ON public.tenant_info
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Family members (dynamic list per tenant)
CREATE TABLE public.tenant_family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_info_id uuid NOT NULL REFERENCES public.tenant_info(id) ON DELETE CASCADE,
  name text NOT NULL,
  relation text NOT NULL,
  age integer,
  gender text,
  occupation text,
  education text,
  institution text,
  is_married boolean DEFAULT false,
  spouse_name text,
  children_count integer DEFAULT 0,
  children_details text,
  phone text,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_family_members_tenant ON public.tenant_family_members(tenant_info_id);

ALTER TABLE public.tenant_family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage family members" ON public.tenant_family_members
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners view own flat family members" ON public.tenant_family_members
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tenant_info ti JOIN flats f ON f.id = ti.flat_id
    WHERE ti.id = tenant_family_members.tenant_info_id AND f.owner_user_id = auth.uid()
  ));

CREATE POLICY "Owners insert own flat family members" ON public.tenant_family_members
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM tenant_info ti JOIN flats f ON f.id = ti.flat_id
    WHERE ti.id = tenant_family_members.tenant_info_id AND f.owner_user_id = auth.uid()
  ));

CREATE POLICY "Owners update own flat family members" ON public.tenant_family_members
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tenant_info ti JOIN flats f ON f.id = ti.flat_id
    WHERE ti.id = tenant_family_members.tenant_info_id AND f.owner_user_id = auth.uid()
  ));

CREATE POLICY "Owners delete own flat family members" ON public.tenant_family_members
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tenant_info ti JOIN flats f ON f.id = ti.flat_id
    WHERE ti.id = tenant_family_members.tenant_info_id AND f.owner_user_id = auth.uid()
  ));

CREATE TRIGGER trg_family_members_updated_at
  BEFORE UPDATE ON public.tenant_family_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for tenant photos
INSERT INTO storage.buckets (id, name, public) VALUES ('tenant-photos', 'tenant-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Tenant photos are publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tenant-photos');

CREATE POLICY "Authenticated can upload tenant photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tenant-photos');

CREATE POLICY "Authenticated can update tenant photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'tenant-photos');

CREATE POLICY "Authenticated can delete tenant photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'tenant-photos');
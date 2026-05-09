-- 1. owner_info table (mirrors tenant_info structure for code reuse)
CREATE TABLE public.owner_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flat_id uuid NOT NULL UNIQUE,
  -- police-form header
  beat_no text, ward_no text, holding_no text, road text, area text, post_code text,
  -- personal
  tenant_name text NOT NULL,
  tenant_name_bn text,
  father_name text, mother_name text, spouse_name text,
  birth_date date, marital_status text,
  permanent_address text, present_address text,
  occupation text, workplace text,
  religion text, education text,
  phone text, email text,
  nid_number text, passport_number text,
  -- emergency
  emergency_name text, emergency_relation text, emergency_address text, emergency_phone text,
  -- helper
  helper_name text, helper_nid text, helper_phone text, helper_address text,
  -- driver
  driver_name text, driver_nid text,
  -- previous/current landlord (kept for form parity; usually unused for owners)
  previous_landlord_name text, previous_landlord_phone text,
  leave_reason text, current_landlord_name text,
  move_in_date date,
  -- misc
  photo_url text,
  total_members integer DEFAULT 0,
  notes text,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_owner_info_flat ON public.owner_info(flat_id);

ALTER TABLE public.owner_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage owner info" ON public.owner_info FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Manager manage owner info" ON public.owner_info FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'manager'::app_role)) WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Owners view own owner info" ON public.owner_info FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.flats f WHERE f.id = owner_info.flat_id AND f.owner_user_id = auth.uid()));

CREATE POLICY "Owners insert own owner info" ON public.owner_info FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.flats f WHERE f.id = owner_info.flat_id AND f.owner_user_id = auth.uid()));

CREATE POLICY "Owners update own owner info" ON public.owner_info FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.flats f WHERE f.id = owner_info.flat_id AND f.owner_user_id = auth.uid()));

CREATE POLICY "Owners delete own owner info" ON public.owner_info FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.flats f WHERE f.id = owner_info.flat_id AND f.owner_user_id = auth.uid()));

CREATE TRIGGER trg_owner_info_updated_at
BEFORE UPDATE ON public.owner_info
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- audit trigger using existing log_change_history function
CREATE TRIGGER trg_owner_info_audit
AFTER INSERT OR UPDATE OR DELETE ON public.owner_info
FOR EACH ROW EXECUTE FUNCTION public.log_change_history();

-- 2. owner_family_members
CREATE TABLE public.owner_family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_info_id uuid NOT NULL,
  name text NOT NULL,
  relation text NOT NULL DEFAULT '',
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

CREATE INDEX idx_owner_family_owner ON public.owner_family_members(owner_info_id);

ALTER TABLE public.owner_family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage owner family" ON public.owner_family_members FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Manager manage owner family" ON public.owner_family_members FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'manager'::app_role)) WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Owners view own family" ON public.owner_family_members FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.owner_info oi JOIN public.flats f ON f.id = oi.flat_id
    WHERE oi.id = owner_family_members.owner_info_id AND f.owner_user_id = auth.uid()));

CREATE POLICY "Owners insert own family" ON public.owner_family_members FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.owner_info oi JOIN public.flats f ON f.id = oi.flat_id
    WHERE oi.id = owner_family_members.owner_info_id AND f.owner_user_id = auth.uid()));

CREATE POLICY "Owners update own family" ON public.owner_family_members FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.owner_info oi JOIN public.flats f ON f.id = oi.flat_id
    WHERE oi.id = owner_family_members.owner_info_id AND f.owner_user_id = auth.uid()));

CREATE POLICY "Owners delete own family" ON public.owner_family_members FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.owner_info oi JOIN public.flats f ON f.id = oi.flat_id
    WHERE oi.id = owner_family_members.owner_info_id AND f.owner_user_id = auth.uid()));

CREATE TRIGGER trg_owner_family_updated_at
BEFORE UPDATE ON public.owner_family_members
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
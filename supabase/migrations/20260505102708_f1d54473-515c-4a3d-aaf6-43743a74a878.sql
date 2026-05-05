
-- 1. Add 'tenant' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'tenant';

-- 2. Add tenant_user_id to flats
ALTER TABLE public.flats
  ADD COLUMN IF NOT EXISTS tenant_user_id uuid;

CREATE INDEX IF NOT EXISTS idx_flats_tenant_user_id ON public.flats(tenant_user_id);

-- 3. RLS — extend access so tenants of a flat can see/act
-- flats: tenant can view own flat
CREATE POLICY "Tenants view own flat" ON public.flats
  FOR SELECT TO authenticated
  USING (auth.uid() = tenant_user_id);

-- bills: tenants view own flat bills
CREATE POLICY "Tenants view own flat bills" ON public.bills
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.flats f
    WHERE f.id = bills.flat_id AND f.tenant_user_id = auth.uid()
  ));

-- payment_requests: tenants view & insert for own flat
CREATE POLICY "Tenants view own payment requests" ON public.payment_requests
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.flats f
    WHERE f.id = payment_requests.flat_id AND f.tenant_user_id = auth.uid()
  ));

CREATE POLICY "Tenants insert own payment requests" ON public.payment_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    submitted_by = auth.uid()
    AND status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.flats f
      WHERE f.id = payment_requests.flat_id AND f.tenant_user_id = auth.uid()
    )
  );

-- tenant_info: tenants manage own
CREATE POLICY "Tenants view own tenant info" ON public.tenant_info
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.flats f
    WHERE f.id = tenant_info.flat_id AND f.tenant_user_id = auth.uid()
  ));

CREATE POLICY "Tenants insert own tenant info" ON public.tenant_info
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.flats f
    WHERE f.id = tenant_info.flat_id AND f.tenant_user_id = auth.uid()
  ));

CREATE POLICY "Tenants update own tenant info" ON public.tenant_info
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.flats f
    WHERE f.id = tenant_info.flat_id AND f.tenant_user_id = auth.uid()
  ));

-- tenant_family_members: tenants manage own
CREATE POLICY "Tenants view own family members" ON public.tenant_family_members
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tenant_info ti
    JOIN public.flats f ON f.id = ti.flat_id
    WHERE ti.id = tenant_family_members.tenant_info_id AND f.tenant_user_id = auth.uid()
  ));

CREATE POLICY "Tenants insert own family members" ON public.tenant_family_members
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tenant_info ti
    JOIN public.flats f ON f.id = ti.flat_id
    WHERE ti.id = tenant_family_members.tenant_info_id AND f.tenant_user_id = auth.uid()
  ));

CREATE POLICY "Tenants update own family members" ON public.tenant_family_members
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tenant_info ti
    JOIN public.flats f ON f.id = ti.flat_id
    WHERE ti.id = tenant_family_members.tenant_info_id AND f.tenant_user_id = auth.uid()
  ));

CREATE POLICY "Tenants delete own family members" ON public.tenant_family_members
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tenant_info ti
    JOIN public.flats f ON f.id = ti.flat_id
    WHERE ti.id = tenant_family_members.tenant_info_id AND f.tenant_user_id = auth.uid()
  ));

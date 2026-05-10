-- tenant_info: tighten owner policies to require flats.is_rented = true
DROP POLICY IF EXISTS "Owners insert own flat tenant info" ON public.tenant_info;
DROP POLICY IF EXISTS "Owners update own flat tenant info" ON public.tenant_info;
DROP POLICY IF EXISTS "Owners delete own flat tenant info" ON public.tenant_info;

CREATE POLICY "Owners insert own flat tenant info"
  ON public.tenant_info FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.flats f
    WHERE f.id = tenant_info.flat_id
      AND f.owner_user_id = auth.uid()
      AND f.is_rented = true
  ));

CREATE POLICY "Owners update own flat tenant info"
  ON public.tenant_info FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.flats f
    WHERE f.id = tenant_info.flat_id
      AND f.owner_user_id = auth.uid()
      AND f.is_rented = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.flats f
    WHERE f.id = tenant_info.flat_id
      AND f.owner_user_id = auth.uid()
      AND f.is_rented = true
  ));

CREATE POLICY "Owners delete own flat tenant info"
  ON public.tenant_info FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.flats f
    WHERE f.id = tenant_info.flat_id
      AND f.owner_user_id = auth.uid()
      AND f.is_rented = true
  ));

-- tenant_family_members: tighten owner policies similarly
DROP POLICY IF EXISTS "Owners insert own flat family members" ON public.tenant_family_members;
DROP POLICY IF EXISTS "Owners update own flat family members" ON public.tenant_family_members;
DROP POLICY IF EXISTS "Owners delete own flat family members" ON public.tenant_family_members;

CREATE POLICY "Owners insert own flat family members"
  ON public.tenant_family_members FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tenant_info ti
    JOIN public.flats f ON f.id = ti.flat_id
    WHERE ti.id = tenant_family_members.tenant_info_id
      AND f.owner_user_id = auth.uid()
      AND f.is_rented = true
  ));

CREATE POLICY "Owners update own flat family members"
  ON public.tenant_family_members FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tenant_info ti
    JOIN public.flats f ON f.id = ti.flat_id
    WHERE ti.id = tenant_family_members.tenant_info_id
      AND f.owner_user_id = auth.uid()
      AND f.is_rented = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tenant_info ti
    JOIN public.flats f ON f.id = ti.flat_id
    WHERE ti.id = tenant_family_members.tenant_info_id
      AND f.owner_user_id = auth.uid()
      AND f.is_rented = true
  ));

CREATE POLICY "Owners delete own flat family members"
  ON public.tenant_family_members FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tenant_info ti
    JOIN public.flats f ON f.id = ti.flat_id
    WHERE ti.id = tenant_family_members.tenant_info_id
      AND f.owner_user_id = auth.uid()
      AND f.is_rented = true
  ));

-- tenancy_periods (archive table): require is_rented for owner inserts as well
DROP POLICY IF EXISTS "Owners insert own flat tenancy periods" ON public.tenancy_periods;
CREATE POLICY "Owners insert own flat tenancy periods"
  ON public.tenancy_periods FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.flats f
    WHERE f.id = tenancy_periods.flat_id
      AND f.owner_user_id = auth.uid()
      AND f.is_rented = true
  ));

-- 1. Add occupant + photo fields to flats
ALTER TABLE public.flats
  ADD COLUMN IF NOT EXISTS occupant_type text NOT NULL DEFAULT 'owner' CHECK (occupant_type IN ('owner','tenant')),
  ADD COLUMN IF NOT EXISTS occupant_name text,
  ADD COLUMN IF NOT EXISTS occupant_name_bn text,
  ADD COLUMN IF NOT EXISTS occupant_phone text,
  ADD COLUMN IF NOT EXISTS occupant_photo_url text,
  ADD COLUMN IF NOT EXISTS owner_photo_url text;

-- 2. Shops table
CREATE TABLE IF NOT EXISTS public.shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_no text NOT NULL UNIQUE,
  side text,
  size integer NOT NULL DEFAULT 0,
  service_charge numeric NOT NULL DEFAULT 0,
  rent numeric NOT NULL DEFAULT 0,
  is_occupied boolean NOT NULL DEFAULT false,
  occupant_type text NOT NULL DEFAULT 'owner' CHECK (occupant_type IN ('owner','tenant')),
  owner_name text,
  owner_name_bn text,
  owner_phone text,
  owner_photo_url text,
  occupant_name text,
  occupant_name_bn text,
  occupant_phone text,
  occupant_photo_url text,
  owner_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage shops" ON public.shops
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Owners view own shop" ON public.shops
  FOR SELECT TO authenticated
  USING (auth.uid() = owner_user_id);

CREATE TRIGGER update_shops_updated_at
  BEFORE UPDATE ON public.shops
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Parking slots table
CREATE TABLE IF NOT EXISTS public.parking_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_no text NOT NULL UNIQUE,
  flat_id uuid REFERENCES public.flats(id) ON DELETE SET NULL,
  shop_id uuid REFERENCES public.shops(id) ON DELETE SET NULL,
  monthly_fee numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.parking_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage parking" ON public.parking_slots
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Authenticated view parking" ON public.parking_slots
  FOR SELECT TO authenticated USING (true);

CREATE TRIGGER update_parking_slots_updated_at
  BEFORE UPDATE ON public.parking_slots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Storage bucket for occupant/owner photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('occupant-photos','occupant-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read occupant photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'occupant-photos');
CREATE POLICY "Admins upload occupant photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'occupant-photos' AND has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update occupant photos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'occupant-photos' AND has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete occupant photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'occupant-photos' AND has_role(auth.uid(),'admin'));

-- 5. Seed flats (58), shops (4), parking (16)
-- Flats: ground floor 1B,1C,1B1,1C1 ; floors 2-10 -> A,B,C,A1,B1,C1
INSERT INTO public.flats (flat_no, floor, size, service_charge, gas_bill, parking, is_occupied, occupant_type)
SELECT v.flat_no, v.floor, 0, 0, 0, 0, false, 'owner'
FROM (VALUES
  ('1B',1),('1C',1),('1B1',1),('1C1',1)
) AS v(flat_no, floor)
WHERE NOT EXISTS (SELECT 1 FROM public.flats f WHERE f.flat_no = v.flat_no);

INSERT INTO public.flats (flat_no, floor, size, service_charge, gas_bill, parking, is_occupied, occupant_type)
SELECT fl || suf, fl, 0, 0, 0, 0, false, 'owner'
FROM generate_series(2,10) fl
CROSS JOIN (VALUES ('A'),('B'),('C'),('A1'),('B1'),('C1')) AS s(suf)
WHERE NOT EXISTS (
  SELECT 1 FROM public.flats f WHERE f.flat_no = fl || suf
);

-- Shops
INSERT INTO public.shops (shop_no, side)
SELECT v.shop_no, v.side FROM (VALUES
  ('W-S1','west'),('W-S2','west'),('E-S1','east'),('E-S2','east')
) AS v(shop_no, side)
WHERE NOT EXISTS (SELECT 1 FROM public.shops s WHERE s.shop_no = v.shop_no);

-- Parking slots P1..P16
INSERT INTO public.parking_slots (slot_no)
SELECT 'P' || g FROM generate_series(1,16) g
WHERE NOT EXISTS (SELECT 1 FROM public.parking_slots p WHERE p.slot_no = 'P' || g);

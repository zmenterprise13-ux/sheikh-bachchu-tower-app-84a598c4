-- Committee members table
CREATE TABLE public.committee_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_bn text NOT NULL,
  role text NOT NULL,
  role_bn text NOT NULL,
  photo_url text,
  accent text NOT NULL DEFAULT 'from-sky-400 to-blue-600',
  sort_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.committee_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage committee" ON public.committee_members
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anon view published committee" ON public.committee_members
  FOR SELECT TO anon USING (is_published = true);

CREATE POLICY "Authenticated view published committee" ON public.committee_members
  FOR SELECT TO authenticated USING (is_published = true);

CREATE TRIGGER update_committee_members_updated_at
  BEFORE UPDATE ON public.committee_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Public storage bucket for committee photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('committee-photos', 'committee-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read committee photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'committee-photos');

CREATE POLICY "Admins upload committee photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'committee-photos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update committee photos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'committee-photos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete committee photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'committee-photos' AND has_role(auth.uid(), 'admin'::app_role));
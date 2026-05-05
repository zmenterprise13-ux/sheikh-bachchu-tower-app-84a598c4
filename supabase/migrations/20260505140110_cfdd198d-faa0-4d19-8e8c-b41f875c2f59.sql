INSERT INTO storage.buckets (id, name, public) VALUES ('report-pad', 'report-pad', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Report pad publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'report-pad');

CREATE POLICY "Admins can upload report pad"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'report-pad' AND public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins can update report pad"
ON storage.objects FOR UPDATE
USING (bucket_id = 'report-pad' AND public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins can delete report pad"
ON storage.objects FOR DELETE
USING (bucket_id = 'report-pad' AND public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Public read occupant photos" ON storage.objects;

-- Allow read only when path is referenced or via signed/public URL access pattern.
-- Since bucket is public=true, files are accessible by URL without listing.
-- Restrict storage.objects SELECT to authenticated users (prevents listing).
CREATE POLICY "Authenticated read occupant photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'occupant-photos');
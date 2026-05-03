CREATE POLICY "Authenticated view all flats"
ON public.flats
FOR SELECT
TO authenticated
USING (true);
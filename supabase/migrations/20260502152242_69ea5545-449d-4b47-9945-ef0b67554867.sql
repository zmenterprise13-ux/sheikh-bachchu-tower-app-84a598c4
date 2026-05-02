CREATE OR REPLACE FUNCTION public.update_my_owner_photo(_photo_url text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.flats
  SET owner_photo_url = _photo_url,
      updated_at = now()
  WHERE owner_user_id = auth.uid();
END;
$$;
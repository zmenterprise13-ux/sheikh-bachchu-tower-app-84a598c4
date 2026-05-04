CREATE OR REPLACE FUNCTION public.update_my_owner_photo(_photo_url text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Update every flat owned by this user, AND every other flat that shares
  -- a phone number with one of those flats (so multi-flat owners only need
  -- to upload once).
  UPDATE public.flats f
  SET owner_photo_url = _photo_url,
      updated_at = now()
  WHERE f.owner_user_id = auth.uid()
     OR (
       f.phone IS NOT NULL
       AND f.phone <> ''
       AND f.phone IN (
         SELECT phone FROM public.flats
         WHERE owner_user_id = auth.uid()
           AND phone IS NOT NULL AND phone <> ''
       )
     );
END;
$function$;
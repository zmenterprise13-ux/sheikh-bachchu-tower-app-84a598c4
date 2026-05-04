CREATE OR REPLACE FUNCTION public.get_published_committee()
RETURNS TABLE (
  id uuid,
  name text,
  name_bn text,
  role text,
  role_bn text,
  photo_url text,
  accent text,
  bio text,
  bio_bn text,
  phone text,
  flat_id uuid,
  category text,
  sort_order integer,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    cm.id,
    cm.name,
    cm.name_bn,
    cm.role,
    cm.role_bn,
    COALESCE(f.owner_photo_url, cm.photo_url) AS photo_url,
    cm.accent,
    cm.bio,
    cm.bio_bn,
    NULLIF(TRIM(COALESCE(f.phone, cm.phone, '')), '') AS phone,
    cm.flat_id,
    cm.category,
    cm.sort_order,
    cm.created_at
  FROM public.committee_members cm
  LEFT JOIN public.flats f ON f.id = cm.flat_id
  WHERE cm.is_published = true
  ORDER BY cm.sort_order ASC, cm.created_at ASC
$$;

GRANT EXECUTE ON FUNCTION public.get_published_committee() TO anon, authenticated;
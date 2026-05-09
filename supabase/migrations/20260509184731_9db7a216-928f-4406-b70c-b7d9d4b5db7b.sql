CREATE OR REPLACE FUNCTION public.log_change_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _old jsonb;
  _new jsonb;
  _fields text[] := '{}';
  _key text;
  _flat uuid;
  _rec_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _old := to_jsonb(OLD);
    _new := NULL;
    _rec_id := OLD.id;
    IF TG_TABLE_NAME = 'flats' THEN
      _flat := OLD.id;
    ELSE
      _flat := (to_jsonb(OLD)->>'flat_id')::uuid;
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    _old := NULL;
    _new := to_jsonb(NEW);
    _rec_id := NEW.id;
    IF TG_TABLE_NAME = 'flats' THEN
      _flat := NEW.id;
    ELSE
      _flat := (to_jsonb(NEW)->>'flat_id')::uuid;
    END IF;
  ELSE
    _old := to_jsonb(OLD);
    _new := to_jsonb(NEW);
    _rec_id := NEW.id;
    IF TG_TABLE_NAME = 'flats' THEN
      _flat := NEW.id;
    ELSE
      _flat := (to_jsonb(NEW)->>'flat_id')::uuid;
    END IF;
    FOR _key IN SELECT jsonb_object_keys(_new) LOOP
      IF _key IN ('updated_at','created_at') THEN CONTINUE; END IF;
      IF (_old->_key) IS DISTINCT FROM (_new->_key) THEN
        _fields := array_append(_fields, _key);
      END IF;
    END LOOP;
    IF array_length(_fields,1) IS NULL THEN
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO public.change_history(table_name, record_id, flat_id, operation, changed_by, changed_fields, old_data, new_data)
  VALUES (TG_TABLE_NAME, _rec_id, _flat, TG_OP, auth.uid(), _fields, _old, _new);

  RETURN COALESCE(NEW, OLD);
END;
$function$;

ALTER TABLE public.flats
  ADD COLUMN IF NOT EXISTS is_rented boolean NOT NULL DEFAULT false;

UPDATE public.flats
  SET is_rented = true
  WHERE occupant_type = 'tenant' AND is_rented = false;

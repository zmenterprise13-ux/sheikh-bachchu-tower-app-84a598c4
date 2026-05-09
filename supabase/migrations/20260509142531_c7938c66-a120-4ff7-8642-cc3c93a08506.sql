-- 1. Audit log table
CREATE TABLE public.change_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  flat_id uuid,
  operation text NOT NULL CHECK (operation IN ('INSERT','UPDATE','DELETE')),
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_fields text[] NOT NULL DEFAULT '{}',
  old_data jsonb,
  new_data jsonb
);

CREATE INDEX idx_change_history_table_record ON public.change_history(table_name, record_id, changed_at DESC);
CREATE INDEX idx_change_history_flat ON public.change_history(flat_id, changed_at DESC);

ALTER TABLE public.change_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view change history"
  ON public.change_history FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete change history"
  ON public.change_history FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- (No INSERT policy needed: triggers run as SECURITY DEFINER)

-- 2. Generic audit trigger function
CREATE OR REPLACE FUNCTION public.log_change_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    _flat := CASE WHEN TG_TABLE_NAME = 'flats' THEN OLD.id ELSE OLD.flat_id END;
  ELSIF TG_OP = 'INSERT' THEN
    _old := NULL;
    _new := to_jsonb(NEW);
    _rec_id := NEW.id;
    _flat := CASE WHEN TG_TABLE_NAME = 'flats' THEN NEW.id ELSE NEW.flat_id END;
  ELSE -- UPDATE
    _old := to_jsonb(OLD);
    _new := to_jsonb(NEW);
    _rec_id := NEW.id;
    _flat := CASE WHEN TG_TABLE_NAME = 'flats' THEN NEW.id ELSE NEW.flat_id END;
    FOR _key IN SELECT jsonb_object_keys(_new) LOOP
      IF _key IN ('updated_at','created_at') THEN CONTINUE; END IF;
      IF (_old->_key) IS DISTINCT FROM (_new->_key) THEN
        _fields := array_append(_fields, _key);
      END IF;
    END LOOP;
    IF array_length(_fields,1) IS NULL THEN
      RETURN NEW; -- nothing meaningful changed
    END IF;
  END IF;

  INSERT INTO public.change_history(table_name, record_id, flat_id, operation, changed_by, changed_fields, old_data, new_data)
  VALUES (TG_TABLE_NAME, _rec_id, _flat, TG_OP, auth.uid(), _fields, _old, _new);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 3. Attach triggers
CREATE TRIGGER trg_flats_audit
AFTER INSERT OR UPDATE OR DELETE ON public.flats
FOR EACH ROW EXECUTE FUNCTION public.log_change_history();

CREATE TRIGGER trg_tenant_info_audit
AFTER INSERT OR UPDATE OR DELETE ON public.tenant_info
FOR EACH ROW EXECUTE FUNCTION public.log_change_history();
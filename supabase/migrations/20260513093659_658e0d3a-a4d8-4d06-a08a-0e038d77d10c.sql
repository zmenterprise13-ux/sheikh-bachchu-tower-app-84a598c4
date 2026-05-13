
-- Personal notices table: one row per (batch, flat). Allows admin to send a
-- custom message to one or many flat owners; recipients see it as a popup
-- once and on their notices page.

CREATE TABLE public.personal_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL DEFAULT gen_random_uuid(),
  flat_id uuid NOT NULL REFERENCES public.flats(id) ON DELETE CASCADE,
  title text NOT NULL,
  title_bn text,
  body text NOT NULL,
  body_bn text,
  important boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

CREATE INDEX idx_personal_notices_flat ON public.personal_notices(flat_id, created_at DESC);
CREATE INDEX idx_personal_notices_batch ON public.personal_notices(batch_id);

ALTER TABLE public.personal_notices ENABLE ROW LEVEL SECURITY;

-- Staff (admin / manager) can do everything
CREATE POLICY "Staff can view personal notices"
  ON public.personal_notices FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
    OR public.has_role(auth.uid(), 'accountant'::app_role)
  );

CREATE POLICY "Admin/manager can insert personal notices"
  ON public.personal_notices FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
  );

CREATE POLICY "Admin/manager can update personal notices"
  ON public.personal_notices FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
  );

CREATE POLICY "Admin/manager can delete personal notices"
  ON public.personal_notices FOR DELETE
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
  );

-- Recipient (owner or tenant of the flat) can view their own
CREATE POLICY "Recipients can view their personal notices"
  ON public.personal_notices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.flats f
      WHERE f.id = personal_notices.flat_id
        AND (f.owner_user_id = auth.uid() OR f.tenant_user_id = auth.uid())
    )
  );

-- Recipient can mark as read (update only read_at — enforced in trigger)
CREATE POLICY "Recipients can mark their personal notices read"
  ON public.personal_notices FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.flats f
      WHERE f.id = personal_notices.flat_id
        AND (f.owner_user_id = auth.uid() OR f.tenant_user_id = auth.uid())
    )
  );

-- Trigger to make sure recipients can only change `read_at`
CREATE OR REPLACE FUNCTION public.guard_personal_notice_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role)
     OR public.has_role(auth.uid(), 'manager'::app_role) THEN
    RETURN NEW;
  END IF;
  -- Non-staff: only read_at may change
  IF NEW.title IS DISTINCT FROM OLD.title
     OR NEW.title_bn IS DISTINCT FROM OLD.title_bn
     OR NEW.body IS DISTINCT FROM OLD.body
     OR NEW.body_bn IS DISTINCT FROM OLD.body_bn
     OR NEW.important IS DISTINCT FROM OLD.important
     OR NEW.flat_id IS DISTINCT FROM OLD.flat_id
     OR NEW.batch_id IS DISTINCT FROM OLD.batch_id
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only read_at can be updated by recipients';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_personal_notice_update
BEFORE UPDATE ON public.personal_notices
FOR EACH ROW
EXECUTE FUNCTION public.guard_personal_notice_update();

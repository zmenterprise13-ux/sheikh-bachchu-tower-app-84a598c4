
-- Per-flat dues notifications (in-app)
CREATE TABLE public.dues_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flat_id uuid NOT NULL,
  bill_id uuid,
  month text,
  title text NOT NULL,
  body text NOT NULL,
  due_amount numeric NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

CREATE INDEX idx_dues_notifications_flat ON public.dues_notifications(flat_id, created_at DESC);

ALTER TABLE public.dues_notifications ENABLE ROW LEVEL SECURITY;

-- Admin/Manager can fully manage; Accountant can insert+view
CREATE POLICY "Admins manage dues notifications"
  ON public.dues_notifications FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Manager manage dues notifications"
  ON public.dues_notifications FOR ALL TO authenticated
  USING (has_role(auth.uid(),'manager'::app_role))
  WITH CHECK (has_role(auth.uid(),'manager'::app_role));

CREATE POLICY "Accountant view dues notifications"
  ON public.dues_notifications FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'accountant'::app_role));

CREATE POLICY "Accountant insert dues notifications"
  ON public.dues_notifications FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'accountant'::app_role));

-- Owners and tenants can view and mark-read their own flat's notifications
CREATE POLICY "Owners view own dues notifications"
  ON public.dues_notifications FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.flats f
                 WHERE f.id = dues_notifications.flat_id
                   AND (f.owner_user_id = auth.uid() OR f.tenant_user_id = auth.uid())));

CREATE POLICY "Owners update own dues notifications read"
  ON public.dues_notifications FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.flats f
                 WHERE f.id = dues_notifications.flat_id
                   AND (f.owner_user_id = auth.uid() OR f.tenant_user_id = auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.flats f
                 WHERE f.id = dues_notifications.flat_id
                   AND (f.owner_user_id = auth.uid() OR f.tenant_user_id = auth.uid())));

-- 1. Roles enum + user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'owner');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. Security-definer role check (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 3. Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Flats
CREATE TABLE public.flats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flat_no TEXT NOT NULL UNIQUE,
  floor INT NOT NULL,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_name TEXT,
  owner_name_bn TEXT,
  phone TEXT,
  size INT NOT NULL DEFAULT 0,
  service_charge NUMERIC(10,2) NOT NULL DEFAULT 0,
  gas_bill NUMERIC(10,2) NOT NULL DEFAULT 0,
  parking NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_occupied BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.flats ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_flats_owner ON public.flats(owner_user_id);

-- 5. Bills
CREATE TYPE public.bill_status AS ENUM ('paid', 'unpaid', 'partial');

CREATE TABLE public.bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flat_id UUID NOT NULL REFERENCES public.flats(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- "YYYY-MM"
  service_charge NUMERIC(10,2) NOT NULL DEFAULT 0,
  gas_bill NUMERIC(10,2) NOT NULL DEFAULT 0,
  parking NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  status public.bill_status NOT NULL DEFAULT 'unpaid',
  generated_at DATE NOT NULL DEFAULT CURRENT_DATE,
  paid_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (flat_id, month)
);

ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_bills_flat ON public.bills(flat_id);
CREATE INDEX idx_bills_month ON public.bills(month);

-- 6. Expenses
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_expenses_date ON public.expenses(date);

-- 7. Notices
CREATE TABLE public.notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  title_bn TEXT NOT NULL,
  body TEXT NOT NULL,
  body_bn TEXT NOT NULL,
  important BOOLEAN NOT NULL DEFAULT false,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- RLS POLICIES
-- =========================================================

-- profiles
CREATE POLICY "Users view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- user_roles
CREATE POLICY "Users view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- flats
CREATE POLICY "Admins manage flats"
  ON public.flats FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners view own flat"
  ON public.flats FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_user_id);

-- bills
CREATE POLICY "Admins manage bills"
  ON public.bills FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners view own bills"
  ON public.bills FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.flats f
      WHERE f.id = bills.flat_id AND f.owner_user_id = auth.uid()
    )
  );

-- expenses (admin-only)
CREATE POLICY "Admins manage expenses"
  ON public.expenses FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners view expenses"
  ON public.expenses FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'owner'));

-- notices (all signed-in users view; admins manage)
CREATE POLICY "Authenticated view notices"
  ON public.notices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins manage notices"
  ON public.notices FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- TRIGGERS
-- =========================================================

-- updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_flats_updated BEFORE UPDATE ON public.flats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_bills_updated BEFORE UPDATE ON public.bills
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_expenses_updated BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_notices_updated BEFORE UPDATE ON public.notices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto profile + default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone'
  );

  -- default role: owner
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'owner')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

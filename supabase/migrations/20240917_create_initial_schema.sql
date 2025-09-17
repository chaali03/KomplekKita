-- Enable Row Level Security
-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid()
-- NOTE: On managed Supabase, setting app.jwt_secret via SQL is not permitted.
-- Please configure JWT secret via Dashboard or config.toml. The line below is intentionally disabled to avoid permission errors during deploys.
-- ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create custom types
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'resident');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled');
CREATE TYPE transaction_type AS ENUM ('income', 'expense');
CREATE TYPE resident_status AS ENUM ('aktif', 'pindah', 'nonaktif');

-- Users table (extends auth.users from Supabase Auth)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone_number TEXT,
  role user_role NOT NULL DEFAULT 'resident',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Houses/Units table
CREATE TABLE public.houses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  house_number TEXT NOT NULL UNIQUE,
  address TEXT,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_occupied BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Residents table
CREATE TABLE public.residents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  house_id UUID REFERENCES public.houses(id) ON DELETE CASCADE,
  is_primary_occupant BOOLEAN DEFAULT false,
  move_in_date DATE NOT NULL,
  move_out_date DATE,
  status resident_status DEFAULT 'aktif',
  verified BOOLEAN DEFAULT false,
  nik TEXT,
  kk TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, house_id)
);

-- Payment Categories
CREATE TABLE public.payment_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(12, 2) NOT NULL,
  type transaction_type NOT NULL,
  is_recurring BOOLEAN DEFAULT false,
  recurring_interval INTERVAL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments table
CREATE TABLE public.payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  house_id UUID REFERENCES public.houses(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.payment_categories(id) ON DELETE SET NULL,
  amount DECIMAL(12, 2) NOT NULL,
  payment_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ NOT NULL,
  status payment_status DEFAULT 'pending',
  description TEXT,
  receipt_url TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions table (for all financial transactions)
CREATE TABLE public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type transaction_type NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  description TEXT,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.payment_categories(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Announcements
CREATE TABLE public.announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_published BOOLEAN DEFAULT false,
  publish_date TIMESTAMPTZ DEFAULT NOW(),
  expire_date TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Facilities
CREATE TABLE public.facilities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  capacity INTEGER,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Facility Bookings
CREATE TABLE public.facility_bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_id UUID REFERENCES public.facilities(id) ON DELETE CASCADE,
  resident_id UUID REFERENCES public.residents(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT end_time_after_start CHECK (end_time > start_time)
);

-- Komplek/Complexes and Blocks (aligns with api-mock and warga.astro)
CREATE TABLE public.complexes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  ketua_rt TEXT,
  bendahara TEXT,
  total_warga INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  complex_id UUID REFERENCES public.complexes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (complex_id, name)
);

-- Enrich houses with Komplek/Warga fields
ALTER TABLE public.houses
  ADD COLUMN IF NOT EXISTS complex_id UUID REFERENCES public.complexes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS block TEXT,
  ADD COLUMN IF NOT EXISTS rt TEXT,
  ADD COLUMN IF NOT EXISTS rw TEXT,
  ADD COLUMN IF NOT EXISTS kk_number TEXT,
  ADD COLUMN IF NOT EXISTS primary_contact TEXT,
  ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Iuran periods and payments to support iuran-manager.ts
CREATE TABLE public.iuran_periods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  complex_id UUID REFERENCES public.complexes(id) ON DELETE CASCADE,
  period TEXT NOT NULL, -- format YYYY-MM
  nominal DECIMAL(12,2) NOT NULL,
  is_closed BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (complex_id, period)
);

CREATE TABLE public.iuran_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  period_id UUID REFERENCES public.iuran_periods(id) ON DELETE CASCADE,
  house_id UUID REFERENCES public.houses(id) ON DELETE CASCADE,
  resident_id UUID REFERENCES public.residents(id) ON DELETE SET NULL,
  amount DECIMAL(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'unpaid', -- 'paid' | 'unpaid'
  payment_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (period_id, house_id)
);

-- Letter templates used in admin warga page
CREATE TABLE public.letter_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  type TEXT,
  description TEXT,
  file_url TEXT,
  download_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- External payment gateway (e.g., Midtrans) tracking
CREATE TABLE public.external_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL, -- e.g., 'midtrans'
  order_id TEXT UNIQUE NOT NULL,
  transaction_id TEXT,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  status TEXT,
  gross_amount DECIMAL(12,2),
  raw_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_payments_house_id ON public.payments(house_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_transactions_type ON public.transactions(type);
CREATE INDEX idx_transactions_date ON public.transactions(transaction_date);
CREATE INDEX idx_facility_bookings_dates ON public.facility_bookings(start_time, end_time);
CREATE INDEX idx_houses_complex ON public.houses(complex_id);
CREATE INDEX idx_blocks_complex ON public.blocks(complex_id);
CREATE INDEX idx_iuran_period_unique ON public.iuran_periods(complex_id, period);
CREATE INDEX idx_iuran_payments_period ON public.iuran_payments(period_id);
CREATE INDEX idx_external_payments_provider ON public.external_payments(provider);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facility_bookings ENABLE ROW LEVEL SECURITY;

-- Create a trigger to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to all tables with updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_houses_updated_at
BEFORE UPDATE ON public.houses
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_residents_updated_at
BEFORE UPDATE ON public.residents
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_categories_updated_at
BEFORE UPDATE ON public.payment_categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facilities_updated_at
BEFORE UPDATE ON public.facilities
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facility_bookings_updated_at
BEFORE UPDATE ON public.facility_bookings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a function to generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  next_val INTEGER;
  invoice_prefix TEXT := 'INV' || to_char(CURRENT_DATE, 'YYMM') || '-';
BEGIN
  SELECT COALESCE(MAX(SUBSTRING(invoice_number, LENGTH(invoice_prefix) + 1)::INTEGER), 0) + 1
  INTO next_val
  FROM public.payments
  WHERE invoice_number LIKE invoice_prefix || '%';
  
  NEW.invoice_number := invoice_prefix || LPAD(next_val::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the invoice number trigger
CREATE TRIGGER set_invoice_number
BEFORE INSERT ON public.payments
FOR EACH ROW
WHEN (NEW.invoice_number IS NULL)
EXECUTE FUNCTION generate_invoice_number();

-- Create a function to handle payment status updates
CREATE OR REPLACE FUNCTION update_transaction_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    -- Insert a new transaction when payment is marked as paid
    INSERT INTO public.transactions (
      transaction_date, 
      type, 
      amount, 
      description, 
      payment_id,
      category_id,
      created_by
    ) VALUES (
      COALESCE(NEW.payment_date, NOW()),
      (SELECT type FROM public.payment_categories WHERE id = NEW.category_id),
      NEW.amount,
      CONCAT('Payment for ', (SELECT name FROM public.payment_categories WHERE id = NEW.category_id)),
      NEW.id,
      NEW.category_id,
      NEW.created_by
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the payment status trigger
CREATE TRIGGER process_payment
AFTER UPDATE OF status ON public.payments
FOR EACH ROW
WHEN (NEW.status = 'paid' AND OLD.status != 'paid')
EXECUTE FUNCTION update_transaction_on_payment();

-- Create a function to get financial summary
CREATE OR REPLACE FUNCTION get_financial_summary(start_date TIMESTAMPTZ, end_date TIMESTAMPTZ)
RETURNS TABLE (
  total_income DECIMAL(12, 2),
  total_expenses DECIMAL(12, 2),
  balance DECIMAL(12, 2),
  transaction_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS total_income,
    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expenses,
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) AS balance,
    COUNT(*) AS transaction_count
  FROM public.transactions
  WHERE transaction_date BETWEEN start_date AND end_date;
END;
$$ LANGUAGE plpgsql STABLE;

-- =========================================================
-- ADMIN BOOTSTRAP HELPERS
-- Promote a user (by UUID) to admin; upsert profile if needed
CREATE OR REPLACE FUNCTION public.promote_to_admin(user_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  SELECT u.id, COALESCE(u.raw_user_meta_data->>'full_name', u.email), u.email, 'admin'::user_role
  FROM auth.users u
  WHERE u.id = user_id
  ON CONFLICT (id) DO UPDATE SET role = 'admin'::user_role;
END;$$;

-- Promote a user by email (convenience)
CREATE OR REPLACE FUNCTION public.promote_by_email(email TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE uid UUID; BEGIN
  SELECT id INTO uid FROM auth.users WHERE lower(auth.users.email) = lower(email) LIMIT 1;
  IF uid IS NULL THEN RAISE EXCEPTION 'User with email % not found in auth.users', email; END IF;
  PERFORM public.promote_to_admin(uid);
END;$$;

-- =========================================================
-- PUBLIC ANNOUNCEMENTS ACCESS (ANON)
DROP POLICY IF EXISTS announcements_public_read ON public.announcements;
CREATE POLICY announcements_public_read ON public.announcements
  FOR SELECT TO anon
  USING ( is_published = true AND (expire_date IS NULL OR expire_date >= NOW()) AND publish_date <= NOW() );

-- =========================================================
-- KPI VIEWS
-- Monthly financial aggregation for quick charts
CREATE OR REPLACE VIEW public.v_financial_monthly AS
SELECT 
  to_char(transaction_date AT TIME ZONE 'UTC', 'YYYY-MM') AS period,
  COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0)::numeric(12,2) AS income,
  COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0)::numeric(12,2) AS expense,
  (COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0) - COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0))::numeric(12,2) AS balance,
  COUNT(*)::bigint AS transaction_count
FROM public.transactions
GROUP BY 1
ORDER BY 1;

-- Iuran period status aggregation
CREATE OR REPLACE VIEW public.v_iuran_status AS
SELECT 
  ip.id AS period_id,
  ip.complex_id,
  ip.period,
  ip.nominal,
  ip.is_closed,
  COUNT(ipm.*) AS payments_count,
  COALESCE(SUM(CASE WHEN ipm.status = 'paid' THEN 1 ELSE 0 END),0) AS warga_sudah_bayar,
  COALESCE(SUM(CASE WHEN ipm.status <> 'paid' THEN 1 ELSE 0 END),0) AS warga_belum_bayar,
  COALESCE(SUM(CASE WHEN ipm.status = 'paid' THEN ipm.amount ELSE 0 END),0)::numeric(12,2) AS total_pemasukan,
  (ip.nominal * NULLIF(COUNT(ipm.*),0))::numeric(12,2) AS target_pemasukan
FROM public.iuran_periods ip
LEFT JOIN public.iuran_payments ipm ON ipm.period_id = ip.id
GROUP BY ip.id, ip.complex_id, ip.period, ip.nominal, ip.is_closed
ORDER BY ip.period DESC;

-- =========================================================
-- RLS POLICIES
-- Helper predicates
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','super_admin')
  );
$$;

-- profiles: user can read/update own profile; admins can read all
DROP POLICY IF EXISTS profiles_select_self ON public.profiles;
CREATE POLICY profiles_select_self ON public.profiles
  FOR SELECT TO authenticated
  USING ( id = auth.uid() OR public.is_admin() );

DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE TO authenticated
  USING ( id = auth.uid() OR public.is_admin() )
  WITH CHECK ( id = auth.uid() OR public.is_admin() );

-- residents: admin full; user can read own resident records
DROP POLICY IF EXISTS residents_admin_all ON public.residents;
CREATE POLICY residents_admin_all ON public.residents
  FOR ALL TO authenticated
  USING ( public.is_admin() )
  WITH CHECK ( public.is_admin() );

DROP POLICY IF EXISTS residents_select_self ON public.residents;
CREATE POLICY residents_select_self ON public.residents
  FOR SELECT TO authenticated
  USING ( user_id = auth.uid() );

-- houses: admin full; user can read houses linked to them
DROP POLICY IF EXISTS houses_admin_all ON public.houses;
CREATE POLICY houses_admin_all ON public.houses
  FOR ALL TO authenticated
  USING ( public.is_admin() )
  WITH CHECK ( public.is_admin() );

DROP POLICY IF EXISTS houses_select_self ON public.houses;
CREATE POLICY houses_select_self ON public.houses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.residents r
      WHERE r.house_id = houses.id AND r.user_id = auth.uid()
    )
  );

-- payment_categories: read for all authenticated; modify by admin
DROP POLICY IF EXISTS paycat_select ON public.payment_categories;
CREATE POLICY paycat_select ON public.payment_categories
  FOR SELECT TO authenticated
  USING ( true );

DROP POLICY IF EXISTS paycat_admin_all ON public.payment_categories;
CREATE POLICY paycat_admin_all ON public.payment_categories
  FOR ALL TO authenticated
  USING ( public.is_admin() )
  WITH CHECK ( public.is_admin() );

-- payments: admin full; user can read their house payments
DROP POLICY IF EXISTS payments_admin_all ON public.payments;
CREATE POLICY payments_admin_all ON public.payments
  FOR ALL TO authenticated
  USING ( public.is_admin() )
  WITH CHECK ( public.is_admin() );

DROP POLICY IF EXISTS payments_select_self ON public.payments;
CREATE POLICY payments_select_self ON public.payments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.residents r
      WHERE r.house_id = payments.house_id AND r.user_id = auth.uid()
    )
  );

-- transactions: admin only
DROP POLICY IF EXISTS transactions_admin_all ON public.transactions;
CREATE POLICY transactions_admin_all ON public.transactions
  FOR ALL TO authenticated
  USING ( public.is_admin() )
  WITH CHECK ( public.is_admin() );

-- announcements: everyone authenticated can read; admin manage
DROP POLICY IF EXISTS announcements_select ON public.announcements;
CREATE POLICY announcements_select ON public.announcements
  FOR SELECT TO authenticated
  USING ( true );

DROP POLICY IF EXISTS announcements_admin_all ON public.announcements;
CREATE POLICY announcements_admin_all ON public.announcements
  FOR ALL TO authenticated
  USING ( public.is_admin() )
  WITH CHECK ( public.is_admin() );

-- facilities: read all; admin manage
DROP POLICY IF EXISTS facilities_select ON public.facilities;
CREATE POLICY facilities_select ON public.facilities
  FOR SELECT TO authenticated
  USING ( true );

DROP POLICY IF EXISTS facilities_admin_all ON public.facilities;
CREATE POLICY facilities_admin_all ON public.facilities
  FOR ALL TO authenticated
  USING ( public.is_admin() )
  WITH CHECK ( public.is_admin() );

-- facility_bookings: user can manage own bookings; admin manage all
DROP POLICY IF EXISTS fbook_admin_all ON public.facility_bookings;
CREATE POLICY fbook_admin_all ON public.facility_bookings
  FOR ALL TO authenticated
  USING ( public.is_admin() )
  WITH CHECK ( public.is_admin() );

DROP POLICY IF EXISTS fbook_select_self ON public.facility_bookings;
CREATE POLICY fbook_select_self ON public.facility_bookings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.residents r
      WHERE r.id = facility_bookings.resident_id AND r.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS fbook_modify_self ON public.facility_bookings;
CREATE POLICY fbook_modify_self ON public.facility_bookings
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.residents r
      WHERE r.id = facility_bookings.resident_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY fbook_update_self ON public.facility_bookings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.residents r
      WHERE r.id = facility_bookings.resident_id AND r.user_id = auth.uid()
    ) OR public.is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.residents r
      WHERE r.id = facility_bookings.resident_id AND r.user_id = auth.uid()
    ) OR public.is_admin()
  );

-- complexes/blocks: read all; admin manage
DROP POLICY IF EXISTS complexes_select ON public.complexes;
CREATE POLICY complexes_select ON public.complexes
  FOR SELECT TO authenticated
  USING ( true );

DROP POLICY IF EXISTS complexes_admin_all ON public.complexes;
CREATE POLICY complexes_admin_all ON public.complexes
  FOR ALL TO authenticated
  USING ( public.is_admin() )
  WITH CHECK ( public.is_admin() );

DROP POLICY IF EXISTS blocks_select ON public.blocks;
CREATE POLICY blocks_select ON public.blocks
  FOR SELECT TO authenticated
  USING ( true );

DROP POLICY IF EXISTS blocks_admin_all ON public.blocks;
CREATE POLICY blocks_admin_all ON public.blocks
  FOR ALL TO authenticated
  USING ( public.is_admin() )
  WITH CHECK ( public.is_admin() );

-- iuran tables
DROP POLICY IF EXISTS iuper_select ON public.iuran_periods;
CREATE POLICY iuper_select ON public.iuran_periods
  FOR SELECT TO authenticated
  USING ( true );

DROP POLICY IF EXISTS iuper_admin_all ON public.iuran_periods;
CREATE POLICY iuper_admin_all ON public.iuran_periods
  FOR ALL TO authenticated
  USING ( public.is_admin() )
  WITH CHECK ( public.is_admin() );

DROP POLICY IF EXISTS iupay_admin_all ON public.iuran_payments;
CREATE POLICY iupay_admin_all ON public.iuran_payments
  FOR ALL TO authenticated
  USING ( public.is_admin() )
  WITH CHECK ( public.is_admin() );

DROP POLICY IF EXISTS iupay_select_self ON public.iuran_payments;
CREATE POLICY iupay_select_self ON public.iuran_payments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.residents r
      WHERE r.house_id = iuran_payments.house_id AND r.user_id = auth.uid()
    )
  );

-- letter templates: read all; admin manage
DROP POLICY IF EXISTS lt_select ON public.letter_templates;
CREATE POLICY lt_select ON public.letter_templates
  FOR SELECT TO authenticated
  USING ( true );

DROP POLICY IF EXISTS lt_admin_all ON public.letter_templates;
CREATE POLICY lt_admin_all ON public.letter_templates
  FOR ALL TO authenticated
  USING ( public.is_admin() )
  WITH CHECK ( public.is_admin() );

-- external payments: admin only
DROP POLICY IF EXISTS extpay_admin_all ON public.external_payments;
CREATE POLICY extpay_admin_all ON public.external_payments
  FOR ALL TO authenticated
  USING ( public.is_admin() )
  WITH CHECK ( public.is_admin() );

-- Helpful indexes for policies
CREATE INDEX IF NOT EXISTS idx_residents_user ON public.residents(user_id);
CREATE INDEX IF NOT EXISTS idx_residents_house ON public.residents(house_id);

-- =========================================================
-- SEED DATA (minimal, no user dependency)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.complexes) THEN
    INSERT INTO public.complexes (name, address, lat, lng, ketua_rt, bendahara)
    VALUES ('Komplek Anggrek Asri', 'Jl. Anggrek Mas Blok A, Tangerang', -6.1701, 106.6403, 'Ahmad Rahman', 'Dewi Sartika');
  END IF;
END $$;

DO $$ DECLARE v_c UUID; BEGIN
  SELECT id INTO v_c FROM public.complexes ORDER BY created_at LIMIT 1;
  IF v_c IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.blocks WHERE complex_id = v_c) THEN
    INSERT INTO public.blocks (complex_id, name) VALUES (v_c, 'A'), (v_c, 'B');
  END IF;
END $$;

DO $$ DECLARE v_c UUID; BEGIN
  SELECT id INTO v_c FROM public.complexes ORDER BY created_at LIMIT 1;
  IF v_c IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.houses WHERE complex_id = v_c) THEN
    INSERT INTO public.houses (complex_id, house_number, address, block, rt, rw, kk_number, primary_contact, phone_number, is_occupied)
    VALUES (v_c, 'A-01', 'Blok A No.1', 'A', '01', '01', '1234567890123456', 'Ahmad Rahman', '081234567890', true);
  END IF;
END $$;

-- Seed payment categories and iuran period
INSERT INTO public.payment_categories (name, description, amount, type, is_recurring)
VALUES ('Iuran', 'Iuran bulanan warga', 250000, 'income', true)
ON CONFLICT DO NOTHING;

DO $$ DECLARE v_c UUID; v_pcat UUID; v_period TEXT; v_house UUID; v_perid UUID; BEGIN
  SELECT id INTO v_c FROM public.complexes ORDER BY created_at LIMIT 1;
  SELECT id INTO v_pcat FROM public.payment_categories WHERE name = 'Iuran' LIMIT 1;
  SELECT id INTO v_house FROM public.houses WHERE complex_id = v_c LIMIT 1;
  v_period := to_char(CURRENT_DATE, 'YYYY-MM');
  IF v_c IS NOT NULL THEN
    -- upsert iuran period
    INSERT INTO public.iuran_periods (complex_id, period, nominal)
    VALUES (v_c, v_period, 250000)
    ON CONFLICT (complex_id, period) DO UPDATE SET nominal = EXCLUDED.nominal
    RETURNING id INTO v_perid;
    -- ensure iuran payment row per house
    IF v_perid IS NOT NULL AND v_house IS NOT NULL THEN
      INSERT INTO public.iuran_payments (period_id, house_id, amount, status)
      VALUES (v_perid, v_house, 250000, 'unpaid')
      ON CONFLICT (period_id, house_id) DO NOTHING;
    END IF;
  END IF;
END $$;

-- Create a function to get house payment summary
CREATE OR REPLACE FUNCTION get_house_payment_summary(house_id_param UUID, start_date TIMESTAMPTZ, end_date TIMESTAMPTZ)
RETURNS TABLE (
  total_paid DECIMAL(12, 2),
  total_pending DECIMAL(12, 2),
  total_overdue DECIMAL(12, 2),
  payment_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS total_paid,
    COALESCE(SUM(CASE WHEN status = 'pending' AND (due_date >= CURRENT_DATE OR due_date IS NULL) THEN amount ELSE 0 END), 0) AS total_pending,
    COALESCE(SUM(CASE WHEN status = 'pending' AND due_date < CURRENT_DATE THEN amount ELSE 0 END), 0) AS total_overdue,
    COUNT(*) AS payment_count
  FROM public.payments
  WHERE house_id = house_id_param
  AND (start_date IS NULL OR created_at >= start_date)
  AND (end_date IS NULL OR created_at <= end_date);
END;
$$ LANGUAGE plpgsql STABLE;

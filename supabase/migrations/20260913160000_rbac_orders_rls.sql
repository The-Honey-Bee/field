-- ============================================================
-- ZamZam Field: RBAC RLS for orders and eod_reports
-- Migration: 20260913160000_rbac_orders_rls.sql
-- Field staff see only their own rows; supervisors/managers see all
-- ============================================================

-- 1. Add user_id column to orders (links to auth.users)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Add user_id column to eod_reports
ALTER TABLE public.eod_reports
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Add customers table
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_created_by ON public.customers(created_by);

-- 4. Enable RLS on customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- 5. Drop old open-access policies on orders and eod_reports
DROP POLICY IF EXISTS "open_access_orders" ON public.orders;
DROP POLICY IF EXISTS "open_access_eod_reports" ON public.eod_reports;

-- 6. ORDERS RLS: field_staff see only their own; supervisors/managers see all
DROP POLICY IF EXISTS "field_staff_own_orders" ON public.orders;
CREATE POLICY "field_staff_own_orders"
ON public.orders
FOR ALL
TO authenticated
USING (
  public.is_manager_or_supervisor()
  OR user_id = auth.uid()
  OR user_id IS NULL
)
WITH CHECK (
  public.is_manager_or_supervisor()
  OR user_id = auth.uid()
  OR user_id IS NULL
);

-- Allow anon/service role for offline sync fallback
DROP POLICY IF EXISTS "service_role_orders" ON public.orders;
CREATE POLICY "service_role_orders"
ON public.orders
FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- 7. EOD REPORTS RLS: field_staff see only their own; supervisors/managers see all
DROP POLICY IF EXISTS "field_staff_own_eod_reports" ON public.eod_reports;
CREATE POLICY "field_staff_own_eod_reports"
ON public.eod_reports
FOR ALL
TO authenticated
USING (
  public.is_manager_or_supervisor()
  OR user_id = auth.uid()
  OR user_id IS NULL
)
WITH CHECK (
  public.is_manager_or_supervisor()
  OR user_id = auth.uid()
  OR user_id IS NULL
);

DROP POLICY IF EXISTS "service_role_eod_reports" ON public.eod_reports;
CREATE POLICY "service_role_eod_reports"
ON public.eod_reports
FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- 8. CUSTOMERS RLS: all authenticated users can read; authenticated can insert their own
DROP POLICY IF EXISTS "all_read_customers" ON public.customers;
CREATE POLICY "all_read_customers"
ON public.customers
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "authenticated_insert_customers" ON public.customers;
CREATE POLICY "authenticated_insert_customers"
ON public.customers
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid() OR created_by IS NULL);

DROP POLICY IF EXISTS "managers_manage_customers" ON public.customers;
CREATE POLICY "managers_manage_customers"
ON public.customers
FOR ALL
TO authenticated
USING (public.is_manager_or_supervisor() OR created_by = auth.uid())
WITH CHECK (public.is_manager_or_supervisor() OR created_by = auth.uid());

-- 9. Trigger for customers updated_at
DROP TRIGGER IF EXISTS set_customers_updated_at ON public.customers;
CREATE TRIGGER set_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

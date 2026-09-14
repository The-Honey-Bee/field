-- ============================================================
-- ZamZam Field: Orders & End-of-Day Reports
-- Migration: 20260913110000_orders_and_reports.sql
-- ============================================================

-- 1. TYPES
DROP TYPE IF EXISTS public.order_sync_status CASCADE;
CREATE TYPE public.order_sync_status AS ENUM ('pending', 'synced', 'failed');

DROP TYPE IF EXISTS public.report_sync_status CASCADE;
CREATE TYPE public.report_sync_status AS ENUM ('pending', 'submitted', 'failed');

-- 2. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id TEXT NOT NULL,
    staff_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
    amount_received NUMERIC(10,2) NOT NULL DEFAULT 0,
    change_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    sync_status public.order_sync_status DEFAULT 'synced'::public.order_sync_status,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_staff_id ON public.orders(staff_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_sync_status ON public.orders(sync_status);

-- 3. END-OF-DAY REPORTS TABLE
CREATE TABLE IF NOT EXISTS public.eod_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id TEXT NOT NULL,
    staff_id TEXT NOT NULL,
    report_date DATE NOT NULL,
    total_revenue NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_deliveries INTEGER NOT NULL DEFAULT 0,
    delivered_count INTEGER NOT NULL DEFAULT 0,
    collected_count INTEGER NOT NULL DEFAULT 0,
    partial_count INTEGER NOT NULL DEFAULT 0,
    deliveries JSONB NOT NULL DEFAULT '[]'::jsonb,
    field_notes TEXT DEFAULT '',
    sync_status public.report_sync_status DEFAULT 'submitted'::public.report_sync_status,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_eod_reports_staff_id ON public.eod_reports(staff_id);
CREATE INDEX IF NOT EXISTS idx_eod_reports_report_date ON public.eod_reports(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_eod_reports_sync_status ON public.eod_reports(sync_status);

-- 4. UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- 5. ENABLE RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eod_reports ENABLE ROW LEVEL SECURITY;

-- 6. RLS POLICIES — open access (field staff use staff_id text, not auth.uid)
DROP POLICY IF EXISTS "open_access_orders" ON public.orders;
CREATE POLICY "open_access_orders"
ON public.orders
FOR ALL
TO public
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "open_access_eod_reports" ON public.eod_reports;
CREATE POLICY "open_access_eod_reports"
ON public.eod_reports
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- 7. TRIGGERS
DROP TRIGGER IF EXISTS orders_set_updated_at ON public.orders;
CREATE TRIGGER orders_set_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS eod_reports_set_updated_at ON public.eod_reports;
CREATE TRIGGER eod_reports_set_updated_at
    BEFORE UPDATE ON public.eod_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

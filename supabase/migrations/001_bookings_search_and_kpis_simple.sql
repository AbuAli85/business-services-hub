-- 001_bookings_search_and_kpis_simple.sql
-- Simplified version without pg_trgm dependency

-- Ensure public schema exists and set search path
CREATE SCHEMA IF NOT EXISTS public;
SET search_path TO public, pg_catalog;

-- 1) Helpful indexes (using actual column names from the schema)
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON public.bookings (client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_provider_id ON public.bookings (provider_id);

-- Add missing columns if they don't exist (for search functionality)
DO $$
BEGIN
  -- Add service_title column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'service_title') THEN
    ALTER TABLE public.bookings ADD COLUMN service_title TEXT;
    -- Populate from services table
    UPDATE public.bookings SET service_title = s.title FROM public.services s WHERE bookings.service_id = s.id;
  END IF;
  
  -- Add client_name column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'client_name') THEN
    ALTER TABLE public.bookings ADD COLUMN client_name TEXT;
    -- Populate from profiles table
    UPDATE public.bookings SET client_name = p.full_name FROM public.profiles p WHERE bookings.client_id = p.id;
  END IF;
  
  -- Add provider_name column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'provider_name') THEN
    ALTER TABLE public.bookings ADD COLUMN provider_name TEXT;
    -- Populate from profiles table
    UPDATE public.bookings SET provider_name = p.full_name FROM public.profiles p WHERE bookings.provider_id = p.id;
  END IF;
  
  -- Add amount_cents column if it doesn't exist (for easier calculations)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'amount_cents') THEN
    ALTER TABLE public.bookings ADD COLUMN amount_cents INTEGER;
    -- Populate from total_amount (convert to cents)
    UPDATE public.bookings SET amount_cents = COALESCE(total_amount * 100, 0)::INTEGER;
  END IF;
END $$;

-- Regular indexes for search functionality (no trigram dependency)
CREATE INDEX IF NOT EXISTS idx_bookings_title ON public.bookings (service_title);
CREATE INDEX IF NOT EXISTS idx_bookings_client ON public.bookings (client_name);
CREATE INDEX IF NOT EXISTS idx_bookings_provider ON public.bookings (provider_name);

-- 2) Aggregation view for KPI header (using actual status values)
CREATE OR REPLACE VIEW public.v_bookings_kpis AS
SELECT
  current_date AS as_of_date,
  count(*)::int AS total_projects,
  count(*) FILTER (WHERE status = 'completed')::int AS delivered_projects,
  count(*) FILTER (WHERE status IN ('in_progress','approved'))::int AS active_projects,
  coalesce(sum(COALESCE(amount_cents, total_amount * 100))/100.0, 0)::numeric(12,2) AS total_revenue_omr
FROM public.bookings;

-- 3) Monthly trend (last 6 months)
CREATE OR REPLACE VIEW public.v_bookings_monthly AS
WITH m AS (
  SELECT date_trunc('month', generated)::date AS month_start
  FROM generate_series((date_trunc('month', now()) - interval '5 months')::date, date_trunc('month', now())::date, interval '1 month') AS generated
)
SELECT
  m.month_start,
  count(b.*)::int AS bookings_created,
  count(b.*) FILTER (WHERE b.status='completed')::int AS delivered_count,
  coalesce(sum(COALESCE(b.amount_cents, b.total_amount * 100))/100.0, 0)::numeric(12,2) AS revenue_omr
FROM m
LEFT JOIN public.bookings b
  ON date_trunc('month', b.created_at) = m.month_start
GROUP BY 1
ORDER BY 1;

-- 4) RPC for role-filtered/paginated listings (RLS-friendly)
CREATE OR REPLACE FUNCTION public.bookings_list_paginated(
  p_role text,
  p_user_id uuid,
  p_page int,
  p_page_size int,
  p_search text,
  p_status text,
  p_sort text,
  p_order text
)
RETURNS TABLE (
  id uuid,
  service_title text,
  client_id uuid,
  provider_id uuid,
  client_name text,
  provider_name text,
  status text,
  amount_cents int,
  currency text,
  created_at timestamptz,
  updated_at timestamptz
) LANGUAGE sql stable AS
$$
  WITH base AS (
    SELECT *
    FROM public.bookings b
    WHERE
      -- Role scope (adjust per your RLS model as needed)
      CASE
        WHEN p_role = 'admin' THEN true
        WHEN p_role = 'provider' THEN b.provider_id = p_user_id
        WHEN p_role = 'client' THEN b.client_id = p_user_id
        ELSE false
      END
      AND (p_status IS NULL OR p_status = '' OR b.status = p_status)
      AND (
        p_search IS NULL OR p_search = '' OR
        b.service_title ILIKE '%' || p_search || '%' OR
        b.client_name ILIKE '%' || p_search || '%' OR
        b.provider_name ILIKE '%' || p_search || '%'
      )
  ),
  ordered AS (
    SELECT * FROM base
    ORDER BY
      CASE WHEN p_sort = 'created_at' AND p_order = 'asc'  THEN created_at END ASC,
      CASE WHEN p_sort = 'created_at' AND p_order = 'desc' THEN created_at END DESC,
      CASE WHEN p_sort = 'updated_at' AND p_order = 'asc'  THEN updated_at END ASC,
      CASE WHEN p_sort = 'updated_at' AND p_order = 'desc' THEN updated_at END DESC,
      CASE WHEN p_sort = 'amount'     AND p_order = 'asc'  THEN COALESCE(amount_cents, total_amount * 100) END ASC,
      CASE WHEN p_sort = 'amount'     AND p_order = 'desc' THEN COALESCE(amount_cents, total_amount * 100) END DESC,
      CASE WHEN p_sort = 'title'      AND p_order = 'asc'  THEN service_title END ASC,
      CASE WHEN p_sort = 'title'      AND p_order = 'desc' THEN service_title END DESC,
      created_at DESC -- default
  )
  SELECT
    id, service_title, client_id, provider_id, client_name, provider_name,
    status, COALESCE(amount_cents, total_amount * 100)::int AS amount_cents, currency, created_at, updated_at
  FROM ordered
  OFFSET greatest((p_page-1),0) * p_page_size
  LIMIT p_page_size;
$$;

-- 5) Create triggers to keep denormalized columns in sync
CREATE OR REPLACE FUNCTION sync_booking_denormalized_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Update service_title when service_id changes
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.service_id != NEW.service_id) THEN
    SELECT title INTO NEW.service_title FROM public.services WHERE id = NEW.service_id;
  END IF;
  
  -- Update client_name when client_id changes
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.client_id != NEW.client_id) THEN
    SELECT full_name INTO NEW.client_name FROM public.profiles WHERE id = NEW.client_id;
  END IF;
  
  -- Update provider_name when provider_id changes
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.provider_id != NEW.provider_id) THEN
    SELECT full_name INTO NEW.provider_name FROM public.profiles WHERE id = NEW.provider_id;
  END IF;
  
  -- Update amount_cents when total_amount changes
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.total_amount != NEW.total_amount) THEN
    NEW.amount_cents = COALESCE(NEW.total_amount * 100, 0)::INTEGER;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for bookings table
DROP TRIGGER IF EXISTS sync_booking_denormalized_columns_trigger ON public.bookings;
CREATE TRIGGER sync_booking_denormalized_columns_trigger
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION sync_booking_denormalized_columns();

-- Migration: Enhance v_booking_status View
-- Date: January 2025
-- Description: Add missing columns and performance indexes to v_booking_status

-- Drop the existing view first to avoid column conflicts
DROP VIEW IF EXISTS public.v_booking_status CASCADE;

-- Recreate the view with enhanced structure
CREATE VIEW public.v_booking_status AS
SELECT
  b.id,
  b.title as booking_title,
  b.service_id,
  s.title AS service_title,
  s.description as service_description,
  s.category as service_category,
  b.client_id,
  cp.full_name AS client_name,
  cp.email as client_email,
  cp.company_name as client_company,
  cp.avatar_url as client_avatar,
  b.provider_id,
  pp.full_name AS provider_name,
  pp.email as provider_email,
  pp.company_name as provider_company,
  pp.avatar_url as provider_avatar,
  
  -- Inline progress calculation
  COALESCE(
    CASE 
      WHEN COUNT(DISTINCT m.id) = 0 THEN COALESCE(b.progress_percentage, 0)
      ELSE ROUND(
        (COUNT(DISTINCT CASE WHEN m.status = 'completed' THEN m.id END)::numeric / 
         NULLIF(COUNT(DISTINCT m.id), 0)) * 100
      )
    END, 0
  ) AS progress,
  
  -- Milestone counts
  COUNT(DISTINCT m.id) as total_milestones,
  COUNT(DISTINCT CASE WHEN m.status = 'completed' THEN m.id END) as completed_milestones,
  
  b.status AS raw_status,
  b.approval_status,
  
  -- Standardized status logic
  CASE
    WHEN b.status = 'cancelled' THEN 'cancelled'
    WHEN b.status = 'declined' THEN 'cancelled'
    WHEN b.status IN ('requested', 'pending_review') THEN 'pending'
    WHEN b.status IN ('approved', 'accepted') THEN 'approved'
    WHEN b.status = 'in_progress' THEN 'in_progress'
    WHEN b.status = 'completed' THEN 'completed'
    WHEN b.status = 'pending' AND b.approval_status IS NULL THEN 'pending'
    WHEN b.status = 'pending' AND b.approval_status = 'approved' THEN 'approved'
    WHEN b.status = 'approved' AND (
      CASE 
        WHEN COUNT(DISTINCT m.id) = 0 THEN COALESCE(b.progress_percentage, 0)
        ELSE ROUND(
          (COUNT(DISTINCT CASE WHEN m.status = 'completed' THEN m.id END)::numeric / 
           NULLIF(COUNT(DISTINCT m.id), 0)) * 100
        )
      END
    ) = 0 THEN 'approved'
    WHEN b.status = 'approved' AND (
      CASE 
        WHEN COUNT(DISTINCT m.id) = 0 THEN COALESCE(b.progress_percentage, 0)
        ELSE ROUND(
          (COUNT(DISTINCT CASE WHEN m.status = 'completed' THEN m.id END)::numeric / 
           NULLIF(COUNT(DISTINCT m.id), 0)) * 100
        )
      END
    ) > 0 AND (
      CASE 
        WHEN COUNT(DISTINCT m.id) = 0 THEN COALESCE(b.progress_percentage, 0)
        ELSE ROUND(
          (COUNT(DISTINCT CASE WHEN m.status = 'completed' THEN m.id END)::numeric / 
           NULLIF(COUNT(DISTINCT m.id), 0)) * 100
        )
      END
    ) < 100 THEN 'in_progress'
    WHEN b.status = 'in_progress' THEN 'in_progress'
    WHEN (
      CASE 
        WHEN COUNT(DISTINCT m.id) = 0 THEN COALESCE(b.progress_percentage, 0)
        ELSE ROUND(
          (COUNT(DISTINCT CASE WHEN m.status = 'completed' THEN m.id END)::numeric / 
           NULLIF(COUNT(DISTINCT m.id), 0)) * 100
        )
      END
    ) >= 100 THEN 'completed'
    WHEN b.status = 'completed' THEN 'completed'
    ELSE 'pending'
  END AS display_status,
  
  -- Payment status
  CASE 
    WHEN i.status = 'paid' THEN 'paid'
    WHEN i.status = 'issued' THEN 'pending'
    WHEN i.id IS NOT NULL THEN 'invoiced'
    ELSE 'no_invoice'
  END AS payment_status,
  
  b.amount_cents,
  b.total_amount as amount,
  b.currency,
  b.created_at,
  b.updated_at,
  b.due_at,
  b.requirements,
  b.notes,
  b.scheduled_date,
  b.location,
  i.status as invoice_status,
  i.id as invoice_id
FROM public.bookings b
LEFT JOIN public.services s ON b.service_id = s.id
LEFT JOIN public.profiles cp ON b.client_id = cp.id
LEFT JOIN public.profiles pp ON b.provider_id = pp.id
LEFT JOIN LATERAL (
  -- Get the latest invoice for this booking
  SELECT * FROM invoices 
  WHERE booking_id = b.id 
  ORDER BY created_at DESC 
  LIMIT 1
) i ON true
LEFT JOIN public.milestones m ON m.booking_id = b.id
GROUP BY 
  b.id, b.title, b.service_id, b.client_id, b.provider_id, b.status, b.approval_status,
  b.amount_cents, b.total_amount, b.currency, b.created_at, b.updated_at, b.due_at,
  b.requirements, b.notes, b.scheduled_date, b.location, b.progress_percentage,
  s.title, s.description, s.category,
  cp.full_name, cp.email, cp.company_name, cp.avatar_url,
  pp.full_name, pp.email, pp.company_name, pp.avatar_url,
  i.status, i.id;

-- Add performance indexes on the underlying tables (not the view)
-- These indexes will improve query performance for the v_booking_status view

-- Indexes on bookings table
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON public.bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_provider_id ON public.bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_service_id ON public.bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_approval_status ON public.bookings(approval_status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings(created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_updated_at ON public.bookings(updated_at);

-- Indexes on profiles table (for client/provider lookups)
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON public.profiles(full_name);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_company_name ON public.profiles(company_name);

-- Indexes on services table
CREATE INDEX IF NOT EXISTS idx_services_title ON public.services(title);
CREATE INDEX IF NOT EXISTS idx_services_category ON public.services(category);

-- Indexes on milestones table (for progress calculations)
CREATE INDEX IF NOT EXISTS idx_milestones_booking_id ON public.milestones(booking_id);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON public.milestones(status);

-- Indexes on invoices table
CREATE INDEX IF NOT EXISTS idx_invoices_booking_id ON public.invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);

-- Update comment
COMMENT ON VIEW public.v_booking_status IS 'Enhanced unified booking view with standardized status logic, performance indexes, and all required columns';

-- Grant permissions (ensure they're still in place)
GRANT SELECT ON public.v_booking_status TO authenticated;
GRANT SELECT ON public.v_booking_status TO anon;

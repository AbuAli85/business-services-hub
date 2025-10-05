-- Migration #212: Analytics Performance Indexes
-- Date: 2025-10-05
-- Purpose: Optimize analytics queries with strategic indexes

-- 1. Indexes for time-series analytics
CREATE INDEX IF NOT EXISTS idx_bookings_created_at_status ON public.bookings(created_at, status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at_progress ON public.bookings(created_at, progress_percentage);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at_amount ON public.bookings(created_at, total_amount);
CREATE INDEX IF NOT EXISTS idx_bookings_status_amount ON public.bookings(status, total_amount);

-- 2. Indexes for completion analytics (completion timestamp not available)
-- Note: Completion time analytics disabled due to missing completion timestamp column

-- 3. Indexes for service performance analytics
CREATE INDEX IF NOT EXISTS idx_bookings_service_id_status ON public.bookings(service_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_service_id_created ON public.bookings(service_id, created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_service_id_amount ON public.bookings(service_id, total_amount);

-- 4. Composite indexes for complex analytics queries
CREATE INDEX IF NOT EXISTS idx_bookings_analytics_composite ON public.bookings(
  created_at, 
  status, 
  progress_percentage, 
  total_amount, 
  service_id
);

-- 5. Indexes for date range queries (common in analytics)
CREATE INDEX IF NOT EXISTS idx_bookings_date_range ON public.bookings(created_at DESC);

-- 6. Partial indexes for specific status analytics
CREATE INDEX IF NOT EXISTS idx_bookings_completed_analytics ON public.bookings(
  created_at, 
  total_amount
) WHERE status = 'completed';

CREATE INDEX IF NOT EXISTS idx_bookings_in_progress_analytics ON public.bookings(
  created_at, 
  progress_percentage, 
  total_amount
) WHERE status = 'in_progress';

-- 7. Indexes for milestone analytics (if milestones table exists)
CREATE INDEX IF NOT EXISTS idx_milestones_booking_created ON public.milestones(booking_id, created_at);
CREATE INDEX IF NOT EXISTS idx_milestones_status_created ON public.milestones(status, created_at);

-- 8. Indexes for invoice analytics (if invoices table exists)
CREATE INDEX IF NOT EXISTS idx_invoices_booking_created ON public.invoices(booking_id, created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_status_amount ON public.invoices(status, amount);

-- Add comments for documentation
COMMENT ON INDEX idx_bookings_created_at_status IS 'Optimizes time-series queries by creation date and status';
COMMENT ON INDEX idx_bookings_created_at_progress IS 'Accelerates progress-based analytics queries';
COMMENT ON INDEX idx_bookings_created_at_amount IS 'Speeds up revenue analytics by date and amount';
COMMENT ON INDEX idx_bookings_status_amount IS 'Optimizes revenue breakdown by status queries';
-- Completion time analytics comments removed - completion timestamp column not available
COMMENT ON INDEX idx_bookings_service_id_status IS 'Optimizes service performance analytics';
COMMENT ON INDEX idx_bookings_service_id_created IS 'Accelerates service trend analysis';
COMMENT ON INDEX idx_bookings_service_id_amount IS 'Speeds up service revenue analytics';
COMMENT ON INDEX idx_bookings_analytics_composite IS 'Composite index for complex analytics queries';
COMMENT ON INDEX idx_bookings_date_range IS 'Optimizes recent data queries (last 365 days)';
COMMENT ON INDEX idx_bookings_completed_analytics IS 'Partial index for completed booking analytics';
COMMENT ON INDEX idx_bookings_in_progress_analytics IS 'Partial index for in-progress booking analytics';

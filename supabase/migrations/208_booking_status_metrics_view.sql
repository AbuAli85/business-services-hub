-- Migration #208: Create v_booking_status_metrics
-- Date: 2025-10-05
-- Purpose: Simplified analytics summary for dashboards

CREATE OR REPLACE VIEW public.v_booking_status_metrics AS
SELECT
  COUNT(*)                                  AS total_bookings,
  COUNT(*) FILTER (WHERE display_status='pending')      AS pending_count,
  COUNT(*) FILTER (WHERE display_status='approved')     AS approved_count,
  COUNT(*) FILTER (WHERE display_status='in_progress')  AS in_progress_count,
  COUNT(*) FILTER (WHERE display_status='completed')    AS completed_count,
  COUNT(*) FILTER (WHERE display_status='cancelled')    AS cancelled_count,
  ROUND(AVG(progress)::NUMERIC,1)                       AS avg_progress,
  COALESCE(SUM(amount),0)                               AS total_revenue
FROM public.v_booking_status;

COMMENT ON VIEW public.v_booking_status_metrics IS
'Aggregated KPIs for the dashboard (bookings count, average progress, revenue, etc.)';

-- Grant basic permissions
GRANT SELECT ON public.v_booking_status_metrics TO authenticated;

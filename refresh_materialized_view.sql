-- Refresh Materialized View for Progress Analytics
-- Run this to update the cached analytics data

-- Option 1: Create unique index first (required for concurrent refresh)
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_booking_progress_analytics_unique 
ON mv_booking_progress_analytics(booking_id);

-- Option 2: Refresh the materialized view (if it exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_matviews 
    WHERE schemaname = 'public' 
    AND matviewname = 'mv_booking_progress_analytics'
  ) THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_booking_progress_analytics;
    RAISE NOTICE 'Materialized view refreshed successfully';
  ELSE
    RAISE NOTICE 'Materialized view does not exist - API will use fallback calculation';
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- If concurrent refresh fails, try regular refresh
  RAISE NOTICE 'Concurrent refresh failed, trying regular refresh...';
  REFRESH MATERIALIZED VIEW mv_booking_progress_analytics;
  RAISE NOTICE 'Materialized view refreshed (non-concurrent)';
END $$;

-- Option 2: Check if the view has data
SELECT 
  booking_id,
  total_milestones,
  completed_milestones,
  total_tasks,
  completed_tasks,
  booking_progress
FROM mv_booking_progress_analytics
WHERE booking_id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';

-- Option 3: Verify booking progress directly
SELECT 
  id,
  title,
  progress_percentage,
  project_progress,
  status
FROM public.bookings
WHERE id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';

-- Option 4: Verify milestone and task counts manually
SELECT 
  COUNT(DISTINCT m.id) as total_milestones,
  COUNT(DISTINCT CASE WHEN m.status = 'completed' THEN m.id END) as completed_milestones,
  COUNT(DISTINCT CASE WHEN m.status = 'in_progress' THEN m.id END) as in_progress_milestones,
  COUNT(t.id) as total_tasks,
  COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
  COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tasks,
  COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pending_tasks
FROM public.bookings b
LEFT JOIN public.milestones m ON m.booking_id = b.id
LEFT JOIN public.tasks t ON t.milestone_id = m.id
WHERE b.id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f'
GROUP BY b.id;


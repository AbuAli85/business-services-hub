-- Fix Stack Depth Limit Exceeded Error
-- This migration addresses the PostgreSQL stack depth limit exceeded error (54001)
-- by optimizing complex queries and preventing recursive function calls

-- 1. Increase max_stack_depth configuration
-- Note: This needs to be set in postgresql.conf or via ALTER SYSTEM
-- For Supabase, this should be set in the project settings

-- 2. Optimize complex views to prevent deep recursion
-- Replace the complex user_enriched view with a simpler version

DROP VIEW IF EXISTS public.user_enriched CASCADE;

CREATE VIEW public.user_enriched AS
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.phone,
  p.country,
  p.company_id,
  p.is_verified,
  p.created_at,
  p.updated_at,
  
  -- Company information (simplified)
  comp.name as company_name,
  comp.cr_number as company_cr_number,
  comp.vat_number as company_vat_number,
  comp.logo_url as company_logo_url,
  
  -- Role information (simplified to prevent recursion)
  COALESCE(p.role, 'client') as primary_role,
  
  -- Basic statistics (calculated separately to avoid deep joins)
  COALESCE(
    (SELECT COUNT(*) FROM public.bookings b WHERE b.client_id = p.id),
    0
  ) as client_booking_count,
  
  COALESCE(
    (SELECT COUNT(DISTINCT s.id) FROM public.services s WHERE s.provider_id = p.id),
    0
  ) as provider_service_count

FROM public.profiles p
LEFT JOIN public.companies comp ON p.company_id = comp.id;

-- 3. Create optimized service_enriched view
DROP VIEW IF EXISTS public.service_enriched CASCADE;

CREATE VIEW public.service_enriched AS
SELECT
  s.id,
  s.title,
  s.description,
  s.category,
  s.status,
  s.base_price,
  s.currency,
  s.cover_image_url,
  s.featured,
  s.created_at,
  s.updated_at,
  
  -- Provider information (simplified)
  p.full_name as provider_name,
  p.email as provider_email,
  
  -- Company information (simplified)
  comp.name as company_name,
  
  -- Basic statistics (calculated separately)
  COALESCE(
    (SELECT COUNT(*) FROM public.bookings b WHERE b.service_id = s.id),
    0
  ) as booking_count,
  
  COALESCE(
    (SELECT SUM(COALESCE(b.total_amount, 0)) FROM public.bookings b WHERE b.service_id = s.id),
    0
  ) as total_revenue

FROM public.services s
LEFT JOIN public.profiles p ON s.provider_id = p.id
LEFT JOIN public.companies comp ON p.company_id = comp.id;

-- 4. Create non-recursive progress calculation functions
-- Replace the recursive functions with iterative versions

DROP FUNCTION IF EXISTS calculate_booking_progress(uuid);
DROP FUNCTION IF EXISTS update_milestone_progress(uuid);

-- Create a simple, non-recursive calculate_booking_progress function
CREATE OR REPLACE FUNCTION calculate_booking_progress(booking_id uuid)
RETURNS INTEGER AS $$
DECLARE
  total_progress INTEGER;
  weighted_progress NUMERIC := 0;
  total_weight NUMERIC := 0;
  milestone_count INTEGER := 0;
BEGIN
  -- Calculate weighted progress using a single query instead of a loop
  SELECT 
    COALESCE(ROUND(
      SUM(COALESCE(m.progress_percentage, 0) * COALESCE(m.weight, 1)) / 
      NULLIF(SUM(COALESCE(m.weight, 1)), 0)
    ), 0),
    COUNT(*)
  INTO total_progress, milestone_count
  FROM milestones m
  WHERE m.booking_id = calculate_booking_progress.booking_id;
  
  -- Return 0 if no milestones exist
  IF milestone_count = 0 THEN
    total_progress := 0;
  END IF;
  
  -- Update the bookings table with the calculated progress
  UPDATE bookings 
  SET 
    project_progress = total_progress,
    updated_at = now()
  WHERE id = booking_id;
  
  RETURN total_progress;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a simple, non-recursive update_milestone_progress function
CREATE OR REPLACE FUNCTION update_milestone_progress(milestone_uuid uuid)
RETURNS void AS $$
DECLARE
  new_progress_percentage INTEGER;
  total_tasks INTEGER;
  completed_tasks INTEGER;
BEGIN
  -- Calculate progress using a single query
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed')
  INTO total_tasks, completed_tasks
  FROM tasks 
  WHERE milestone_id = milestone_uuid;

  -- Calculate progress percentage
  IF total_tasks > 0 THEN
    new_progress_percentage := ROUND((completed_tasks::NUMERIC / total_tasks::NUMERIC) * 100);
  ELSE
    new_progress_percentage := 0;
  END IF;

  -- Update milestone progress
  UPDATE milestones 
  SET 
    progress_percentage = new_progress_percentage,
    updated_at = now()
  WHERE id = milestone_uuid;
  
  -- Note: We don't call calculate_booking_progress here to prevent recursion
  -- The booking progress should be updated separately when needed
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create a safe update_task function that doesn't cause recursion
CREATE OR REPLACE FUNCTION update_task(
  task_id uuid,
  title text DEFAULT NULL,
  status text DEFAULT NULL,
  due_date timestamptz DEFAULT NULL
) RETURNS void AS $$
DECLARE
  m_id uuid;
BEGIN
  -- Update the task
  UPDATE tasks
  SET 
    title = COALESCE(update_task.title, tasks.title),
    status = COALESCE(update_task.status, tasks.status),
    due_date = COALESCE(update_task.due_date, tasks.due_date),
    updated_at = now()
  WHERE id = task_id
  RETURNING milestone_id INTO m_id;

  -- Update milestone progress (non-recursive)
  IF m_id IS NOT NULL THEN
    PERFORM update_milestone_progress(m_id);
  END IF;
  
  -- Note: We don't call calculate_booking_progress here to prevent recursion
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Grant necessary permissions
GRANT EXECUTE ON FUNCTION calculate_booking_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_milestone_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_task(uuid, text, text, timestamptz) TO authenticated;

-- 7. Create indexes to improve query performance and reduce stack usage
CREATE INDEX IF NOT EXISTS idx_milestones_booking_id ON milestones(booking_id);
CREATE INDEX IF NOT EXISTS idx_tasks_milestone_id ON tasks(milestone_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_bookings_service_id ON bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON bookings(client_id);

-- 8. Add comments explaining the optimizations
COMMENT ON FUNCTION calculate_booking_progress(uuid) IS 'Optimized function to calculate booking progress without recursion';
COMMENT ON FUNCTION update_milestone_progress(uuid) IS 'Optimized function to update milestone progress without recursion';
COMMENT ON FUNCTION update_task(uuid, text, text, timestamptz) IS 'Optimized function to update tasks without causing recursion';

-- 9. Log the completion
DO $$
BEGIN
    RAISE NOTICE 'Stack depth limit fix applied successfully!';
    RAISE NOTICE 'Complex views simplified to prevent deep recursion';
    RAISE NOTICE 'Recursive functions replaced with iterative versions';
    RAISE NOTICE 'Additional indexes created for better performance';
    RAISE NOTICE 'Consider increasing max_stack_depth in PostgreSQL configuration if issues persist';
END $$;

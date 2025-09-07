-- Comprehensive Database Fix for Progress Tracking System
-- This script fixes all database schema and function issues

-- 1. Fix time_entries table - Add missing columns
DO $$
BEGIN
  -- Add logged_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'time_entries' 
    AND column_name = 'logged_at'
  ) THEN
    ALTER TABLE public.time_entries 
    ADD COLUMN logged_at timestamptz DEFAULT now();
    
    -- Update existing rows
    UPDATE public.time_entries 
    SET logged_at = created_at 
    WHERE logged_at IS NULL;
    
    RAISE NOTICE 'Added logged_at column to time_entries table';
  END IF;
  
  -- Add description column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'time_entries' 
    AND column_name = 'description'
  ) THEN
    ALTER TABLE public.time_entries 
    ADD COLUMN description text;
    RAISE NOTICE 'Added description column to time_entries table';
  END IF;
  
  -- Add milestone_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'time_entries' 
    AND column_name = 'milestone_id'
  ) THEN
    ALTER TABLE public.time_entries 
    ADD COLUMN milestone_id uuid;
    RAISE NOTICE 'Added milestone_id column to time_entries table';
  END IF;
  
  -- Add task_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'time_entries' 
    AND column_name = 'task_id'
  ) THEN
    ALTER TABLE public.time_entries 
    ADD COLUMN task_id uuid;
    RAISE NOTICE 'Added task_id column to time_entries table';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error adding columns to time_entries: %', SQLERRM;
END $$;

-- 2. Fix update_milestone_progress function - Remove ambiguous column references
DROP FUNCTION IF EXISTS update_milestone_progress(uuid);

CREATE OR REPLACE FUNCTION update_milestone_progress(milestone_uuid uuid)
RETURNS void AS $$
DECLARE
  total_task_count INTEGER;
  completed_task_count INTEGER;
  progress_pct INTEGER;
  total_actual_hours NUMERIC := 0;
  milestone_record RECORD;
BEGIN
  -- Get milestone details
  SELECT
    m.estimated_hours,
    m.status
  INTO milestone_record
  FROM public.milestones m
  WHERE m.id = milestone_uuid;

  -- Count total and completed tasks
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE t.status = 'completed'),
    COALESCE(SUM(t.actual_hours), 0)
  INTO total_task_count, completed_task_count, total_actual_hours
  FROM public.tasks t
  WHERE t.milestone_id = milestone_uuid;

  -- Calculate progress percentage
  IF total_task_count > 0 THEN
    progress_pct := ROUND((completed_task_count::NUMERIC / total_task_count::NUMERIC) * 100);
  ELSE
    progress_pct := 0;
  END IF;

  -- Update milestone with new progress
  UPDATE public.milestones
  SET
    completed_tasks = completed_task_count,
    total_tasks = total_task_count,
    progress_percentage = progress_pct,
    actual_hours = total_actual_hours,
    updated_at = now()
  WHERE id = milestone_uuid;

  -- Update milestone status based on progress
  IF progress_pct = 100 THEN
    UPDATE public.milestones
    SET status = 'completed', updated_at = now()
    WHERE id = milestone_uuid;
  ELSIF progress_pct > 0 THEN
    UPDATE public.milestones
    SET status = 'in_progress', updated_at = now()
    WHERE id = milestone_uuid AND status = 'pending';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_milestone_progress(uuid) TO authenticated;

-- 3. Add sample tasks to existing milestones
-- First, let's add tasks for the specific booking shown in the screenshot
INSERT INTO public.tasks (
  milestone_id,
  title,
  description,
  status,
  priority,
  estimated_hours,
  actual_hours,
  order_index,
  created_at,
  updated_at
)
SELECT 
  m.id as milestone_id,
  task_data.title,
  task_data.description,
  CASE 
    WHEN task_data.milestone_order = 0 THEN 'in_progress'
    ELSE 'pending'
  END as status,
  task_data.priority,
  task_data.estimated_hours,
  0 as actual_hours,
  task_data.milestone_order,
  now() as created_at,
  now() as updated_at
FROM public.milestones m
CROSS JOIN (
  -- Translation Services tasks
  VALUES 
    (0, 'Document Analysis', 'Analyze source documents and identify translation requirements', 'high', 1.0),
    (1, 'Language Pair Assessment', 'Evaluate source and target language complexity', 'high', 0.5),
    (2, 'Glossary Creation', 'Create specialized terminology glossary', 'medium', 1.5),
    (3, 'Style Guide Development', 'Develop translation style and tone guidelines', 'medium', 1.0),
    (4, 'Timeline Planning', 'Create detailed project timeline and milestones', 'high', 0.5),
    (5, 'Initial Translation', 'Complete first draft of all documents', 'high', 4.0),
    (6, 'Technical Translation', 'Translate technical and specialized content', 'high', 3.0),
    (7, 'Marketing Content Translation', 'Translate marketing materials and copy', 'medium', 2.0),
    (8, 'Legal Document Translation', 'Handle legal and compliance documents', 'high', 2.5),
    (9, 'Website Content Translation', 'Translate website pages and interface', 'medium', 2.0),
    (10, 'Multimedia Translation', 'Translate subtitles and audio content', 'medium', 1.5),
    (11, 'Proofreading', 'Thorough proofreading of all translated content', 'high', 2.0),
    (12, 'Technical Review', 'Review technical accuracy and terminology', 'high', 1.5),
    (13, 'Cultural Adaptation', 'Ensure cultural appropriateness and localization', 'medium', 1.0),
    (14, 'Consistency Check', 'Verify terminology consistency across documents', 'medium', 1.0),
    (15, 'Formatting Review', 'Ensure proper formatting and layout preservation', 'low', 1.0),
    (16, 'Client Review', 'Submit for client review and feedback', 'high', 0.5),
    (17, 'Revision Implementation', 'Implement client feedback and corrections', 'high', 1.5),
    (18, 'Final Proofreading', 'Final proofreading before delivery', 'high', 1.0),
    (19, 'Document Formatting', 'Format final documents for delivery', 'medium', 1.0),
    (20, 'Delivery Preparation', 'Prepare final package for client delivery', 'medium', 0.5)
) AS task_data(milestone_order, title, description, priority, estimated_hours)
WHERE m.order_index = task_data.milestone_order
  AND m.booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5' -- The specific booking from screenshot
  AND NOT EXISTS (
    SELECT 1 FROM public.tasks t WHERE t.milestone_id = m.id
  );

-- 4. Update booking progress after adding tasks
UPDATE public.bookings 
SET project_progress = (
  SELECT COALESCE(
    ROUND(
      (COUNT(CASE WHEN t.status = 'completed' THEN 1 END)::decimal / 
       NULLIF(COUNT(t.id), 0)) * 100
    ), 0
  )
  FROM public.milestones m
  LEFT JOIN public.tasks t ON m.id = t.milestone_id
  WHERE m.booking_id = public.bookings.id
)
WHERE id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5';

-- 5. Create sample time entries for demonstration
INSERT INTO public.time_entries (
  booking_id,
  milestone_id,
  task_id,
  user_id,
  duration_hours,
  description,
  logged_at,
  created_at
)
SELECT 
  'bbdf8c8b-eef0-474d-be9e-06686042dbe5' as booking_id,
  m.id as milestone_id,
  t.id as task_id,
  'd2ce1fe9-806f-4dbc-8efb-9cf160f19e4b' as user_id,
  2.5 as duration_hours,
  'Initial document analysis and requirements gathering' as description,
  now() - INTERVAL '2 hours' as logged_at,
  now() - INTERVAL '2 hours' as created_at
FROM public.milestones m
JOIN public.tasks t ON m.id = t.milestone_id
WHERE m.booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5'
  AND t.status = 'in_progress'
  AND NOT EXISTS (
    SELECT 1 FROM public.time_entries te 
    WHERE te.booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5'
  );

-- 6. Update milestone progress after adding tasks and time entries
DO $$
DECLARE
  milestone_record RECORD;
BEGIN
  FOR milestone_record IN 
    SELECT id FROM public.milestones 
    WHERE booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5'
  LOOP
    PERFORM update_milestone_progress(milestone_record.id);
  END LOOP;
END $$;

-- 7. Show summary of what was fixed
SELECT 
  'Database Fix Complete!' as status,
  (SELECT COUNT(*) FROM public.tasks WHERE milestone_id IN (
    SELECT id FROM public.milestones WHERE booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5'
  )) as tasks_created,
  (SELECT COUNT(*) FROM public.time_entries WHERE booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5') as time_entries_created,
  (SELECT project_progress FROM public.bookings WHERE id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5') as booking_progress;

-- 8. Test the time_entries query that was failing
SELECT 
  id,
  duration_hours,
  description,
  logged_at,
  user_id
FROM public.time_entries
WHERE booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5'
ORDER BY logged_at DESC;

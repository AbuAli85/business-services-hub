-- Debug Specific Booking: bbdf8c8b-eef0-474d-be9e-06686042dbe5
-- This script investigates why no tasks are being created for this specific booking

-- 1. Check if the specific booking exists and its details
SELECT 
  'Specific Booking Details:' as info,
  id,
  title,
  status,
  service_id,
  client_id,
  provider_id,
  project_progress,
  created_at
FROM public.bookings 
WHERE id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5';

-- 2. Check if milestones exist for this specific booking
SELECT 
  'Milestones for Specific Booking:' as info,
  id,
  title,
  description,
  order_index,
  status,
  booking_id
FROM public.milestones 
WHERE booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5'
ORDER BY order_index;

-- 3. If no milestones exist, create them for this specific booking
DO $$
DECLARE
  booking_exists boolean;
  milestone_count integer;
BEGIN
  -- Check if booking exists
  SELECT EXISTS(
    SELECT 1 FROM public.bookings 
    WHERE id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5'
  ) INTO booking_exists;
  
  IF booking_exists THEN
    RAISE NOTICE 'Booking bbdf8c8b-eef0-474d-be9e-06686042dbe5 exists';
    
    -- Check milestone count
    SELECT COUNT(*) INTO milestone_count
    FROM public.milestones 
    WHERE booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5';
    
    RAISE NOTICE 'Existing milestones: %', milestone_count;
    
    -- Create milestones if none exist
    IF milestone_count = 0 THEN
      INSERT INTO public.milestones (
        booking_id, title, description, weight, estimated_hours, order_index,
        status, due_date, created_at, updated_at
      )
      VALUES
        ('bbdf8c8b-eef0-474d-be9e-06686042dbe5', 'Project Planning', 'Initial project setup and requirements analysis', 1.0, 4.0, 0, 'in_progress', now() + INTERVAL '1 week', now(), now()),
        ('bbdf8c8b-eef0-474d-be9e-06686042dbe5', 'Translation Phase', 'Main translation work and content creation', 2.0, 16.0, 1, 'pending', now() + INTERVAL '2 weeks', now(), now()),
        ('bbdf8c8b-eef0-474d-be9e-06686042dbe5', 'Quality Assurance', 'Proofreading, review, and quality checks', 1.5, 8.0, 2, 'pending', now() + INTERVAL '3 weeks', now(), now()),
        ('bbdf8c8b-eef0-474d-be9e-06686042dbe5', 'Finalization', 'Client review, revisions, and final delivery', 1.0, 4.0, 3, 'pending', now() + INTERVAL '4 weeks', now(), now());
      
      RAISE NOTICE 'Created 4 milestones for booking bbdf8c8b-eef0-474d-be9e-06686042dbe5';
    ELSE
      RAISE NOTICE 'Milestones already exist for this booking';
    END IF;
  ELSE
    RAISE NOTICE 'Booking bbdf8c8b-eef0-474d-be9e-06686042dbe5 does not exist';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error: %', SQLERRM;
END $$;

-- 4. Verify milestones were created
SELECT 
  'Milestones After Creation:' as info,
  id,
  title,
  order_index,
  status
FROM public.milestones 
WHERE booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5'
ORDER BY order_index;

-- 5. Create tasks for each milestone
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
WHERE m.booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5'
  AND m.order_index = task_data.milestone_order
  AND NOT EXISTS (
    SELECT 1 FROM public.tasks t WHERE t.milestone_id = m.id
  );

-- 6. Verify tasks were created
SELECT 
  'Tasks Created:' as info,
  COUNT(*) as task_count,
  COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_count,
  COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pending_count
FROM public.tasks t
JOIN public.milestones m ON t.milestone_id = m.id
WHERE m.booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5';

-- 7. Create sample time entries
INSERT INTO public.time_entries (
  booking_id,
  milestone_id,
  task_id,
  user_id,
  duration_hours,
  description,
  start_time,
  logged_at,
  created_at
)
SELECT 
  'bbdf8c8b-eef0-474d-be9e-06686042dbe5' as booking_id,
  m.id as milestone_id,
  t.id as task_id,
  'd2ce1fe9-806f-4dbc-8efb-9cf160f19e4b' as user_id,
  2.5 as duration_hours,
  'Initial project setup and planning work' as description,
  now() - INTERVAL '2 hours' as start_time,
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

-- 8. Update progress for all milestones
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

-- 9. Update booking progress
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

-- 10. Show final results
SELECT 
  'Final Results for bbdf8c8b-eef0-474d-be9e-06686042dbe5:' as status,
  (SELECT COUNT(*) FROM public.tasks WHERE milestone_id IN (
    SELECT id FROM public.milestones WHERE booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5'
  )) as tasks_created,
  (SELECT COUNT(*) FROM public.time_entries WHERE booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5') as time_entries_created,
  (SELECT project_progress FROM public.bookings WHERE id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5') as booking_progress;

-- 11. Test the time_entries query that was failing
SELECT 
  id,
  duration_hours,
  description,
  start_time,
  logged_at,
  user_id
FROM public.time_entries
WHERE booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5'
ORDER BY logged_at DESC;

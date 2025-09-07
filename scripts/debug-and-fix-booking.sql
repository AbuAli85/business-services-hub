-- Debug and Fix Booking Progress Tracking
-- This script investigates why no tasks were created and fixes the issue

-- 1. First, let's check what bookings exist and their details
SELECT 
  'Available Bookings:' as info,
  id,
  title,
  status,
  service_id,
  client_id,
  provider_id,
  project_progress
FROM public.bookings 
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check if milestones exist for any bookings
SELECT 
  'Milestones for Bookings:' as info,
  b.id as booking_id,
  b.title as booking_title,
  COUNT(m.id) as milestone_count
FROM public.bookings b
LEFT JOIN public.milestones m ON b.id = m.booking_id
GROUP BY b.id, b.title
ORDER BY milestone_count DESC;

-- 3. Check if the specific booking from screenshot exists
SELECT 
  'Specific Booking Check:' as info,
  id,
  title,
  status,
  service_id,
  project_progress
FROM public.bookings 
WHERE id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5';

-- 4. If the specific booking doesn't exist, let's find the most recent booking
SELECT 
  'Most Recent Booking:' as info,
  id,
  title,
  status,
  service_id,
  project_progress
FROM public.bookings 
ORDER BY created_at DESC
LIMIT 1;

-- 5. Create milestones for the most recent booking if they don't exist
DO $$
DECLARE
  target_booking_id uuid;
  target_service_id uuid;
  milestone_count integer;
BEGIN
  -- Get the most recent booking
  SELECT id, service_id INTO target_booking_id, target_service_id
  FROM public.bookings 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  -- Check if milestones exist for this booking
  SELECT COUNT(*) INTO milestone_count
  FROM public.milestones 
  WHERE booking_id = target_booking_id;
  
  RAISE NOTICE 'Target booking ID: %', target_booking_id;
  RAISE NOTICE 'Target service ID: %', target_service_id;
  RAISE NOTICE 'Existing milestones: %', milestone_count;
  
  -- If no milestones exist, create them
  IF milestone_count = 0 THEN
    -- Create milestones based on service type
    IF target_service_id = '770e8400-e29b-41d4-a716-446655440007' THEN
      -- Translation Services milestones
      INSERT INTO public.milestones (
        booking_id, title, description, weight, estimated_hours, order_index,
        status, due_date, created_at, updated_at
      )
      VALUES
        (target_booking_id, 'Project Planning', 'Initial project setup and requirements analysis', 1.0, 4.0, 0, 'in_progress', now() + INTERVAL '1 week', now(), now()),
        (target_booking_id, 'Translation Phase', 'Main translation work and content creation', 2.0, 16.0, 1, 'pending', now() + INTERVAL '2 weeks', now(), now()),
        (target_booking_id, 'Quality Assurance', 'Proofreading, review, and quality checks', 1.5, 8.0, 2, 'pending', now() + INTERVAL '3 weeks', now(), now()),
        (target_booking_id, 'Finalization', 'Client review, revisions, and final delivery', 1.0, 4.0, 3, 'pending', now() + INTERVAL '4 weeks', now(), now());
      
      RAISE NOTICE 'Created Translation Services milestones for booking %', target_booking_id;
    ELSE
      -- Generic milestones for other services
      INSERT INTO public.milestones (
        booking_id, title, description, weight, estimated_hours, order_index,
        status, due_date, created_at, updated_at
      )
      VALUES
        (target_booking_id, 'Project Initiation', 'Project setup and initial planning', 1.0, 4.0, 0, 'in_progress', now() + INTERVAL '1 week', now(), now()),
        (target_booking_id, 'Development Phase', 'Main development and implementation work', 2.0, 16.0, 1, 'pending', now() + INTERVAL '2 weeks', now(), now()),
        (target_booking_id, 'Testing & Review', 'Quality assurance and testing phase', 1.5, 8.0, 2, 'pending', now() + INTERVAL '3 weeks', now(), now()),
        (target_booking_id, 'Final Delivery', 'Final review and project delivery', 1.0, 4.0, 3, 'pending', now() + INTERVAL '4 weeks', now(), now());
      
      RAISE NOTICE 'Created generic milestones for booking %', target_booking_id;
    END IF;
  END IF;
END $$;

-- 6. Now add tasks to the milestones
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
  -- Generic tasks for all milestones
  VALUES 
    (0, 'Initial Setup', 'Set up project workspace and tools', 'high', 1.0),
    (1, 'Requirements Analysis', 'Analyze and document project requirements', 'high', 2.0),
    (2, 'Planning', 'Create detailed project plan and timeline', 'medium', 1.0),
    (3, 'Core Development', 'Implement main project functionality', 'high', 4.0),
    (4, 'Testing', 'Test all implemented features', 'high', 2.0),
    (5, 'Documentation', 'Create project documentation', 'medium', 1.0),
    (6, 'Review', 'Review work and prepare for delivery', 'high', 1.0),
    (7, 'Final Testing', 'Final quality assurance testing', 'high', 2.0),
    (8, 'Delivery Preparation', 'Prepare final deliverables', 'medium', 1.0),
    (9, 'Client Handover', 'Present work to client and get feedback', 'high', 1.0)
) AS task_data(milestone_order, title, description, priority, estimated_hours)
WHERE m.order_index = task_data.milestone_order
  AND m.booking_id IN (
    SELECT id FROM public.bookings 
    ORDER BY created_at DESC 
    LIMIT 1
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.tasks t WHERE t.milestone_id = m.id
  );

-- 7. Create sample time entries
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
  m.booking_id,
  m.id as milestone_id,
  t.id as task_id,
  b.client_id as user_id,
  2.5 as duration_hours,
  'Initial project setup and planning work' as description,
  now() - INTERVAL '2 hours' as logged_at,
  now() - INTERVAL '2 hours' as created_at
FROM public.milestones m
JOIN public.tasks t ON m.id = t.milestone_id
JOIN public.bookings b ON m.booking_id = b.id
WHERE m.booking_id IN (
  SELECT id FROM public.bookings 
  ORDER BY created_at DESC 
  LIMIT 1
)
AND t.status = 'in_progress'
AND NOT EXISTS (
  SELECT 1 FROM public.time_entries te 
  WHERE te.booking_id = m.booking_id
);

-- 8. Update progress for all milestones
DO $$
DECLARE
  milestone_record RECORD;
BEGIN
  FOR milestone_record IN 
    SELECT id FROM public.milestones 
    WHERE booking_id IN (
      SELECT id FROM public.bookings 
      ORDER BY created_at DESC 
      LIMIT 1
    )
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
WHERE id IN (
  SELECT id FROM public.bookings 
  ORDER BY created_at DESC 
  LIMIT 1
);

-- 10. Show final results
SELECT 
  'Final Results:' as status,
  (SELECT COUNT(*) FROM public.tasks WHERE milestone_id IN (
    SELECT id FROM public.milestones WHERE booking_id IN (
      SELECT id FROM public.bookings ORDER BY created_at DESC LIMIT 1
    )
  )) as tasks_created,
  (SELECT COUNT(*) FROM public.time_entries WHERE booking_id IN (
    SELECT id FROM public.bookings ORDER BY created_at DESC LIMIT 1
  )) as time_entries_created,
  (SELECT project_progress FROM public.bookings ORDER BY created_at DESC LIMIT 1) as booking_progress,
  (SELECT id FROM public.bookings ORDER BY created_at DESC LIMIT 1) as target_booking_id;

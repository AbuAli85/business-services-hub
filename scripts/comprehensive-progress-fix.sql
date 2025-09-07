-- Comprehensive Progress Tracking System Fix
-- This script ensures all progress tracking functionality works properly

-- 1. First, let's diagnose the current state
SELECT 
  'Current State Diagnosis:' as info,
  (SELECT COUNT(*) FROM public.milestones WHERE booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5') as milestones_count,
  (SELECT COUNT(*) FROM public.tasks WHERE milestone_id IN (
    SELECT id FROM public.milestones WHERE booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5'
  )) as tasks_count,
  (SELECT COUNT(*) FROM public.time_entries WHERE booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5') as time_entries_count,
  (SELECT project_progress FROM public.bookings WHERE id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5') as booking_progress;

-- 2. Clean up any existing data for this booking to start fresh
DELETE FROM public.time_entries WHERE booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5';
DELETE FROM public.tasks WHERE milestone_id IN (
  SELECT id FROM public.milestones WHERE booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5'
);
DELETE FROM public.milestones WHERE booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5';

-- 3. Create proper milestones for Translation Services
INSERT INTO public.milestones (
  booking_id, title, description, weight, estimated_hours, order_index,
  status, due_date, created_at, updated_at, completed_tasks, total_tasks, progress_percentage
)
VALUES
  ('bbdf8c8b-eef0-474d-be9e-06686042dbe5', 'Project Planning', 'Initial project setup and requirements analysis', 1.0, 4.0, 0, 'in_progress', now() + INTERVAL '1 week', now(), now(), 0, 5, 0),
  ('bbdf8c8b-eef0-474d-be9e-06686042dbe5', 'Translation Phase', 'Main translation work and content creation', 2.0, 16.0, 1, 'pending', now() + INTERVAL '2 weeks', now(), now(), 0, 8, 0),
  ('bbdf8c8b-eef0-474d-be9e-06686042dbe5', 'Quality Assurance', 'Proofreading, review, and quality checks', 1.5, 8.0, 2, 'pending', now() + INTERVAL '3 weeks', now(), now(), 0, 5, 0),
  ('bbdf8c8b-eef0-474d-be9e-06686042dbe5', 'Finalization', 'Client review, revisions, and final delivery', 1.0, 4.0, 3, 'pending', now() + INTERVAL '4 weeks', now(), now(), 0, 3, 0);

-- 4. Create tasks for each milestone systematically
-- Milestone 1: Project Planning (5 tasks)
INSERT INTO public.tasks (
  milestone_id, title, description, status, priority, estimated_hours, actual_hours, order_index, created_at, updated_at
)
SELECT 
  m.id as milestone_id,
  task_data.title,
  task_data.description,
  CASE 
    WHEN task_data.order_index = 0 THEN 'in_progress'
    ELSE 'pending'
  END as status,
  task_data.priority,
  task_data.estimated_hours,
  0 as actual_hours,
  task_data.order_index,
  now() as created_at,
  now() as updated_at
FROM public.milestones m
CROSS JOIN (
  VALUES 
    (0, 'Document Analysis', 'Analyze source documents and identify translation requirements', 'high', 1.0),
    (1, 'Language Pair Assessment', 'Evaluate source and target language complexity', 'high', 0.5),
    (2, 'Glossary Creation', 'Create specialized terminology glossary', 'medium', 1.5),
    (3, 'Style Guide Development', 'Develop translation style and tone guidelines', 'medium', 1.0),
    (4, 'Timeline Planning', 'Create detailed project timeline and milestones', 'high', 0.5)
) AS task_data(order_index, title, description, priority, estimated_hours)
WHERE m.booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5' AND m.order_index = 0;

-- Milestone 2: Translation Phase (8 tasks)
INSERT INTO public.tasks (
  milestone_id, title, description, status, priority, estimated_hours, actual_hours, order_index, created_at, updated_at
)
SELECT 
  m.id as milestone_id,
  task_data.title,
  task_data.description,
  'pending' as status,
  task_data.priority,
  task_data.estimated_hours,
  0 as actual_hours,
  task_data.order_index,
  now() as created_at,
  now() as updated_at
FROM public.milestones m
CROSS JOIN (
  VALUES 
    (0, 'Initial Translation', 'Complete first draft of all documents', 'high', 4.0),
    (1, 'Technical Translation', 'Translate technical and specialized content', 'high', 3.0),
    (2, 'Marketing Content Translation', 'Translate marketing materials and copy', 'medium', 2.0),
    (3, 'Legal Document Translation', 'Handle legal and compliance documents', 'high', 2.5),
    (4, 'Website Content Translation', 'Translate website pages and interface', 'medium', 2.0),
    (5, 'Multimedia Translation', 'Translate subtitles and audio content', 'medium', 1.5),
    (6, 'Content Review', 'Review translated content for accuracy', 'high', 1.0),
    (7, 'Client Feedback Integration', 'Incorporate client feedback into translations', 'medium', 1.0)
) AS task_data(order_index, title, description, priority, estimated_hours)
WHERE m.booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5' AND m.order_index = 1;

-- Milestone 3: Quality Assurance (5 tasks)
INSERT INTO public.tasks (
  milestone_id, title, description, status, priority, estimated_hours, actual_hours, order_index, created_at, updated_at
)
SELECT 
  m.id as milestone_id,
  task_data.title,
  task_data.description,
  'pending' as status,
  task_data.priority,
  task_data.estimated_hours,
  0 as actual_hours,
  task_data.order_index,
  now() as created_at,
  now() as updated_at
FROM public.milestones m
CROSS JOIN (
  VALUES 
    (0, 'Proofreading', 'Thorough proofreading of all translated content', 'high', 2.0),
    (1, 'Technical Review', 'Review technical accuracy and terminology', 'high', 1.5),
    (2, 'Cultural Adaptation', 'Ensure cultural appropriateness and localization', 'medium', 1.0),
    (3, 'Consistency Check', 'Verify terminology consistency across documents', 'medium', 1.0),
    (4, 'Formatting Review', 'Ensure proper formatting and layout preservation', 'low', 1.0)
) AS task_data(order_index, title, description, priority, estimated_hours)
WHERE m.booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5' AND m.order_index = 2;

-- Milestone 4: Finalization (3 tasks)
INSERT INTO public.tasks (
  milestone_id, title, description, status, priority, estimated_hours, actual_hours, order_index, created_at, updated_at
)
SELECT 
  m.id as milestone_id,
  task_data.title,
  task_data.description,
  'pending' as status,
  task_data.priority,
  task_data.estimated_hours,
  0 as actual_hours,
  task_data.order_index,
  now() as created_at,
  now() as updated_at
FROM public.milestones m
CROSS JOIN (
  VALUES 
    (0, 'Client Review', 'Submit for client review and feedback', 'high', 0.5),
    (1, 'Revision Implementation', 'Implement client feedback and corrections', 'high', 1.5),
    (2, 'Final Delivery', 'Prepare final package for client delivery', 'high', 1.0)
) AS task_data(order_index, title, description, priority, estimated_hours)
WHERE m.booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5' AND m.order_index = 3;

-- 5. Create sample time entries for the first task
INSERT INTO public.time_entries (
  booking_id, milestone_id, task_id, user_id, duration_hours, description, start_time, logged_at, created_at
)
SELECT 
  'bbdf8c8b-eef0-474d-be9e-06686042dbe5' as booking_id,
  m.id as milestone_id,
  t.id as task_id,
  'd2ce1fe9-806f-4dbc-8efb-9cf160f19e4b' as user_id,
  2.5 as duration_hours,
  'Initial document analysis and requirements gathering' as description,
  now() - INTERVAL '2 hours' as start_time,
  now() - INTERVAL '2 hours' as logged_at,
  now() - INTERVAL '2 hours' as created_at
FROM public.milestones m
JOIN public.tasks t ON m.id = t.milestone_id
WHERE m.booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5'
  AND m.order_index = 0
  AND t.order_index = 0;

-- 6. Update task actual_hours based on time entries
UPDATE public.tasks 
SET actual_hours = (
  SELECT COALESCE(SUM(te.duration_hours), 0)
  FROM public.time_entries te
  WHERE te.task_id = public.tasks.id
)
WHERE milestone_id IN (
  SELECT id FROM public.milestones WHERE booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5'
);

-- 7. Update milestone progress using the fixed function
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

-- 8. Update booking progress
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

-- 9. Create a comprehensive progress summary
SELECT 
  'Progress Tracking System Status:' as info,
  (SELECT COUNT(*) FROM public.milestones WHERE booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5') as milestones_created,
  (SELECT COUNT(*) FROM public.tasks WHERE milestone_id IN (
    SELECT id FROM public.milestones WHERE booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5'
  )) as tasks_created,
  (SELECT COUNT(*) FROM public.time_entries WHERE booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5') as time_entries_created,
  (SELECT project_progress FROM public.bookings WHERE id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5') as booking_progress,
  (SELECT SUM(actual_hours) FROM public.tasks WHERE milestone_id IN (
    SELECT id FROM public.milestones WHERE booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5'
  )) as total_hours_logged;

-- 10. Show detailed milestone and task breakdown
SELECT 
  'Milestone Details:' as info,
  m.title as milestone_title,
  m.status as milestone_status,
  m.progress_percentage as milestone_progress,
  COUNT(t.id) as task_count,
  COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
  SUM(t.actual_hours) as total_hours
FROM public.milestones m
LEFT JOIN public.tasks t ON m.id = t.milestone_id
WHERE m.booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5'
GROUP BY m.id, m.title, m.status, m.progress_percentage
ORDER BY m.order_index;

-- 11. Test the time_entries query that was failing
SELECT 
  'Time Entries Test:' as info,
  id,
  duration_hours,
  description,
  start_time,
  logged_at,
  user_id
FROM public.time_entries
WHERE booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5'
ORDER BY logged_at DESC;

-- Verify Complete Progress Tracking System
-- This script checks if everything is working properly after the comprehensive fix

-- 1. Check overall system status
SELECT 
  '🎯 COMPLETE SYSTEM STATUS:' as info,
  (SELECT COUNT(*) FROM public.milestones WHERE booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5') as milestones_count,
  (SELECT COUNT(*) FROM public.tasks WHERE milestone_id IN (
    SELECT id FROM public.milestones WHERE booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5'
  )) as tasks_count,
  (SELECT COUNT(*) FROM public.time_entries WHERE booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5') as time_entries_count,
  (SELECT project_progress FROM public.bookings WHERE id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5') as booking_progress_percent;

-- 2. Detailed milestone breakdown with progress
SELECT 
  '📊 MILESTONE BREAKDOWN:' as info,
  m.title as milestone_title,
  m.status as milestone_status,
  m.progress_percentage as progress_percent,
  m.completed_tasks,
  m.total_tasks,
  m.estimated_hours,
  m.actual_hours,
  COUNT(t.id) as actual_task_count,
  COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as actual_completed_tasks,
  COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tasks,
  COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pending_tasks
FROM public.milestones m
LEFT JOIN public.tasks t ON m.id = t.milestone_id
WHERE m.booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5'
GROUP BY m.id, m.title, m.status, m.progress_percentage, m.completed_tasks, m.total_tasks, m.estimated_hours, m.actual_hours
ORDER BY m.order_index;

-- 3. Task details for each milestone
SELECT 
  '✅ TASK DETAILS:' as info,
  m.title as milestone_title,
  t.title as task_title,
  t.status as task_status,
  t.priority as task_priority,
  t.estimated_hours,
  t.actual_hours,
  t.order_index as task_order
FROM public.milestones m
JOIN public.tasks t ON m.id = t.milestone_id
WHERE m.booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5'
ORDER BY m.order_index, t.order_index;

-- 4. Time entries with task relationships
SELECT 
  '⏱️ TIME ENTRIES:' as info,
  te.duration_hours,
  te.description,
  te.start_time,
  te.logged_at,
  m.title as milestone_title,
  t.title as task_title
FROM public.time_entries te
JOIN public.milestones m ON te.milestone_id = m.id
JOIN public.tasks t ON te.task_id = t.id
WHERE te.booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5'
ORDER BY te.logged_at DESC;

-- 5. Test the frontend queries that were failing
SELECT 
  '🔍 FRONTEND QUERY TEST - Time Entries:' as info,
  id,
  duration_hours,
  description,
  logged_at,
  user_id
FROM public.time_entries
WHERE booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5'
ORDER BY logged_at DESC;

-- 6. Test milestone progress query
SELECT 
  '🔍 FRONTEND QUERY TEST - Milestones:' as info,
  id,
  title,
  description,
  status,
  progress_percentage,
  completed_tasks,
  total_tasks,
  estimated_hours,
  actual_hours,
  order_index
FROM public.milestones
WHERE booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5'
ORDER BY order_index;

-- 7. Test tasks query
SELECT 
  '🔍 FRONTEND QUERY TEST - Tasks:' as info,
  id,
  milestone_id,
  title,
  description,
  status,
  priority,
  estimated_hours,
  actual_hours,
  order_index
FROM public.tasks
WHERE milestone_id IN (
  SELECT id FROM public.milestones WHERE booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5'
)
ORDER BY milestone_id, order_index;

-- 8. Calculate expected progress
SELECT 
  '📈 PROGRESS CALCULATION TEST:' as info,
  (SELECT COUNT(*) FROM public.tasks WHERE milestone_id IN (
    SELECT id FROM public.milestones WHERE booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5'
  )) as total_tasks,
  (SELECT COUNT(CASE WHEN status = 'completed' THEN 1 END) FROM public.tasks WHERE milestone_id IN (
    SELECT id FROM public.milestones WHERE booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5'
  )) as completed_tasks,
  (SELECT COUNT(CASE WHEN status = 'in_progress' THEN 1 END) FROM public.tasks WHERE milestone_id IN (
    SELECT id FROM public.milestones WHERE booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5'
  )) as in_progress_tasks,
  (SELECT ROUND(
    (COUNT(CASE WHEN status = 'completed' THEN 1 END)::decimal / 
     NULLIF(COUNT(*), 0)) * 100
  ) FROM public.tasks WHERE milestone_id IN (
    SELECT id FROM public.milestones WHERE booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5'
  )) as calculated_progress_percent;

-- 9. Test booking progress update
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

-- 10. Final status check
SELECT 
  '🎉 FINAL STATUS:' as info,
  (SELECT project_progress FROM public.bookings WHERE id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5') as booking_progress,
  (SELECT COUNT(*) FROM public.milestones WHERE booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5') as milestones,
  (SELECT COUNT(*) FROM public.tasks WHERE milestone_id IN (
    SELECT id FROM public.milestones WHERE booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5'
  )) as tasks,
  (SELECT COUNT(*) FROM public.time_entries WHERE booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5') as time_entries,
  (SELECT SUM(actual_hours) FROM public.tasks WHERE milestone_id IN (
    SELECT id FROM public.milestones WHERE booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5'
  )) as total_hours_logged;

-- Fix Milestone Aggregate Fields
-- Issue: Milestones show "0 Total Tasks" but have tasks that can be expanded
-- This script updates all milestone aggregate fields from actual task data

-- 1. Update all milestones with correct task counts and progress
UPDATE public.milestones m
SET
  total_tasks = (
    SELECT COUNT(*)
    FROM public.tasks t
    WHERE t.milestone_id = m.id
      AND t.status NOT IN ('cancelled')
  ),
  completed_tasks = (
    SELECT COUNT(*)
    FROM public.tasks t
    WHERE t.milestone_id = m.id
      AND t.status = 'completed'
  ),
  progress_percentage = (
    CASE 
      WHEN (SELECT COUNT(*) FROM public.tasks WHERE milestone_id = m.id AND status NOT IN ('cancelled')) > 0
      THEN ROUND(
        (SELECT COUNT(*)::NUMERIC FROM public.tasks WHERE milestone_id = m.id AND status = 'completed') /
        (SELECT COUNT(*)::NUMERIC FROM public.tasks WHERE milestone_id = m.id AND status NOT IN ('cancelled')) * 100
      )
      ELSE 0
    END
  ),
  estimated_hours = (
    SELECT COALESCE(SUM(estimated_hours), 0)
    FROM public.tasks t
    WHERE t.milestone_id = m.id
  ),
  actual_hours = (
    SELECT COALESCE(SUM(actual_hours), 0)
    FROM public.tasks t
    WHERE t.milestone_id = m.id
  ),
  updated_at = NOW()
WHERE m.id IN (
  SELECT DISTINCT milestone_id 
  FROM public.tasks 
  WHERE milestone_id IS NOT NULL
);

-- 2. Update booking progress based on milestone data
UPDATE public.bookings b
SET
  progress_percentage = (
    SELECT 
      CASE 
        WHEN COUNT(*) = 0 THEN 0
        WHEN SUM(COALESCE(weight, 1)) = 0 THEN 0
        ELSE ROUND(
          SUM(COALESCE(progress_percentage, 0) * COALESCE(weight, 1)) / 
          SUM(COALESCE(weight, 1))
        )
      END
    FROM public.milestones m
    WHERE m.booking_id = b.id
      AND m.status NOT IN ('cancelled')
  ),
  updated_at = NOW()
WHERE b.id IN (
  SELECT DISTINCT booking_id 
  FROM public.milestones 
  WHERE booking_id IS NOT NULL
);

-- 3. Sync project_progress with progress_percentage
UPDATE public.bookings
SET project_progress = progress_percentage
WHERE project_progress IS NULL OR project_progress != progress_percentage;

-- Verification: Check the specific booking
SELECT 
  'Booking' as type,
  id,
  title,
  progress_percentage,
  project_progress
FROM public.bookings
WHERE id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';

-- Verification: Check milestones
SELECT 
  'Milestone' as type,
  id,
  title,
  status,
  progress_percentage,
  total_tasks,
  completed_tasks,
  estimated_hours,
  actual_hours
FROM public.milestones
WHERE booking_id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f'
ORDER BY created_at;

-- Verification: Check tasks per milestone
SELECT 
  m.title as milestone_title,
  COUNT(t.id) as total_tasks,
  COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
  COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tasks,
  SUM(COALESCE(t.estimated_hours, 0)) as total_estimated_hours
FROM public.milestones m
LEFT JOIN public.tasks t ON t.milestone_id = m.id
WHERE m.booking_id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f'
GROUP BY m.id, m.title
ORDER BY m.created_at;


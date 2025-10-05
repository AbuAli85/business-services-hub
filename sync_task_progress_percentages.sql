-- Sync Task Progress Percentages Based on Status
-- Issue: Tasks showing 0% even when completed

-- Update all tasks to have correct progress_percentage based on their status
UPDATE public.tasks
SET 
  progress_percentage = CASE 
    WHEN status = 'completed' THEN 100
    WHEN status = 'in_progress' THEN 50
    WHEN status = 'cancelled' THEN 0
    ELSE 0
  END,
  updated_at = NOW()
WHERE progress_percentage IS NULL 
   OR progress_percentage != CASE 
    WHEN status = 'completed' THEN 100
    WHEN status = 'in_progress' THEN 50
    ELSE 0
  END;

-- Verification: Check tasks for your booking
SELECT 
  t.id,
  t.title,
  t.status,
  t.progress_percentage,
  m.title as milestone_title
FROM public.tasks t
JOIN public.milestones m ON m.id = t.milestone_id
WHERE m.booking_id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f'
ORDER BY m.created_at, t.created_at;

-- Count tasks by status and progress
SELECT 
  t.status,
  COUNT(*) as task_count,
  AVG(t.progress_percentage) as avg_progress,
  STRING_AGG(DISTINCT t.progress_percentage::text, ', ') as progress_values
FROM public.tasks t
JOIN public.milestones m ON m.id = t.milestone_id
WHERE m.booking_id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f'
GROUP BY t.status
ORDER BY t.status;


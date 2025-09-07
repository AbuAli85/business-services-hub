-- Fix time_entries start_time constraint issue
-- This script adds the missing start_time column to time entries

-- 1. First, let's check the current time_entries table structure
SELECT 
  'Current time_entries structure:' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'time_entries'
ORDER BY ordinal_position;

-- 2. Add start_time column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'time_entries' 
    AND column_name = 'start_time'
  ) THEN
    ALTER TABLE public.time_entries 
    ADD COLUMN start_time timestamptz;
    RAISE NOTICE 'Added start_time column to time_entries table';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error adding start_time column: %', SQLERRM;
END $$;

-- 3. Update existing time_entries to have start_time = logged_at
UPDATE public.time_entries 
SET start_time = logged_at 
WHERE start_time IS NULL;

-- 4. Now make start_time NOT NULL
DO $$
BEGIN
  ALTER TABLE public.time_entries 
  ALTER COLUMN start_time SET NOT NULL;
  RAISE NOTICE 'Made start_time column NOT NULL';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error making start_time NOT NULL: %', SQLERRM;
END $$;

-- 5. Create sample time entries with proper start_time
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
  m.booking_id,
  m.id as milestone_id,
  t.id as task_id,
  b.client_id as user_id,
  2.5 as duration_hours,
  'Initial project setup and planning work' as description,
  now() - INTERVAL '2 hours' as start_time,
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

-- 6. Update progress for all milestones
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

-- 7. Update booking progress
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

-- 8. Show final results
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

-- 9. Test the time_entries query that was failing
SELECT 
  id,
  duration_hours,
  description,
  start_time,
  logged_at,
  user_id
FROM public.time_entries
WHERE booking_id IN (
  SELECT id FROM public.bookings ORDER BY created_at DESC LIMIT 1
)
ORDER BY logged_at DESC;

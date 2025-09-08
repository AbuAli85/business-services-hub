-- Fix milestone status constraint to match frontend types
-- The frontend uses 'not_started' but database expects 'pending'

-- First, let's see the current constraint
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'milestones_status_check';

-- Update the constraint to include 'not_started' as an alias for 'pending'
ALTER TABLE public.milestones 
DROP CONSTRAINT IF EXISTS milestones_status_check;

ALTER TABLE public.milestones 
ADD CONSTRAINT milestones_status_check 
CHECK (status IN ('pending', 'not_started', 'in_progress', 'completed', 'cancelled', 'on_hold'));

-- Also update tasks table constraint if it exists
ALTER TABLE public.tasks 
DROP CONSTRAINT IF EXISTS tasks_status_check;

ALTER TABLE public.tasks 
ADD CONSTRAINT tasks_status_check 
CHECK (status IN ('pending', 'not_started', 'in_progress', 'completed', 'cancelled', 'on_hold'));

-- Update any existing 'not_started' values to 'pending' for consistency
UPDATE public.milestones 
SET status = 'pending' 
WHERE status = 'not_started';

UPDATE public.tasks 
SET status = 'pending' 
WHERE status = 'not_started';

-- Verify the constraint
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'milestones_status_check';

-- Show current milestone statuses
SELECT 
    id,
    title,
    status,
    created_at
FROM public.milestones 
WHERE booking_id = 'cdd1a685-561c-4f95-a2e2-c3a1deb0b3c7'
ORDER BY created_at ASC;

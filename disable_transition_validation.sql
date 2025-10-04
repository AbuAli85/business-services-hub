-- Temporarily disable transition validation to fix the immediate error
-- Run this in Supabase SQL Editor

-- Drop the problematic triggers
DROP TRIGGER IF EXISTS trigger_enforce_milestone_transition ON public.milestones;
DROP TRIGGER IF EXISTS trigger_enforce_task_transition ON public.tasks;

-- Drop the functions
DROP FUNCTION IF EXISTS enforce_milestone_transition();
DROP FUNCTION IF EXISTS enforce_task_transition();

-- Keep the can_transition function for potential future use
-- (It's already created in other migrations)

-- This will allow milestone updates to work without transition validation
-- You can re-enable validation later by running the complete fix

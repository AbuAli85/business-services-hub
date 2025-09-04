-- Fix milestones table - add missing columns
-- Run this in Supabase Dashboard > SQL Editor

-- Add missing columns to existing milestones table
ALTER TABLE public.milestones 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

ALTER TABLE public.milestones 
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';

ALTER TABLE public.milestones 
ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0;

ALTER TABLE public.milestones 
ADD COLUMN IF NOT EXISTS weight DECIMAL(5,2) DEFAULT 1.0;

ALTER TABLE public.milestones 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE public.milestones 
ADD COLUMN IF NOT EXISTS created_by UUID;

ALTER TABLE public.milestones 
ADD COLUMN IF NOT EXISTS is_overdue BOOLEAN DEFAULT FALSE;

ALTER TABLE public.milestones 
ADD COLUMN IF NOT EXISTS overdue_since TIMESTAMPTZ;

-- Add constraints (drop existing ones first)
DO $$
BEGIN
    -- Drop existing constraints if they exist
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'milestones_status_check' AND table_name = 'milestones') THEN
        ALTER TABLE public.milestones DROP CONSTRAINT milestones_status_check;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'milestones_priority_check' AND table_name = 'milestones') THEN
        ALTER TABLE public.milestones DROP CONSTRAINT milestones_priority_check;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'milestones_progress_check' AND table_name = 'milestones') THEN
        ALTER TABLE public.milestones DROP CONSTRAINT milestones_progress_check;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'milestones_weight_check' AND table_name = 'milestones') THEN
        ALTER TABLE public.milestones DROP CONSTRAINT milestones_weight_check;
    END IF;
END $$;

-- Add constraints
ALTER TABLE public.milestones 
ADD CONSTRAINT milestones_status_check 
CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold'));

ALTER TABLE public.milestones 
ADD CONSTRAINT milestones_priority_check 
CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

ALTER TABLE public.milestones 
ADD CONSTRAINT milestones_progress_check 
CHECK (progress_percentage >= 0 AND progress_percentage <= 100);

ALTER TABLE public.milestones 
ADD CONSTRAINT milestones_weight_check 
CHECK (weight > 0);

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_milestones_status ON public.milestones(status);
CREATE INDEX IF NOT EXISTS idx_milestones_priority ON public.milestones(priority);
CREATE INDEX IF NOT EXISTS idx_milestones_progress ON public.milestones(progress_percentage);
CREATE INDEX IF NOT EXISTS idx_milestones_overdue ON public.milestones(is_overdue) WHERE is_overdue = TRUE;

-- Update existing records to have proper default values
UPDATE public.milestones 
SET 
    status = COALESCE(status, 'pending'),
    priority = COALESCE(priority, 'medium'),
    progress_percentage = COALESCE(progress_percentage, 0),
    weight = COALESCE(weight, 1.0),
    is_overdue = COALESCE(is_overdue, FALSE)
WHERE status IS NULL OR priority IS NULL OR progress_percentage IS NULL OR weight IS NULL OR is_overdue IS NULL;

SELECT 'Milestones table fixed successfully!' as status;

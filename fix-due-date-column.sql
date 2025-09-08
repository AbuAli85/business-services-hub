-- Fix due_date column issue in milestones and tasks tables
-- This migration ensures the due_date column exists in both tables

-- Add due_date column to milestones table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'milestones' 
        AND column_name = 'due_date'
    ) THEN
        ALTER TABLE public.milestones ADD COLUMN due_date TIMESTAMPTZ;
        RAISE NOTICE 'Added due_date column to milestones table';
    ELSE
        RAISE NOTICE 'due_date column already exists in milestones table';
    END IF;
END $$;

-- Add due_date column to tasks table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'due_date'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN due_date TIMESTAMPTZ;
        RAISE NOTICE 'Added due_date column to tasks table';
    ELSE
        RAISE NOTICE 'due_date column already exists in tasks table';
    END IF;
END $$;

-- Add other missing columns to milestones table
DO $$
BEGIN
    -- Add weight column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'milestones' 
        AND column_name = 'weight'
    ) THEN
        ALTER TABLE public.milestones ADD COLUMN weight DECIMAL(5,2) DEFAULT 1.0;
        RAISE NOTICE 'Added weight column to milestones table';
    END IF;
    
    -- Add order_index column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'milestones' 
        AND column_name = 'order_index'
    ) THEN
        ALTER TABLE public.milestones ADD COLUMN order_index INTEGER DEFAULT 0;
        RAISE NOTICE 'Added order_index column to milestones table';
    END IF;
    
    -- Add editable column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'milestones' 
        AND column_name = 'editable'
    ) THEN
        ALTER TABLE public.milestones ADD COLUMN editable BOOLEAN DEFAULT TRUE;
        RAISE NOTICE 'Added editable column to milestones table';
    END IF;
    
    -- Add estimated_hours column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'milestones' 
        AND column_name = 'estimated_hours'
    ) THEN
        ALTER TABLE public.milestones ADD COLUMN estimated_hours NUMERIC(10,2) DEFAULT 0;
        RAISE NOTICE 'Added estimated_hours column to milestones table';
    END IF;
    
    -- Add actual_hours column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'milestones' 
        AND column_name = 'actual_hours'
    ) THEN
        ALTER TABLE public.milestones ADD COLUMN actual_hours NUMERIC(10,2) DEFAULT 0;
        RAISE NOTICE 'Added actual_hours column to milestones table';
    END IF;
    
    -- Add completed_tasks column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'milestones' 
        AND column_name = 'completed_tasks'
    ) THEN
        ALTER TABLE public.milestones ADD COLUMN completed_tasks INTEGER DEFAULT 0;
        RAISE NOTICE 'Added completed_tasks column to milestones table';
    END IF;
    
    -- Add total_tasks column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'milestones' 
        AND column_name = 'total_tasks'
    ) THEN
        ALTER TABLE public.milestones ADD COLUMN total_tasks INTEGER DEFAULT 0;
        RAISE NOTICE 'Added total_tasks column to milestones table';
    END IF;
END $$;

-- Add missing columns to tasks table
DO $$
BEGIN
    -- Add editable column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'editable'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN editable BOOLEAN DEFAULT TRUE;
        RAISE NOTICE 'Added editable column to tasks table';
    END IF;
    
    -- Add order_index column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'order_index'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN order_index INTEGER DEFAULT 0;
        RAISE NOTICE 'Added order_index column to tasks table';
    END IF;
    
    -- Add estimated_hours column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'estimated_hours'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN estimated_hours DECIMAL(5,2);
        RAISE NOTICE 'Added estimated_hours column to tasks table';
    END IF;
    
    -- Add actual_hours column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'actual_hours'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN actual_hours DECIMAL(5,2);
        RAISE NOTICE 'Added actual_hours column to tasks table';
    END IF;
    
    -- Add assigned_to column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'assigned_to'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN assigned_to UUID;
        RAISE NOTICE 'Added assigned_to column to tasks table';
    END IF;
    
    -- Add created_by column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'created_by'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN created_by UUID;
        RAISE NOTICE 'Added created_by column to tasks table';
    END IF;
    
    -- Add is_overdue column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'is_overdue'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN is_overdue BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_overdue column to tasks table';
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_milestones_due_date ON public.milestones(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_milestones_order_index ON public.milestones(order_index);
CREATE INDEX IF NOT EXISTS idx_tasks_order_index ON public.tasks(order_index);

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Database schema fix completed successfully! All required columns have been added.';
END $$;

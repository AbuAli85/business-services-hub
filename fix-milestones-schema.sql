-- Fix milestones table schema to ensure due_date column exists
-- This migration ensures the milestones table has the correct structure

-- First, check if milestones table exists and create it if it doesn't
CREATE TABLE IF NOT EXISTS public.milestones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    weight DECIMAL(5,2) DEFAULT 1.0 CHECK (weight > 0),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    is_overdue BOOLEAN DEFAULT FALSE,
    overdue_since TIMESTAMPTZ,
    order_index INTEGER DEFAULT 0,
    estimated_hours NUMERIC(10,2) DEFAULT 0,
    actual_hours NUMERIC(10,2) DEFAULT 0,
    completed_tasks INTEGER DEFAULT 0,
    total_tasks INTEGER DEFAULT 0,
    editable BOOLEAN DEFAULT TRUE
);

-- Add due_date column if it doesn't exist
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
    END IF;
END $$;

-- Add other missing columns if they don't exist
DO $$
BEGIN
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
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_milestones_booking_id ON public.milestones(booking_id);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON public.milestones(status);
CREATE INDEX IF NOT EXISTS idx_milestones_due_date ON public.milestones(due_date);
CREATE INDEX IF NOT EXISTS idx_milestones_order_index ON public.milestones(order_index);

-- Enable RLS
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (drop existing ones first)
DROP POLICY IF EXISTS "Users can view milestones for their bookings" ON public.milestones;
DROP POLICY IF EXISTS "Users can create milestones for their bookings" ON public.milestones;
DROP POLICY IF EXISTS "Users can update milestones for their bookings" ON public.milestones;
DROP POLICY IF EXISTS "Users can delete milestones for their bookings" ON public.milestones;

CREATE POLICY "Users can view milestones for their bookings" ON public.milestones
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.bookings 
            WHERE bookings.id = milestones.booking_id 
            AND (bookings.client_id = auth.uid() OR bookings.provider_id = auth.uid())
        )
    );

CREATE POLICY "Users can create milestones for their bookings" ON public.milestones
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.bookings 
            WHERE bookings.id = milestones.booking_id 
            AND (bookings.client_id = auth.uid() OR bookings.provider_id = auth.uid())
        )
    );

CREATE POLICY "Users can update milestones for their bookings" ON public.milestones
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.bookings 
            WHERE bookings.id = milestones.booking_id 
            AND (bookings.client_id = auth.uid() OR bookings.provider_id = auth.uid())
        )
    );

CREATE POLICY "Users can delete milestones for their bookings" ON public.milestones
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.bookings 
            WHERE bookings.id = milestones.booking_id 
            AND (bookings.client_id = auth.uid() OR bookings.provider_id = auth.uid())
        )
    );

-- Also ensure tasks table has the correct structure
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    milestone_id UUID NOT NULL REFERENCES public.milestones(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    due_date TIMESTAMPTZ,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2),
    assigned_to UUID,
    order_index INTEGER DEFAULT 0,
    is_overdue BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    editable BOOLEAN DEFAULT TRUE
);

-- Add missing columns to tasks table if they don't exist
DO $$
BEGIN
    -- Add due_date column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'due_date'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN due_date TIMESTAMPTZ;
        RAISE NOTICE 'Added due_date column to tasks table';
    END IF;
    
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
END $$;

-- Create indexes for tasks table
CREATE INDEX IF NOT EXISTS idx_tasks_milestone_id ON public.tasks(milestone_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);

-- Enable RLS for tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tasks
DROP POLICY IF EXISTS "Users can view tasks for their milestones" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks for their milestones" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks for their milestones" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete tasks for their milestones" ON public.tasks;

CREATE POLICY "Users can view tasks for their milestones" ON public.tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.milestones 
            JOIN public.bookings ON bookings.id = milestones.booking_id
            WHERE milestones.id = tasks.milestone_id 
            AND (bookings.client_id = auth.uid() OR bookings.provider_id = auth.uid())
        )
    );

CREATE POLICY "Users can create tasks for their milestones" ON public.tasks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.milestones 
            JOIN public.bookings ON bookings.id = milestones.booking_id
            WHERE milestones.id = tasks.milestone_id 
            AND (bookings.client_id = auth.uid() OR bookings.provider_id = auth.uid())
        )
    );

CREATE POLICY "Users can update tasks for their milestones" ON public.tasks
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.milestones 
            JOIN public.bookings ON bookings.id = milestones.booking_id
            WHERE milestones.id = tasks.milestone_id 
            AND (bookings.client_id = auth.uid() OR bookings.provider_id = auth.uid())
        )
    );

CREATE POLICY "Users can delete tasks for their milestones" ON public.tasks
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.milestones 
            JOIN public.bookings ON bookings.id = milestones.booking_id
            WHERE milestones.id = tasks.milestone_id 
            AND (bookings.client_id = auth.uid() OR bookings.provider_id = auth.uid())
        )
    );

-- Grant necessary permissions
GRANT ALL ON public.milestones TO authenticated;
GRANT ALL ON public.tasks TO authenticated;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_milestones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_milestones_updated_at ON public.milestones;
CREATE TRIGGER update_milestones_updated_at
    BEFORE UPDATE ON public.milestones
    FOR EACH ROW
    EXECUTE FUNCTION update_milestones_updated_at();

-- Create function to update tasks updated_at timestamp
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tasks updated_at
DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_tasks_updated_at();

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Milestones and tasks tables schema fixed successfully!';
END $$;

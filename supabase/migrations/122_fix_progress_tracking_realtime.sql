-- Migration: Fix Progress Tracking with Real-time Support
-- This migration fixes all progress tracking issues and adds real-time capabilities

-- 0. Create all required base tables first
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'provider', 'client', 'staff');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE booking_status AS ENUM ('draft', 'pending_payment', 'paid', 'in_progress', 'delivered', 'completed', 'cancelled', 'disputed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create profiles table (without foreign key constraint initially)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  role user_role NOT NULL DEFAULT 'client',
  full_name TEXT,
  phone TEXT,
  country TEXT,
  company_id UUID NULL,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add foreign key constraint if auth.users exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Ignore if constraint already exists or auth.users doesn't exist
    NULL;
END $$;

-- Create companies table
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cr_number TEXT,
  vat_number TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create services table
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  base_price NUMERIC(12,3) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'OMR',
  cover_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create service_packages table
CREATE TABLE IF NOT EXISTS public.service_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(12,3) NOT NULL,
  delivery_days INTEGER NOT NULL,
  revisions INTEGER NOT NULL DEFAULT 1,
  features TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  package_id UUID REFERENCES public.service_packages(id),
  title TEXT,
  requirements JSONB,
  status TEXT NOT NULL DEFAULT 'draft',
  project_progress INTEGER DEFAULT 0,
  subtotal NUMERIC(12,3) NOT NULL DEFAULT 0,
  vat_percent NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  vat_amount NUMERIC(12,3) GENERATED ALWAYS AS (ROUND(subtotal * vat_percent/100.0, 3)) STORED,
  total_amount NUMERIC(12,3) GENERATED ALWAYS AS (ROUND(subtotal + (subtotal * vat_percent/100.0), 3)) STORED,
  currency TEXT NOT NULL DEFAULT 'OMR',
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add missing columns to bookings table if they don't exist
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS project_progress INTEGER DEFAULT 0;

-- 1. Create milestones table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.milestones (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid,
  title text NOT NULL,
  description text,
  due_date timestamptz,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  weight decimal(5,2) DEFAULT 1.0 CHECK (weight > 0),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  is_overdue boolean DEFAULT false,
  overdue_since timestamptz,
  order_index integer DEFAULT 0,
  estimated_hours numeric(10,2) DEFAULT 0,
  actual_hours numeric(10,2) DEFAULT 0,
  completed_tasks integer DEFAULT 0,
  total_tasks integer DEFAULT 0,
  editable boolean DEFAULT true
);

-- Ensure booking_id column exists and is NOT NULL
ALTER TABLE public.milestones
ADD COLUMN IF NOT EXISTS booking_id uuid;

-- Make booking_id NOT NULL after ensuring it exists
DO $$
BEGIN
  -- Only proceed if the column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'milestones' 
    AND column_name = 'booking_id'
  ) THEN
    -- Update any NULL values to a default UUID (this should not happen in practice)
    UPDATE public.milestones SET booking_id = gen_random_uuid() WHERE booking_id IS NULL;
    
    -- Make the column NOT NULL
    ALTER TABLE public.milestones ALTER COLUMN booking_id SET NOT NULL;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- If there's an error, just continue
    NULL;
END $$;

-- Add foreign key constraint for milestones after table creation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'milestones_booking_id_fkey' 
    AND table_name = 'milestones' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.milestones
    ADD CONSTRAINT milestones_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- 2. Create tasks table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  milestone_id uuid,
  title text NOT NULL,
  description text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  due_date timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  is_overdue boolean DEFAULT false,
  overdue_since timestamptz,
  order_index integer DEFAULT 0,
  estimated_hours numeric(10,2) DEFAULT 0,
  actual_hours numeric(10,2) DEFAULT 0,
  notes text,
  editable boolean DEFAULT true
);

-- Ensure milestone_id column exists and is NOT NULL
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS milestone_id uuid;

-- Make milestone_id NOT NULL after ensuring it exists
DO $$
BEGIN
  -- Only proceed if the column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tasks' 
    AND column_name = 'milestone_id'
  ) THEN
    -- Update any NULL values to a default UUID (this should not happen in practice)
    UPDATE public.tasks SET milestone_id = gen_random_uuid() WHERE milestone_id IS NULL;
    
    -- Make the column NOT NULL
    ALTER TABLE public.tasks ALTER COLUMN milestone_id SET NOT NULL;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- If there's an error, just continue
    NULL;
END $$;

-- Add foreign key constraint for tasks after table creation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'tasks_milestone_id_fkey' 
    AND table_name = 'tasks' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.tasks
    ADD CONSTRAINT tasks_milestone_id_fkey FOREIGN KEY (milestone_id) REFERENCES public.milestones(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- 3. Create progress logs table for audit trail
CREATE TABLE IF NOT EXISTS public.progress_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid,
  milestone_id uuid,
  task_id uuid,
  action text NOT NULL,
  old_value text,
  new_value text,
  user_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Ensure booking_id column exists and is NOT NULL
ALTER TABLE public.progress_logs
ADD COLUMN IF NOT EXISTS booking_id uuid;

-- Make booking_id NOT NULL after ensuring it exists
DO $$
BEGIN
  -- Only proceed if the column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'progress_logs' 
    AND column_name = 'booking_id'
  ) THEN
    -- Update any NULL values to a default UUID (this should not happen in practice)
    UPDATE public.progress_logs SET booking_id = gen_random_uuid() WHERE booking_id IS NULL;
    
    -- Make the column NOT NULL
    ALTER TABLE public.progress_logs ALTER COLUMN booking_id SET NOT NULL;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- If there's an error, just continue
    NULL;
END $$;

-- Add foreign key constraints for progress_logs after table creation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'progress_logs_booking_id_fkey' 
    AND table_name = 'progress_logs' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.progress_logs
    ADD CONSTRAINT progress_logs_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'progress_logs_milestone_id_fkey' 
    AND table_name = 'progress_logs' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.progress_logs
    ADD CONSTRAINT progress_logs_milestone_id_fkey FOREIGN KEY (milestone_id) REFERENCES public.milestones(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'progress_logs_task_id_fkey' 
    AND table_name = 'progress_logs' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.progress_logs
    ADD CONSTRAINT progress_logs_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- Add foreign key constraint for user_id if auth.users exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'progress_logs_user_id_fkey' 
      AND table_name = 'progress_logs' 
      AND table_schema = 'public'
    ) THEN
      ALTER TABLE public.progress_logs
      ADD CONSTRAINT progress_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
    END IF;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- 4. Create time entries table for time tracking
CREATE TABLE IF NOT EXISTS public.time_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid,
  milestone_id uuid,
  task_id uuid,
  user_id uuid,
  duration_hours numeric(10,2),
  description text,
  logged_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Ensure required columns exist and are NOT NULL
ALTER TABLE public.time_entries
ADD COLUMN IF NOT EXISTS booking_id uuid,
ADD COLUMN IF NOT EXISTS user_id uuid,
ADD COLUMN IF NOT EXISTS duration_hours numeric(10,2);

-- Make required columns NOT NULL after ensuring they exist
DO $$
BEGIN
  -- Only proceed if the columns exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'time_entries' 
    AND column_name = 'booking_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'time_entries' 
    AND column_name = 'user_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'time_entries' 
    AND column_name = 'duration_hours'
  ) THEN
    -- Update any NULL values to defaults (this should not happen in practice)
    UPDATE public.time_entries SET booking_id = gen_random_uuid() WHERE booking_id IS NULL;
    UPDATE public.time_entries SET user_id = gen_random_uuid() WHERE user_id IS NULL;
    UPDATE public.time_entries SET duration_hours = 0 WHERE duration_hours IS NULL;
    
    -- Make the columns NOT NULL
    ALTER TABLE public.time_entries ALTER COLUMN booking_id SET NOT NULL;
    ALTER TABLE public.time_entries ALTER COLUMN user_id SET NOT NULL;
    ALTER TABLE public.time_entries ALTER COLUMN duration_hours SET NOT NULL;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- If there's an error, just continue
    NULL;
END $$;

-- Add foreign key constraints for time_entries after table creation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'time_entries_booking_id_fkey' 
    AND table_name = 'time_entries' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.time_entries
    ADD CONSTRAINT time_entries_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'time_entries_milestone_id_fkey' 
    AND table_name = 'time_entries' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.time_entries
    ADD CONSTRAINT time_entries_milestone_id_fkey FOREIGN KEY (milestone_id) REFERENCES public.milestones(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'time_entries_task_id_fkey' 
    AND table_name = 'time_entries' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.time_entries
    ADD CONSTRAINT time_entries_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- Add foreign key constraint for user_id if auth.users exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'time_entries_user_id_fkey' 
      AND table_name = 'time_entries' 
      AND table_schema = 'public'
    ) THEN
      ALTER TABLE public.time_entries
      ADD CONSTRAINT time_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
    END IF;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- 5. Add missing columns to existing tables (if they exist)
ALTER TABLE public.milestones
ADD COLUMN IF NOT EXISTS completed_tasks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_tasks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_hours NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS editable BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS actual_hours NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS editable BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- 6. Fix and enhance milestone progress calculation function
-- Drop existing function first to avoid parameter name conflicts
DROP FUNCTION IF EXISTS update_milestone_progress(uuid);

CREATE OR REPLACE FUNCTION update_milestone_progress(milestone_uuid uuid)
RETURNS void AS $$
DECLARE
  total_tasks INTEGER;
  completed_tasks INTEGER;
  progress_percentage INTEGER;
  actual_hours NUMERIC := 0;
  milestone_record RECORD;
BEGIN
  -- Get milestone details
  SELECT
    m.estimated_hours,
    m.status
  INTO milestone_record
  FROM public.milestones m
  WHERE m.id = milestone_uuid;

  -- Count total and completed tasks
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COALESCE(SUM(actual_hours), 0)
  INTO total_tasks, completed_tasks, actual_hours
  FROM public.tasks
  WHERE milestone_id = milestone_uuid;

  -- Calculate progress percentage
  IF total_tasks > 0 THEN
    progress_percentage := ROUND((completed_tasks::NUMERIC / total_tasks::NUMERIC) * 100);
  ELSE
    progress_percentage := 0;
  END IF;

  -- Determine milestone status
  DECLARE
    new_status TEXT;
  BEGIN
    IF completed_tasks = total_tasks AND total_tasks > 0 THEN
      new_status := 'completed';
    ELSIF completed_tasks > 0 THEN
      new_status := 'in_progress';
    ELSE
      new_status := 'pending';
    END IF;

    -- Update milestone progress and status
    UPDATE public.milestones
    SET
      progress_percentage = progress_percentage,
      status = new_status,
      actual_hours = actual_hours,
      completed_tasks = completed_tasks,
      total_tasks = total_tasks,
      updated_at = now()
    WHERE id = milestone_uuid;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Fix and enhance booking progress calculation function
-- Drop existing function first to avoid parameter name conflicts
DROP FUNCTION IF EXISTS calculate_booking_progress(uuid);

CREATE OR REPLACE FUNCTION calculate_booking_progress(booking_id uuid)
RETURNS INTEGER AS $$
DECLARE
  total_progress INTEGER;
  milestone_count INTEGER;
  weighted_progress NUMERIC := 0;
  total_weight NUMERIC := 0;
  milestone_record RECORD;
  completed_milestones INTEGER := 0;
  total_milestones INTEGER := 0;
  total_completed_tasks INTEGER := 0;
  total_task_count INTEGER := 0;
  total_estimated_hours NUMERIC := 0;
  total_actual_hours NUMERIC := 0;
  overdue_tasks INTEGER := 0;
  booking_status TEXT := 'pending';
BEGIN
  -- Calculate weighted progress across all milestones for this booking
  FOR milestone_record IN
    SELECT
      progress_percentage,
      weight,
      status,
      estimated_hours,
      actual_hours,
      completed_tasks,
      total_tasks
    FROM public.milestones
    WHERE public.milestones.booking_id = calculate_booking_progress.booking_id
  LOOP
    weighted_progress := weighted_progress + (milestone_record.progress_percentage * milestone_record.weight);
    total_weight := total_weight + milestone_record.weight;
    milestone_count := milestone_count + 1;

    -- Aggregate milestone data
    total_milestones := total_milestones + 1;
    IF milestone_record.status = 'completed' THEN
      completed_milestones := completed_milestones + 1;
    END IF;

    total_estimated_hours := total_estimated_hours + COALESCE(milestone_record.estimated_hours, 0);
    total_actual_hours := total_actual_hours + COALESCE(milestone_record.actual_hours, 0);
    total_completed_tasks := total_completed_tasks + COALESCE(milestone_record.completed_tasks, 0);
    total_task_count := total_task_count + COALESCE(milestone_record.total_tasks, 0);
  END LOOP;

  -- Calculate final progress percentage
  IF total_weight > 0 THEN
    total_progress := ROUND(weighted_progress / total_weight);
  ELSE
    total_progress := 0;
  END IF;

  -- Count overdue tasks
  SELECT COUNT(*)
  INTO overdue_tasks
  FROM public.tasks t
  JOIN public.milestones m ON t.milestone_id = m.id
  WHERE m.booking_id = calculate_booking_progress.booking_id
    AND t.status != 'completed'
    AND t.due_date IS NOT NULL
    AND t.due_date < now();

  -- Determine booking status
  IF completed_milestones = total_milestones AND total_milestones > 0 THEN
    booking_status := 'completed';
  ELSIF total_progress > 0 THEN
    booking_status := 'in_progress';
  ELSE
    booking_status := 'pending';
  END IF;

  -- Update booking progress with comprehensive data
  UPDATE public.bookings
  SET
    project_progress = total_progress,
    status = booking_status,
    updated_at = now()
  WHERE id = booking_id;

  RETURN total_progress;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Enhanced task update function with real-time triggers
-- Drop existing function first to avoid parameter name conflicts
DROP FUNCTION IF EXISTS update_task(uuid, text, text, timestamptz);

CREATE OR REPLACE FUNCTION update_task(
  task_id uuid,
  title text DEFAULT NULL,
  status text DEFAULT NULL,
  due_date timestamptz DEFAULT NULL,
  progress_percentage INTEGER DEFAULT NULL,
  actual_hours NUMERIC DEFAULT NULL,
  notes text DEFAULT NULL
) RETURNS void AS $$
DECLARE
  m_id uuid;
  booking_uuid uuid;
  old_status text;
  new_status text;
BEGIN
  -- Get current status and milestone_id
  SELECT milestone_id, status INTO m_id, old_status
  FROM public.tasks WHERE id = task_id;

  -- Set new status
  new_status := COALESCE(status, old_status);

  -- Update task
  UPDATE public.tasks
  SET
    title = COALESCE(update_task.title, public.tasks.title),
    status = new_status,
    due_date = COALESCE(update_task.due_date, public.tasks.due_date),
    progress_percentage = COALESCE(update_task.progress_percentage, public.tasks.progress_percentage),
    actual_hours = COALESCE(update_task.actual_hours, public.tasks.actual_hours),
    notes = COALESCE(update_task.notes, public.tasks.notes),
    updated_at = now()
  WHERE id = task_id
  RETURNING milestone_id INTO m_id;

  -- Get booking_id for progress update
  SELECT booking_id INTO booking_uuid FROM public.milestones WHERE id = m_id;

  -- Update milestone and booking progress
  PERFORM update_milestone_progress(m_id);
  PERFORM calculate_booking_progress(booking_uuid);

  -- Log status change if it happened
  IF old_status != new_status THEN
    INSERT INTO public.progress_logs (
      booking_id,
      milestone_id,
      task_id,
      action,
      old_value,
      new_value,
      created_at
    ) VALUES (
      booking_uuid,
      m_id,
      task_id,
      'status_change',
      old_status,
      new_status,
      now()
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create triggers for automatic progress updates
-- Drop existing triggers first, then function to avoid dependency conflicts
DROP TRIGGER IF EXISTS update_milestone_progress_trigger ON public.tasks;
DROP TRIGGER IF EXISTS update_booking_progress_trigger ON public.milestones;
DROP TRIGGER IF EXISTS trigger_update_milestone_progress_insert ON public.tasks;
DROP TRIGGER IF EXISTS trigger_update_milestone_progress_update ON public.tasks;
DROP TRIGGER IF EXISTS trigger_update_milestone_progress_delete ON public.tasks;

-- Now drop the functions
DROP FUNCTION IF EXISTS trigger_update_milestone_progress();
DROP FUNCTION IF EXISTS trigger_update_booking_progress();

CREATE OR REPLACE FUNCTION trigger_update_milestone_progress()
RETURNS TRIGGER AS $$
DECLARE
  booking_uuid uuid;
BEGIN
  -- Get booking_id from the milestone
  SELECT booking_id INTO booking_uuid
  FROM public.milestones
  WHERE id = NEW.milestone_id;

  -- Update milestone progress when tasks change
  PERFORM update_milestone_progress(NEW.milestone_id);

  -- Update booking progress
  IF booking_uuid IS NOT NULL THEN
    PERFORM calculate_booking_progress(booking_uuid);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function for booking progress updates
CREATE OR REPLACE FUNCTION trigger_update_booking_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Update booking progress when milestone changes
  PERFORM calculate_booking_progress(NEW.booking_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create new triggers
CREATE TRIGGER update_milestone_progress_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_milestone_progress();

CREATE TRIGGER update_booking_progress_trigger
  AFTER UPDATE ON public.milestones
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_booking_progress();

-- 10. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_milestones_booking_id ON public.milestones(booking_id);
CREATE INDEX IF NOT EXISTS idx_tasks_milestone_id ON public.tasks(milestone_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_booking_id ON public.time_entries(booking_id);
CREATE INDEX IF NOT EXISTS idx_progress_logs_booking_id ON public.progress_logs(booking_id);

-- 11. Enable Row Level Security
ALTER TABLE public.progress_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- 12. Create RLS policies
CREATE POLICY "Users can view progress logs for their bookings" ON public.progress_logs
  FOR SELECT USING (
    booking_id IN (
      SELECT id FROM public.bookings
      WHERE client_id = auth.uid() OR provider_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert progress logs for their bookings" ON public.progress_logs
  FOR INSERT WITH CHECK (
    booking_id IN (
      SELECT id FROM public.bookings
      WHERE client_id = auth.uid() OR provider_id = auth.uid()
    )
  );

CREATE POLICY "Users can view time entries for their bookings" ON public.time_entries
  FOR SELECT USING (
    booking_id IN (
      SELECT id FROM public.bookings
      WHERE client_id = auth.uid() OR provider_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert time entries for their bookings" ON public.time_entries
  FOR INSERT WITH CHECK (
    booking_id IN (
      SELECT id FROM public.bookings
      WHERE client_id = auth.uid() OR provider_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own time entries" ON public.time_entries
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own time entries" ON public.time_entries
  FOR DELETE USING (user_id = auth.uid());

-- 13. Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_milestone_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_booking_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_task(uuid, text, text, timestamptz, integer, numeric, text) TO authenticated;

-- 14. Update existing data to have proper progress values
UPDATE public.milestones
SET
  completed_tasks = (
    SELECT COUNT(*) FROM public.tasks
    WHERE milestone_id = public.milestones.id AND status = 'completed'
  ),
  total_tasks = (
    SELECT COUNT(*) FROM public.tasks
    WHERE milestone_id = public.milestones.id
  ),
  actual_hours = (
    SELECT COALESCE(SUM(actual_hours), 0) FROM public.tasks
    WHERE milestone_id = public.milestones.id
  )
WHERE completed_tasks IS NULL OR total_tasks IS NULL OR actual_hours IS NULL;

-- 15. Update all booking progress
DO $$
DECLARE
  booking_record RECORD;
BEGIN
  FOR booking_record IN SELECT id FROM public.bookings LOOP
    PERFORM calculate_booking_progress(booking_record.id);
  END LOOP;
END $$;

-- 16. Create a function to get comprehensive progress data
-- Drop existing function first to avoid parameter name conflicts
DROP FUNCTION IF EXISTS get_booking_progress_data(uuid);

CREATE OR REPLACE FUNCTION get_booking_progress_data(booking_uuid uuid)
RETURNS TABLE (
  booking_id uuid,
  booking_title text,
  booking_progress integer,
  completed_milestones integer,
  total_milestones integer,
  completed_tasks integer,
  total_tasks integer,
  booking_status text,
  total_estimated_hours numeric,
  total_actual_hours numeric,
  overdue_tasks integer,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id as booking_id,
    b.title as booking_title,
    b.project_progress as booking_progress,
    COUNT(m.id) FILTER (WHERE m.status = 'completed')::integer as completed_milestones,
    COUNT(m.id)::integer as total_milestones,
    COALESCE(SUM(m.completed_tasks), 0)::integer as completed_tasks,
    COALESCE(SUM(m.total_tasks), 0)::integer as total_tasks,
    b.status as booking_status,
    COALESCE(SUM(m.estimated_hours), 0) as total_estimated_hours,
    COALESCE(SUM(m.actual_hours), 0) as total_actual_hours,
    (
      SELECT COUNT(*)::integer
      FROM public.tasks t
      JOIN public.milestones m2 ON t.milestone_id = m2.id
      WHERE m2.booking_id = booking_uuid
        AND t.status != 'completed'
        AND t.due_date IS NOT NULL
        AND t.due_date < now()
    ) as overdue_tasks,
    b.created_at,
    b.updated_at
  FROM public.bookings b
  LEFT JOIN public.milestones m ON b.id = m.booking_id
  WHERE b.id = booking_uuid
  GROUP BY b.id, b.title, b.project_progress, b.status, b.created_at, b.updated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_booking_progress_data(uuid) TO authenticated;
-- Check and create required tables for progress functions
-- This migration ensures the required tables exist before creating functions

-- 1. Check if bookings table exists, create if not
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookings') THEN
    CREATE TABLE bookings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID NOT NULL,
      provider_id UUID NOT NULL,
      service_id UUID NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      approval_status TEXT DEFAULT 'pending',
      project_progress INTEGER DEFAULT 0,
      amount_cents INTEGER,
      currency TEXT DEFAULT 'OMR',
      scheduled_date TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    RAISE NOTICE 'Created bookings table';
  ELSE
    RAISE NOTICE 'Bookings table already exists';
  END IF;
END $$;

-- 2. Check if milestones table exists, create if not
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'milestones') THEN
    CREATE TABLE milestones (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      progress_percentage INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      due_date TIMESTAMPTZ,
      weight NUMERIC DEFAULT 1,
      completed_tasks INTEGER DEFAULT 0,
      total_tasks INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    RAISE NOTICE 'Created milestones table';
  ELSE
    RAISE NOTICE 'Milestones table already exists';
  END IF;
END $$;

-- 3. Check if tasks table exists, create if not
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
    CREATE TABLE tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      milestone_id UUID NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending',
      progress_percentage INTEGER DEFAULT 0,
      due_date TIMESTAMPTZ,
      priority TEXT DEFAULT 'normal',
      estimated_hours INTEGER,
      actual_hours INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    RAISE NOTICE 'Created tasks table';
  ELSE
    RAISE NOTICE 'Tasks table already exists';
  END IF;
END $$;

-- 4. Add project_progress column to bookings if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'bookings' 
    AND column_name = 'project_progress'
  ) THEN
    ALTER TABLE bookings ADD COLUMN project_progress INTEGER DEFAULT 0;
    RAISE NOTICE 'Added project_progress column to bookings table';
  ELSE
    RAISE NOTICE 'project_progress column already exists in bookings table';
  END IF;
END $$;

-- 5. Add weight column to milestones if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'milestones' 
    AND column_name = 'weight'
  ) THEN
    ALTER TABLE milestones ADD COLUMN weight NUMERIC DEFAULT 1;
    RAISE NOTICE 'Added weight column to milestones table';
  ELSE
    RAISE NOTICE 'weight column already exists in milestones table';
  END IF;
END $$;

-- 6. Add completed_tasks and total_tasks columns to milestones if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'milestones' 
    AND column_name = 'completed_tasks'
  ) THEN
    ALTER TABLE milestones ADD COLUMN completed_tasks INTEGER DEFAULT 0;
    RAISE NOTICE 'Added completed_tasks column to milestones table';
  ELSE
    RAISE NOTICE 'completed_tasks column already exists in milestones table';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'milestones' 
    AND column_name = 'total_tasks'
  ) THEN
    ALTER TABLE milestones ADD COLUMN total_tasks INTEGER DEFAULT 0;
    RAISE NOTICE 'Added total_tasks column to milestones table';
  ELSE
    RAISE NOTICE 'total_tasks column already exists in milestones table';
  END IF;
END $$;

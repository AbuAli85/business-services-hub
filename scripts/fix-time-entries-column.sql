-- Fix missing logged_at column in time_entries table
-- This fixes the "column time_entries.logged_at does not exist" error

-- Check if logged_at column exists, if not add it
DO $$
BEGIN
  -- Check if the column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'time_entries' 
    AND column_name = 'logged_at'
  ) THEN
    -- Add the missing column
    ALTER TABLE public.time_entries 
    ADD COLUMN logged_at timestamptz DEFAULT now();
    
    -- Update existing rows to have logged_at = created_at
    UPDATE public.time_entries 
    SET logged_at = created_at 
    WHERE logged_at IS NULL;
    
    RAISE NOTICE 'Added logged_at column to time_entries table';
  ELSE
    RAISE NOTICE 'logged_at column already exists in time_entries table';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error adding logged_at column: %', SQLERRM;
END $$;

-- Also ensure all other required columns exist
DO $$
BEGIN
  -- Add description column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'time_entries' 
    AND column_name = 'description'
  ) THEN
    ALTER TABLE public.time_entries 
    ADD COLUMN description text;
    RAISE NOTICE 'Added description column to time_entries table';
  END IF;
  
  -- Add milestone_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'time_entries' 
    AND column_name = 'milestone_id'
  ) THEN
    ALTER TABLE public.time_entries 
    ADD COLUMN milestone_id uuid;
    RAISE NOTICE 'Added milestone_id column to time_entries table';
  END IF;
  
  -- Add task_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'time_entries' 
    AND column_name = 'task_id'
  ) THEN
    ALTER TABLE public.time_entries 
    ADD COLUMN task_id uuid;
    RAISE NOTICE 'Added task_id column to time_entries table';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error adding columns: %', SQLERRM;
END $$;

-- Test the table structure
SELECT 
  'Time entries table structure:' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'time_entries'
ORDER BY ordinal_position;

-- Test a simple query to make sure it works
SELECT 
  'Test query successful!' as status,
  COUNT(*) as total_entries
FROM public.time_entries;

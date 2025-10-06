-- ============================================
-- FIX: Add parent_id column to existing task_comments table
-- ============================================
-- This script safely adds the parent_id column if it's missing

-- Check if parent_id column exists, if not add it
DO $$
BEGIN
  -- Check if parent_id column exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'task_comments' 
    AND column_name = 'parent_id'
  ) THEN
    -- Add parent_id column
    ALTER TABLE public.task_comments 
    ADD COLUMN parent_id UUID REFERENCES public.task_comments(id) ON DELETE CASCADE;
    
    -- Add index for better performance
    CREATE INDEX IF NOT EXISTS idx_task_comments_parent_id 
    ON public.task_comments(parent_id);
    
    RAISE NOTICE '✅ Added parent_id column to task_comments table';
  ELSE
    RAISE NOTICE '✅ parent_id column already exists';
  END IF;
END $$;

-- Verify the column was added
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'task_comments'
  AND column_name = 'parent_id';


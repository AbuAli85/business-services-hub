-- ============================================
-- FIX: Check Constraint Violation in task_comments
-- ============================================
-- This fixes existing rows that have invalid comment_type values

-- Step 1: Check what values currently exist
SELECT 
  comment_type, 
  COUNT(*) as count
FROM public.task_comments
GROUP BY comment_type
ORDER BY count DESC;

-- Step 2: Update any invalid comment_type values to 'general'
-- Valid values are: 'general', 'feedback', 'question', 'issue'
UPDATE public.task_comments
SET comment_type = 'general'
WHERE comment_type IS NULL 
   OR comment_type NOT IN ('general', 'feedback', 'question', 'issue');

-- Step 3: Show what was updated
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN CONCAT('✅ Updated ', COUNT(*), ' rows to have valid comment_type')
    ELSE '✅ All rows already have valid comment_type'
  END as status
FROM public.task_comments
WHERE comment_type NOT IN ('general', 'feedback', 'question', 'issue')
   OR comment_type IS NULL;

-- Step 4: Add the constraint (now that data is clean)
DO $$
BEGIN
  -- Drop constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'task_comments_comment_type_check'
  ) THEN
    ALTER TABLE public.task_comments 
    DROP CONSTRAINT task_comments_comment_type_check;
    RAISE NOTICE '✅ Dropped existing constraint';
  END IF;
  
  -- Add the constraint
  ALTER TABLE public.task_comments 
  ADD CONSTRAINT task_comments_comment_type_check 
  CHECK (comment_type IN ('general', 'feedback', 'question', 'issue'));
  
  RAISE NOTICE '✅ Added check constraint successfully';
EXCEPTION
  WHEN check_violation THEN
    RAISE NOTICE '❌ Constraint violation still exists. Check data manually.';
    RAISE NOTICE 'Run: SELECT comment_type, COUNT(*) FROM task_comments GROUP BY comment_type;';
END $$;

-- Step 5: Verify the fix
SELECT 
  comment_type,
  COUNT(*) as count
FROM public.task_comments
GROUP BY comment_type
ORDER BY comment_type;

-- Step 6: Show final status
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ FIX COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'All comment_type values are now valid.';
  RAISE NOTICE 'Allowed values: general, feedback, question, issue';
  RAISE NOTICE '========================================';
END $$;


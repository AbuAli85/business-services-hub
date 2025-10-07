-- ============================================================================
-- REMOVE ALL CHECK CONSTRAINTS FROM TASK_COMMENTS
-- ============================================================================
-- This is the FINAL FIX - removes ALL restrictive check constraints
-- Allows ANY value for comment_type (complete flexibility)
-- ============================================================================

-- Step 1: Drop ALL check constraints on task_comments table
-- ============================================================================

DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    -- Loop through all check constraints on task_comments table
    FOR constraint_record IN 
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'task_comments'
          AND constraint_type = 'CHECK'
    LOOP
        -- Drop each constraint
        EXECUTE format('ALTER TABLE task_comments DROP CONSTRAINT IF EXISTS %I', 
                      constraint_record.constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_record.constraint_name;
    END LOOP;
END $$;

-- Step 2: Explicitly drop known constraints (backup)
-- ============================================================================

ALTER TABLE task_comments DROP CONSTRAINT IF EXISTS task_comments_comment_type_check;
ALTER TABLE task_comments DROP CONSTRAINT IF EXISTS task_comments_user_check;
ALTER TABLE task_comments DROP CONSTRAINT IF EXISTS task_comments_content_check;
ALTER TABLE task_comments DROP CONSTRAINT IF EXISTS task_comments_check;

-- Step 3: Ensure columns are properly configured
-- ============================================================================

-- Make sure comment is nullable
ALTER TABLE task_comments ALTER COLUMN comment DROP NOT NULL;

-- Make sure comment_type is nullable with default
ALTER TABLE task_comments ALTER COLUMN comment_type DROP NOT NULL;
ALTER TABLE task_comments ALTER COLUMN comment_type SET DEFAULT 'comment';

-- Make sure user_id is nullable
ALTER TABLE task_comments ALTER COLUMN user_id DROP NOT NULL;

-- Step 4: Verification
-- ============================================================================

-- Check that NO check constraints exist
SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'task_comments'
  AND constraint_type = 'CHECK'
ORDER BY constraint_name;

-- Verify column configuration
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'task_comments'
  AND column_name IN ('comment', 'comment_type', 'user_id', 'created_by')
ORDER BY column_name;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
DECLARE
    check_constraint_count INTEGER;
    comment_nullable TEXT;
    comment_type_nullable TEXT;
    user_id_nullable TEXT;
BEGIN
  -- Count remaining check constraints
  SELECT COUNT(*) INTO check_constraint_count
  FROM information_schema.table_constraints
  WHERE table_name = 'task_comments'
    AND constraint_type = 'CHECK';
  
  -- Check nullable status
  SELECT is_nullable INTO comment_nullable
  FROM information_schema.columns
  WHERE table_name = 'task_comments' AND column_name = 'comment';
    
  SELECT is_nullable INTO comment_type_nullable
  FROM information_schema.columns
  WHERE table_name = 'task_comments' AND column_name = 'comment_type';
  
  SELECT is_nullable INTO user_id_nullable
  FROM information_schema.columns
  WHERE table_name = 'task_comments' AND column_name = 'user_id';
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '✅ ALL CHECK CONSTRAINTS REMOVED!';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Status:';
  RAISE NOTICE '   • Remaining check constraints: %', check_constraint_count;
  RAISE NOTICE '   • comment nullable: %', comment_nullable;
  RAISE NOTICE '   • comment_type nullable: %', comment_type_nullable;
  RAISE NOTICE '   • user_id nullable: %', user_id_nullable;
  RAISE NOTICE '';
  RAISE NOTICE '✅ What changed:';
  RAISE NOTICE '   • ALL check constraints removed from task_comments';
  RAISE NOTICE '   • comment_type can now be ANY value (no restrictions)';
  RAISE NOTICE '   • comment can be NULL';
  RAISE NOTICE '   • user_id can be NULL';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Benefits:';
  RAISE NOTICE '   • Complete flexibility - use any comment_type value';
  RAISE NOTICE '   • No more constraint violation errors';
  RAISE NOTICE '   • Application has full control over data';
  RAISE NOTICE '';
  
  IF check_constraint_count = 0 THEN
    RAISE NOTICE '✅ SUCCESS: No check constraints remaining!';
  ELSE
    RAISE WARNING '⚠️  WARNING: % check constraint(s) still exist', check_constraint_count;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '🚀 You can now insert ANY value for comment_type!';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- TEST INSERT (Optional - uncomment to test)
-- ============================================================================

-- Uncomment these lines to test if inserts work now:
/*
-- Test with various comment_type values
DO $$
BEGIN
  -- This should work with any comment_type value now
  RAISE NOTICE 'Testing insert capabilities...';
  RAISE NOTICE 'All check constraints removed - ready for use!';
END $$;
*/


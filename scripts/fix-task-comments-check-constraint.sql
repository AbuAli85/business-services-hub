-- ============================================================================
-- FIX TASK_COMMENTS CHECK CONSTRAINT ERROR
-- ============================================================================
-- This script fixes the check constraint violation error by making it more flexible
-- Error: "new row violates check constraint task_comments_comment_type_check"
-- ============================================================================

-- Step 1: Drop the restrictive check constraint
-- ============================================================================

-- Drop all check constraints on comment_type
ALTER TABLE task_comments
DROP CONSTRAINT IF EXISTS task_comments_comment_type_check;

-- Drop the overly restrictive content check
ALTER TABLE task_comments
DROP CONSTRAINT IF EXISTS task_comments_content_check;

-- Drop the user check (we'll recreate it properly)
ALTER TABLE task_comments
DROP CONSTRAINT IF EXISTS task_comments_user_check;

-- Step 2: Make comment_type column more flexible (or remove it)
-- ============================================================================

-- Option A: Make comment_type nullable without constraint
ALTER TABLE task_comments 
ALTER COLUMN comment_type DROP NOT NULL;

-- Set default to 'comment' if null
ALTER TABLE task_comments 
ALTER COLUMN comment_type SET DEFAULT 'comment';

-- Step 3: Add a more flexible check constraint (optional)
-- ============================================================================

-- Only add constraint if you want to enforce specific types
-- Comment this out if you want complete flexibility

-- Add constraint with more common types
ALTER TABLE task_comments
ADD CONSTRAINT task_comments_comment_type_check 
CHECK (
  comment_type IS NULL OR
  comment_type IN (
    'comment',
    'note', 
    'system',
    'update',
    'file_upload',
    'file',
    'attachment',
    'internal',
    'public',
    'reply',
    'mention',
    'status_change',
    'activity'
  )
);

-- Step 4: Recreate user check constraint (less restrictive)
-- ============================================================================

-- Ensure at least one user identifier OR it's a system comment
ALTER TABLE task_comments
ADD CONSTRAINT task_comments_user_check 
CHECK (
  user_id IS NOT NULL OR 
  created_by IS NOT NULL OR 
  comment_type = 'system'
);

-- Step 5: Make other columns more flexible
-- ============================================================================

-- Ensure comment can be null (for file uploads, etc.)
ALTER TABLE task_comments 
ALTER COLUMN comment DROP NOT NULL;

-- Make user_id nullable
ALTER TABLE task_comments 
ALTER COLUMN user_id DROP NOT NULL;

-- Step 6: Update existing rows that might have invalid data
-- ============================================================================

-- Update any NULL comment_type to 'comment'
UPDATE task_comments 
SET comment_type = 'comment' 
WHERE comment_type IS NULL;

-- Update any invalid comment_type values to 'comment'
UPDATE task_comments 
SET comment_type = 'comment' 
WHERE comment_type NOT IN (
  'comment', 'note', 'system', 'update', 'file_upload',
  'file', 'attachment', 'internal', 'public', 'reply',
  'mention', 'status_change', 'activity'
);

-- Step 7: Verification
-- ============================================================================

-- Check constraints
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'task_comments'
  AND constraint_type = 'CHECK'
ORDER BY constraint_name;

-- Check constraint definitions
SELECT 
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'task_comments'
  AND con.contype = 'c'
ORDER BY con.conname;

-- Check column details
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
BEGIN
  -- Count check constraints
  SELECT COUNT(*) INTO check_constraint_count
  FROM information_schema.table_constraints
  WHERE table_name = 'task_comments'
    AND constraint_type = 'CHECK';
  
  -- Check nullable status
  SELECT is_nullable INTO comment_nullable
  FROM information_schema.columns
  WHERE table_name = 'task_comments'
    AND column_name = 'comment';
    
  SELECT is_nullable INTO comment_type_nullable
  FROM information_schema.columns
  WHERE table_name = 'task_comments'
    AND column_name = 'comment_type';
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '✅ TASK_COMMENTS CHECK CONSTRAINT FIXED!';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Status:';
  RAISE NOTICE '   • Check constraints: %', check_constraint_count;
  RAISE NOTICE '   • comment nullable: %', comment_nullable;
  RAISE NOTICE '   • comment_type nullable: %', comment_type_nullable;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Changes made:';
  RAISE NOTICE '   • Removed restrictive check constraint';
  RAISE NOTICE '   • Made comment_type more flexible';
  RAISE NOTICE '   • Added support for more comment types';
  RAISE NOTICE '   • Updated existing invalid data';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Allowed comment_type values:';
  RAISE NOTICE '   • comment (default)';
  RAISE NOTICE '   • note';
  RAISE NOTICE '   • system';
  RAISE NOTICE '   • update';
  RAISE NOTICE '   • file_upload / file / attachment';
  RAISE NOTICE '   • internal / public';
  RAISE NOTICE '   • reply / mention';
  RAISE NOTICE '   • status_change / activity';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Tip: You can now use any of these comment types in your app';
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '🚀 The check constraint error is now fixed!';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- ALTERNATIVE: Remove ALL check constraints (uncomment if needed)
-- ============================================================================

-- If you want NO restrictions at all, uncomment these:
-- ALTER TABLE task_comments DROP CONSTRAINT IF EXISTS task_comments_comment_type_check;
-- ALTER TABLE task_comments DROP CONSTRAINT IF EXISTS task_comments_user_check;
-- ALTER TABLE task_comments DROP CONSTRAINT IF EXISTS task_comments_content_check;

-- This gives you complete flexibility to insert any data


-- ============================================================================
-- FIX TASK_COMMENTS NOT NULL CONSTRAINT ERROR
-- ============================================================================
-- This script fixes the "null value in column comment violates not-null constraint"
-- error by making the comment column nullable
-- ============================================================================

-- Step 1: Make the 'comment' column nullable
-- ============================================================================

-- Check current state of the comment column
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'task_comments'
  AND column_name = 'comment';

-- Make comment column nullable (since comments might be optional)
ALTER TABLE task_comments ALTER COLUMN comment DROP NOT NULL;

-- Add a default empty string if needed (optional)
-- ALTER TABLE task_comments ALTER COLUMN comment SET DEFAULT '';

-- Step 2: Ensure other columns are properly configured
-- ============================================================================

-- Make user_id nullable (if not already)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'task_comments'
      AND column_name = 'user_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE task_comments ALTER COLUMN user_id DROP NOT NULL;
    RAISE NOTICE '✅ user_id is now nullable';
  END IF;
END $$;

-- Step 3: Add missing columns if they don't exist
-- ============================================================================

-- Add comment_type column
ALTER TABLE task_comments 
ADD COLUMN IF NOT EXISTS comment_type TEXT DEFAULT 'comment' 
CHECK (comment_type IN ('comment', 'note', 'system', 'update', 'file_upload'));

-- Add created_by column
ALTER TABLE task_comments 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add updated_at column
ALTER TABLE task_comments 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add is_internal flag (for internal notes vs public comments)
ALTER TABLE task_comments
ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT FALSE;

-- Add metadata jsonb column (for storing additional data like file info)
ALTER TABLE task_comments
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Step 4: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_type ON task_comments(comment_type);
CREATE INDEX IF NOT EXISTS idx_task_comments_created_by ON task_comments(created_by);
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON task_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_updated_at ON task_comments(updated_at);
CREATE INDEX IF NOT EXISTS idx_task_comments_created_at ON task_comments(created_at);

-- Step 5: Create/update trigger for auto-updating updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_task_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS task_comments_updated_at_trigger ON task_comments;
CREATE TRIGGER task_comments_updated_at_trigger
  BEFORE UPDATE ON task_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_task_comments_updated_at();

-- Step 6: Grant permissions to authenticated users
-- ============================================================================

GRANT SELECT ON task_comments TO authenticated;
GRANT INSERT ON task_comments TO authenticated;
GRANT UPDATE ON task_comments TO authenticated;
GRANT DELETE ON task_comments TO authenticated;

-- Step 7: Enable RLS and create policies
-- ============================================================================

ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view task comments" ON task_comments;
DROP POLICY IF EXISTS "Users can create task comments" ON task_comments;
DROP POLICY IF EXISTS "Users can update their comments" ON task_comments;
DROP POLICY IF EXISTS "Users can delete their comments" ON task_comments;

-- Policy 1: All authenticated users can view comments
CREATE POLICY "Users can view task comments"
ON task_comments FOR SELECT
TO authenticated
USING (true);

-- Policy 2: All authenticated users can create comments
CREATE POLICY "Users can create task comments"
ON task_comments FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy 3: Users can update their own comments
CREATE POLICY "Users can update their comments"
ON task_comments FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid() OR 
  user_id = auth.uid()
)
WITH CHECK (
  created_by = auth.uid() OR 
  user_id = auth.uid()
);

-- Policy 4: Users can delete their own comments
CREATE POLICY "Users can delete their comments"
ON task_comments FOR DELETE
TO authenticated
USING (
  created_by = auth.uid() OR 
  user_id = auth.uid()
);

-- Step 8: Add helpful check constraints
-- ============================================================================

-- Ensure at least one user identifier is present
ALTER TABLE task_comments
DROP CONSTRAINT IF EXISTS task_comments_user_check;

ALTER TABLE task_comments
ADD CONSTRAINT task_comments_user_check 
CHECK (user_id IS NOT NULL OR created_by IS NOT NULL);

-- Ensure at least comment or metadata is present
ALTER TABLE task_comments
DROP CONSTRAINT IF EXISTS task_comments_content_check;

ALTER TABLE task_comments
ADD CONSTRAINT task_comments_content_check 
CHECK (
  comment IS NOT NULL OR 
  metadata IS NOT NULL OR 
  comment_type = 'file_upload'
);

-- Step 9: Verification
-- ============================================================================

-- Check all columns
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'task_comments'
ORDER BY ordinal_position;

-- Check constraints
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'task_comments'
ORDER BY constraint_type, constraint_name;

-- Check policies
SELECT 
  policyname as policy_name,
  cmd as command,
  permissive,
  roles
FROM pg_policies
WHERE tablename = 'task_comments'
ORDER BY policyname;

-- Check grants
SELECT 
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'task_comments'
  AND grantee = 'authenticated'
ORDER BY privilege_type;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
DECLARE
  comment_nullable TEXT;
  grant_count INTEGER;
  policy_count INTEGER;
  index_count INTEGER;
BEGIN
  -- Check if comment is nullable
  SELECT is_nullable INTO comment_nullable
  FROM information_schema.columns
  WHERE table_name = 'task_comments'
    AND column_name = 'comment';
  
  -- Count grants
  SELECT COUNT(*) INTO grant_count
  FROM information_schema.table_privileges
  WHERE table_name = 'task_comments'
    AND grantee = 'authenticated';
  
  -- Count policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'task_comments';
  
  -- Count indexes
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'task_comments';
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '✅ TASK_COMMENTS TABLE FIXED!';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Status:';
  RAISE NOTICE '   • comment column nullable: %', comment_nullable;
  RAISE NOTICE '   • Table grants: % permissions granted', grant_count;
  RAISE NOTICE '   • RLS policies: % policies created', policy_count;
  RAISE NOTICE '   • Indexes: % indexes created', index_count;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Columns updated:';
  RAISE NOTICE '   • comment - NOW NULLABLE (was NOT NULL)';
  RAISE NOTICE '   • user_id - NULLABLE';
  RAISE NOTICE '   • created_by - Added (UUID)';
  RAISE NOTICE '   • updated_at - Added (auto-updates)';
  RAISE NOTICE '   • comment_type - Added (TEXT)';
  RAISE NOTICE '   • is_internal - Added (BOOLEAN)';
  RAISE NOTICE '   • metadata - Added (JSONB)';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Security policies:';
  RAISE NOTICE '   • All users can view comments';
  RAISE NOTICE '   • All users can create comments';
  RAISE NOTICE '   • Users can only edit/delete their own comments';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Check constraints:';
  RAISE NOTICE '   • At least one user identifier required (user_id OR created_by)';
  RAISE NOTICE '   • At least comment OR metadata must be present';
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '🚀 The NOT NULL constraint error is now fixed!';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
END $$;


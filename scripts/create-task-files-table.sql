-- ============================================================================
-- CREATE TASK_FILES TABLE
-- ============================================================================
-- This table stores file attachments for tasks/milestones
-- ============================================================================

-- Create task_files table if it doesn't exist
CREATE TABLE IF NOT EXISTS task_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  category TEXT DEFAULT 'documents' CHECK (category IN ('documents', 'images', 'contracts', 'deliverables', 'references', 'other')),
  description TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_files_task_id ON task_files(task_id);
CREATE INDEX IF NOT EXISTS idx_task_files_uploaded_by ON task_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_task_files_category ON task_files(category);
CREATE INDEX IF NOT EXISTS idx_task_files_created_at ON task_files(created_at);

-- Enable RLS
ALTER TABLE task_files ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view task files" ON task_files;
CREATE POLICY "Users can view task files"
ON task_files FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Users can upload task files" ON task_files;
CREATE POLICY "Users can upload task files"
ON task_files FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete their task files" ON task_files;
CREATE POLICY "Users can delete their task files"
ON task_files FOR DELETE
TO authenticated
USING (uploaded_by = auth.uid());

DROP POLICY IF EXISTS "Users can update their task files" ON task_files;
CREATE POLICY "Users can update their task files"
ON task_files FOR UPDATE
TO authenticated
USING (uploaded_by = auth.uid());

-- Create auto-update trigger for updated_at
CREATE OR REPLACE FUNCTION update_task_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS task_files_updated_at_trigger ON task_files;
CREATE TRIGGER task_files_updated_at_trigger
  BEFORE UPDATE ON task_files
  FOR EACH ROW
  EXECUTE FUNCTION update_task_files_updated_at();

-- ============================================================================
-- FIX TASK_COMMENTS TABLE
-- ============================================================================
-- Make user_id column nullable (it was NOT NULL, causing errors)
-- ============================================================================

-- Make user_id nullable if it exists and is NOT NULL
DO $$
BEGIN
  -- Check if user_id column exists and is NOT NULL
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'task_comments'
      AND column_name = 'user_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE task_comments ALTER COLUMN user_id DROP NOT NULL;
    RAISE NOTICE '✅ task_comments.user_id is now nullable';
  END IF;
END $$;

-- Add created_by as alternative to user_id (if not exists)
ALTER TABLE task_comments ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index on created_by
CREATE INDEX IF NOT EXISTS idx_task_comments_created_by ON task_comments(created_by);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check task_files table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'task_files'
ORDER BY ordinal_position;

-- Check task_comments columns
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'task_comments'
  AND column_name IN ('user_id', 'created_by');

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
DECLARE
  file_count INTEGER;
  comment_user_id_nullable TEXT;
BEGIN
  -- Check if task_files table exists
  SELECT COUNT(*) INTO file_count
  FROM information_schema.tables
  WHERE table_name = 'task_files';
  
  -- Check if user_id is nullable
  SELECT is_nullable INTO comment_user_id_nullable
  FROM information_schema.columns
  WHERE table_name = 'task_comments'
    AND column_name = 'user_id';
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '✅ TASK FILES SETUP COMPLETE!';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
  
  IF file_count > 0 THEN
    RAISE NOTICE '✅ task_files table created successfully';
    RAISE NOTICE '   - Columns: id, task_id, file_name, original_name, file_size, file_type';
    RAISE NOTICE '   - file_url, category, description, uploaded_by, timestamps';
    RAISE NOTICE '   - RLS policies: SELECT, INSERT, UPDATE, DELETE';
    RAISE NOTICE '   - Indexes created for performance';
    RAISE NOTICE '   - Auto-update trigger for updated_at';
  ELSE
    RAISE WARNING '⚠️  task_files table was not created';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ task_comments table fixed';
  RAISE NOTICE '   - user_id is now nullable: %', comment_user_id_nullable;
  RAISE NOTICE '   - created_by column added as alternative';
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '🚀 You can now upload files to tasks!';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
END $$;


-- FIX: Add ALL missing columns to task_comments table

-- 1. Add comment_type column
ALTER TABLE task_comments 
ADD COLUMN IF NOT EXISTS comment_type TEXT DEFAULT 'comment' 
CHECK (comment_type IN ('comment', 'note', 'system', 'update'));

-- 2. Add created_by column (user who created the comment)
ALTER TABLE task_comments 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Add updated_at column
ALTER TABLE task_comments 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_task_comments_type ON task_comments(comment_type);
CREATE INDEX IF NOT EXISTS idx_task_comments_created_by ON task_comments(created_by);
CREATE INDEX IF NOT EXISTS idx_task_comments_updated_at ON task_comments(updated_at);

-- 5. Create trigger to auto-update updated_at
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

-- 6. Verify all columns exist
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'task_comments' 
  AND column_name IN ('comment_type', 'created_by', 'updated_at')
ORDER BY column_name;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ All missing columns added to task_comments table!';
  RAISE NOTICE '   - comment_type (TEXT)';
  RAISE NOTICE '   - created_by (UUID, foreign key to auth.users)';
  RAISE NOTICE '   - updated_at (TIMESTAMPTZ, auto-updates)';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Indexes created for performance';
  RAISE NOTICE '⚡ Auto-update trigger added for updated_at';
END $$;


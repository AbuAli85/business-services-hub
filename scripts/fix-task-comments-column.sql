-- FIX: Add missing 'comment_type' column to task_comments table

-- Check if column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'task_comments';

-- Add the comment_type column if it doesn't exist
ALTER TABLE task_comments 
ADD COLUMN IF NOT EXISTS comment_type TEXT DEFAULT 'comment' CHECK (comment_type IN ('comment', 'note', 'system', 'update'));

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_task_comments_type ON task_comments(comment_type);

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'task_comments' 
  AND column_name = 'comment_type';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Column comment_type added to task_comments table!';
  RAISE NOTICE '📝 Allowed values: comment, note, system, update';
  RAISE NOTICE '🔄 Default value: comment';
END $$;


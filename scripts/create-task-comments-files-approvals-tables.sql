-- ============================================
-- CREATE TABLES FOR TASK COMMENTS, FILES, AND APPROVALS
-- ============================================
-- Run this script in your Supabase SQL Editor
-- This sets up all necessary tables with proper RLS policies

-- ============================================
-- 1. CREATE task_comments TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  comment_type VARCHAR(20) DEFAULT 'general' CHECK (comment_type IN ('general', 'feedback', 'question', 'issue')),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.task_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_created_by ON public.task_comments(created_by);
CREATE INDEX IF NOT EXISTS idx_task_comments_parent_id ON public.task_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_created_at ON public.task_comments(created_at DESC);

-- Add comment
COMMENT ON TABLE public.task_comments IS 'Comments and discussions on tasks';
COMMENT ON COLUMN public.task_comments.comment_type IS 'Type of comment: general, feedback, question, or issue';
COMMENT ON COLUMN public.task_comments.parent_id IS 'For threaded replies - references parent comment';

-- ============================================
-- 2. CREATE task_files TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.task_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL CHECK (file_size > 0),
  file_type VARCHAR(100) NOT NULL,
  file_url TEXT NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'documents' CHECK (category IN ('documents', 'images', 'contracts', 'deliverables', 'other')),
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_task_files_task_id ON public.task_files(task_id);
CREATE INDEX IF NOT EXISTS idx_task_files_uploaded_by ON public.task_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_task_files_created_at ON public.task_files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_files_category ON public.task_files(category);

-- Add comment
COMMENT ON TABLE public.task_files IS 'Files and attachments uploaded to tasks';
COMMENT ON COLUMN public.task_files.file_size IS 'File size in bytes';
COMMENT ON COLUMN public.task_files.category IS 'File category for organization';

-- ============================================
-- 3. CREATE task_approvals TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.task_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL CHECK (action IN ('approve', 'reject', 'request_revision')),
  feedback TEXT,
  approved_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_task_approvals_task_id ON public.task_approvals(task_id);
CREATE INDEX IF NOT EXISTS idx_task_approvals_approved_by ON public.task_approvals(approved_by);
CREATE INDEX IF NOT EXISTS idx_task_approvals_created_at ON public.task_approvals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_approvals_action ON public.task_approvals(action);

-- Add comment
COMMENT ON TABLE public.task_approvals IS 'Client approvals and feedback on completed tasks';
COMMENT ON COLUMN public.task_approvals.action IS 'Approval action: approve, reject, or request_revision';

-- ============================================
-- 4. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_approvals ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. CREATE RLS POLICIES FOR task_comments
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view comments for tasks in their bookings" ON public.task_comments;
DROP POLICY IF EXISTS "Users can insert comments for tasks in their bookings" ON public.task_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.task_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.task_comments;

-- SELECT: Users can view comments for tasks in bookings they have access to
CREATE POLICY "Users can view comments for tasks in their bookings"
  ON public.task_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.milestones m ON t.milestone_id = m.id
      JOIN public.bookings b ON m.booking_id = b.id
      WHERE t.id = task_comments.task_id
      AND (
        b.client_id = auth.uid()
        OR b.provider_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role = 'admin'
        )
      )
    )
  );

-- INSERT: Users can add comments to tasks in bookings they have access to
CREATE POLICY "Users can insert comments for tasks in their bookings"
  ON public.task_comments
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.milestones m ON t.milestone_id = m.id
      JOIN public.bookings b ON m.booking_id = b.id
      WHERE t.id = task_comments.task_id
      AND (
        b.client_id = auth.uid()
        OR b.provider_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role = 'admin'
        )
      )
    )
  );

-- UPDATE: Users can update their own comments
CREATE POLICY "Users can update their own comments"
  ON public.task_comments
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- DELETE: Users can delete their own comments
CREATE POLICY "Users can delete their own comments"
  ON public.task_comments
  FOR DELETE
  USING (created_by = auth.uid());

-- ============================================
-- 6. CREATE RLS POLICIES FOR task_files
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view files for tasks in their bookings" ON public.task_files;
DROP POLICY IF EXISTS "Users can upload files to tasks in their bookings" ON public.task_files;
DROP POLICY IF EXISTS "Users can delete their own files" ON public.task_files;

-- SELECT: Users can view files for tasks in bookings they have access to
CREATE POLICY "Users can view files for tasks in their bookings"
  ON public.task_files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.milestones m ON t.milestone_id = m.id
      JOIN public.bookings b ON m.booking_id = b.id
      WHERE t.id = task_files.task_id
      AND (
        b.client_id = auth.uid()
        OR b.provider_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role = 'admin'
        )
      )
    )
  );

-- INSERT: Users can upload files to tasks in bookings they have access to
CREATE POLICY "Users can upload files to tasks in their bookings"
  ON public.task_files
  FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.milestones m ON t.milestone_id = m.id
      JOIN public.bookings b ON m.booking_id = b.id
      WHERE t.id = task_files.task_id
      AND (
        b.client_id = auth.uid()
        OR b.provider_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role = 'admin'
        )
      )
    )
  );

-- DELETE: Users can delete their own files or admins can delete any
CREATE POLICY "Users can delete their own files"
  ON public.task_files
  FOR DELETE
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ============================================
-- 7. CREATE RLS POLICIES FOR task_approvals
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view approvals for tasks in their bookings" ON public.task_approvals;
DROP POLICY IF EXISTS "Clients can approve tasks in their bookings" ON public.task_approvals;

-- SELECT: Users can view approvals for tasks in bookings they have access to
CREATE POLICY "Users can view approvals for tasks in their bookings"
  ON public.task_approvals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.milestones m ON t.milestone_id = m.id
      JOIN public.bookings b ON m.booking_id = b.id
      WHERE t.id = task_approvals.task_id
      AND (
        b.client_id = auth.uid()
        OR b.provider_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role = 'admin'
        )
      )
    )
  );

-- INSERT: Clients can approve tasks in their bookings
CREATE POLICY "Clients can approve tasks in their bookings"
  ON public.task_approvals
  FOR INSERT
  WITH CHECK (
    approved_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.milestones m ON t.milestone_id = m.id
      JOIN public.bookings b ON m.booking_id = b.id
      WHERE t.id = task_approvals.task_id
      AND b.client_id = auth.uid()
    )
  );

-- ============================================
-- 8. CREATE STORAGE BUCKET FOR TASK FILES
-- ============================================

-- Note: Run this separately or check if bucket already exists
-- This creates the storage bucket if it doesn't exist

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-files',
  'task-files',
  true,
  10485760, -- 10MB limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/zip'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 9. CREATE STORAGE POLICIES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload task files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view task files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own task files" ON storage.objects;

-- Allow authenticated users to upload files
CREATE POLICY "Users can upload task files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'task-files'
    AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to view files
CREATE POLICY "Users can view task files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'task-files'
    AND auth.role() = 'authenticated'
  );

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own task files"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'task-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================
-- 10. CREATE TRIGGERS FOR updated_at
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for task_comments
DROP TRIGGER IF EXISTS update_task_comments_updated_at ON public.task_comments;
CREATE TRIGGER update_task_comments_updated_at
  BEFORE UPDATE ON public.task_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for task_files
DROP TRIGGER IF EXISTS update_task_files_updated_at ON public.task_files;
CREATE TRIGGER update_task_files_updated_at
  BEFORE UPDATE ON public.task_files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for task_approvals
DROP TRIGGER IF EXISTS update_task_approvals_updated_at ON public.task_approvals;
CREATE TRIGGER update_task_approvals_updated_at
  BEFORE UPDATE ON public.task_approvals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Run these to verify everything was created successfully

SELECT 'task_comments table created' as status, COUNT(*) as columns 
FROM information_schema.columns 
WHERE table_name = 'task_comments' AND table_schema = 'public';

SELECT 'task_files table created' as status, COUNT(*) as columns 
FROM information_schema.columns 
WHERE table_name = 'task_files' AND table_schema = 'public';

SELECT 'task_approvals table created' as status, COUNT(*) as columns 
FROM information_schema.columns 
WHERE table_name = 'task_approvals' AND table_schema = 'public';

SELECT 'Storage bucket created' as status, * 
FROM storage.buckets 
WHERE id = 'task-files';

-- Show all RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('task_comments', 'task_files', 'task_approvals')
ORDER BY tablename, policyname;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ All tables, indexes, RLS policies, and storage bucket created successfully!';
  RAISE NOTICE '📝 task_comments - Ready for use';
  RAISE NOTICE '📎 task_files - Ready for use';
  RAISE NOTICE '✔️ task_approvals - Ready for use';
  RAISE NOTICE '🗄️ Storage bucket "task-files" - Ready for use';
END $$;


-- ============================================
-- SAFE SETUP: Task Comments, Files, and Approvals
-- ============================================
-- This script safely creates tables and adds missing columns
-- Safe to run multiple times - won't break existing data

-- ============================================
-- 1. CREATE OR UPDATE task_comments TABLE
-- ============================================

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  comment_type VARCHAR(20) DEFAULT 'general',
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add parent_id column if it doesn't exist (for threaded replies)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'task_comments' 
    AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE public.task_comments 
    ADD COLUMN parent_id UUID REFERENCES public.task_comments(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Added parent_id column to task_comments';
  END IF;
END $$;

-- Add check constraint for comment_type if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'task_comments_comment_type_check'
  ) THEN
    ALTER TABLE public.task_comments 
    ADD CONSTRAINT task_comments_comment_type_check 
    CHECK (comment_type IN ('general', 'feedback', 'question', 'issue'));
    RAISE NOTICE '✅ Added comment_type check constraint';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE '✅ comment_type check constraint already exists';
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_created_by ON public.task_comments(created_by);
CREATE INDEX IF NOT EXISTS idx_task_comments_parent_id ON public.task_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_created_at ON public.task_comments(created_at DESC);

-- ============================================
-- 2. CREATE OR UPDATE task_files TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.task_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add description column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'task_files' 
    AND column_name = 'description'
  ) THEN
    ALTER TABLE public.task_files ADD COLUMN description TEXT;
    RAISE NOTICE '✅ Added description column to task_files';
  END IF;
END $$;

-- Add category column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'task_files' 
    AND column_name = 'category'
  ) THEN
    ALTER TABLE public.task_files 
    ADD COLUMN category VARCHAR(50) DEFAULT 'documents';
    RAISE NOTICE '✅ Added category column to task_files';
  END IF;
END $$;

-- Add check constraint for category if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'task_files_category_check'
  ) THEN
    ALTER TABLE public.task_files 
    ADD CONSTRAINT task_files_category_check 
    CHECK (category IN ('documents', 'images', 'contracts', 'deliverables', 'other'));
    RAISE NOTICE '✅ Added category check constraint';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE '✅ category check constraint already exists';
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_task_files_task_id ON public.task_files(task_id);
CREATE INDEX IF NOT EXISTS idx_task_files_uploaded_by ON public.task_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_task_files_created_at ON public.task_files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_files_category ON public.task_files(category);

-- ============================================
-- 3. CREATE task_approvals TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.task_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL,
  feedback TEXT,
  approved_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add check constraint for action if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'task_approvals_action_check'
  ) THEN
    ALTER TABLE public.task_approvals 
    ADD CONSTRAINT task_approvals_action_check 
    CHECK (action IN ('approve', 'reject', 'request_revision'));
    RAISE NOTICE '✅ Added action check constraint';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE '✅ action check constraint already exists';
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_task_approvals_task_id ON public.task_approvals(task_id);
CREATE INDEX IF NOT EXISTS idx_task_approvals_approved_by ON public.task_approvals(approved_by);
CREATE INDEX IF NOT EXISTS idx_task_approvals_created_at ON public.task_approvals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_approvals_action ON public.task_approvals(action);

-- ============================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_approvals ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. CREATE RLS POLICIES FOR task_comments
-- ============================================

-- Drop and recreate policies to ensure they're correct
DROP POLICY IF EXISTS "Users can view comments for tasks in their bookings" ON public.task_comments;
DROP POLICY IF EXISTS "Users can insert comments for tasks in their bookings" ON public.task_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.task_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.task_comments;

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
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      )
    )
  );

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
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      )
    )
  );

CREATE POLICY "Users can update their own comments"
  ON public.task_comments
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete their own comments"
  ON public.task_comments
  FOR DELETE
  USING (created_by = auth.uid());

-- ============================================
-- 6. CREATE RLS POLICIES FOR task_files
-- ============================================

DROP POLICY IF EXISTS "Users can view files for tasks in their bookings" ON public.task_files;
DROP POLICY IF EXISTS "Users can upload files to tasks in their bookings" ON public.task_files;
DROP POLICY IF EXISTS "Users can delete their own files" ON public.task_files;

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
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      )
    )
  );

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
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      )
    )
  );

CREATE POLICY "Users can delete their own files"
  ON public.task_files
  FOR DELETE
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============================================
-- 7. CREATE RLS POLICIES FOR task_approvals
-- ============================================

DROP POLICY IF EXISTS "Users can view approvals for tasks in their bookings" ON public.task_approvals;
DROP POLICY IF EXISTS "Clients can approve tasks in their bookings" ON public.task_approvals;

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
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      )
    )
  );

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
-- 8. CREATE STORAGE BUCKET (if doesn't exist)
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-files',
  'task-files',
  true,
  10485760,
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain', 'application/zip'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================
-- 9. CREATE STORAGE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can upload task files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view task files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own task files" ON storage.objects;

CREATE POLICY "Users can upload task files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'task-files' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view task files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'task-files' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own task files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'task-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- 10. CREATE TRIGGERS FOR updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_task_comments_updated_at ON public.task_comments;
CREATE TRIGGER update_task_comments_updated_at
  BEFORE UPDATE ON public.task_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_task_files_updated_at ON public.task_files;
CREATE TRIGGER update_task_files_updated_at
  BEFORE UPDATE ON public.task_files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_task_approvals_updated_at ON public.task_approvals;
CREATE TRIGGER update_task_approvals_updated_at
  BEFORE UPDATE ON public.task_approvals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
  comment_count INT;
  file_count INT;
  approval_count INT;
  bucket_exists BOOL;
BEGIN
  -- Check tables exist
  SELECT COUNT(*) INTO comment_count 
  FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'task_comments';
  
  SELECT COUNT(*) INTO file_count 
  FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'task_files';
  
  SELECT COUNT(*) INTO approval_count 
  FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'task_approvals';
  
  -- Check bucket exists
  SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'task-files') INTO bucket_exists;
  
  -- Report status
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ SETUP COMPLETE!';
  RAISE NOTICE '========================================';
  
  IF comment_count > 0 THEN
    RAISE NOTICE '✅ task_comments table ready';
  END IF;
  
  IF file_count > 0 THEN
    RAISE NOTICE '✅ task_files table ready';
  END IF;
  
  IF approval_count > 0 THEN
    RAISE NOTICE '✅ task_approvals table ready';
  END IF;
  
  IF bucket_exists THEN
    RAISE NOTICE '✅ Storage bucket ready';
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'You can now use comments and files!';
  RAISE NOTICE 'Refresh your application to test.';
  RAISE NOTICE '========================================';
END $$;


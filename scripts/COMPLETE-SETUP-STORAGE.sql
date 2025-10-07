-- ============================================================================
-- COMPLETE STORAGE SETUP - ALL-IN-ONE SCRIPT
-- ============================================================================
-- This script does EVERYTHING:
-- 1. Creates all storage buckets
-- 2. Creates all storage policies
-- 3. Fixes task_comments table
-- 4. Sets up proper permissions
--
-- Just run this ONE script and you're done!
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE STORAGE BUCKETS
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('booking-files', 'booking-files', true, 52428800, NULL),
  ('task-files', 'task-files', true, 52428800, NULL),
  ('milestone-files', 'milestone-files', true, 52428800, NULL)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;

-- ============================================================================
-- STEP 2: FIX TASK_COMMENTS TABLE
-- ============================================================================

-- Make user_id nullable (was causing NOT NULL errors)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'task_comments' AND column_name = 'user_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE task_comments ALTER COLUMN user_id DROP NOT NULL;
  END IF;
END $$;

-- Add missing columns
ALTER TABLE task_comments 
ADD COLUMN IF NOT EXISTS comment_type TEXT DEFAULT 'comment' 
CHECK (comment_type IN ('comment', 'note', 'system', 'update'));

ALTER TABLE task_comments 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE task_comments 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_task_comments_type ON task_comments(comment_type);
CREATE INDEX IF NOT EXISTS idx_task_comments_created_by ON task_comments(created_by);
CREATE INDEX IF NOT EXISTS idx_task_comments_updated_at ON task_comments(updated_at);

-- Create auto-update trigger
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

-- ============================================================================
-- STEP 2.5: CREATE TASK_FILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS task_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  category TEXT DEFAULT 'documents' CHECK (category IN ('documents', 'images', 'contracts', 'deliverables', 'references', 'other')),
  description TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for task_files
CREATE INDEX IF NOT EXISTS idx_task_files_task_id ON task_files(task_id);
CREATE INDEX IF NOT EXISTS idx_task_files_uploaded_by ON task_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_task_files_category ON task_files(category);

-- Enable RLS on task_files
ALTER TABLE task_files ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_files
DROP POLICY IF EXISTS "task_files_select" ON task_files;
CREATE POLICY "task_files_select" ON task_files FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "task_files_insert" ON task_files;
CREATE POLICY "task_files_insert" ON task_files FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "task_files_delete" ON task_files;
CREATE POLICY "task_files_delete" ON task_files FOR DELETE TO authenticated USING (uploaded_by = auth.uid());

DROP POLICY IF EXISTS "task_files_update" ON task_files;
CREATE POLICY "task_files_update" ON task_files FOR UPDATE TO authenticated USING (uploaded_by = auth.uid());

-- Auto-update trigger for task_files
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
-- STEP 3: CREATE STORAGE POLICIES (May require service_role)
-- ============================================================================

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Clean up existing policies
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage' 
      AND tablename = 'objects'
      AND (
        policyname LIKE '%booking_files%' OR
        policyname LIKE '%task_files%' OR
        policyname LIKE '%milestone_files%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.policyname);
  END LOOP;
END $$;

-- BOOKING-FILES POLICIES
CREATE POLICY "booking_files_insert" ON storage.objects 
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'booking-files');

CREATE POLICY "booking_files_select" ON storage.objects 
FOR SELECT TO public USING (bucket_id = 'booking-files');

CREATE POLICY "booking_files_delete" ON storage.objects 
FOR DELETE TO authenticated USING (bucket_id = 'booking-files');

CREATE POLICY "booking_files_update" ON storage.objects 
FOR UPDATE TO authenticated USING (bucket_id = 'booking-files');

-- TASK-FILES POLICIES
CREATE POLICY "task_files_insert" ON storage.objects 
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'task-files');

CREATE POLICY "task_files_select" ON storage.objects 
FOR SELECT TO public USING (bucket_id = 'task-files');

CREATE POLICY "task_files_delete" ON storage.objects 
FOR DELETE TO authenticated USING (bucket_id = 'task-files');

CREATE POLICY "task_files_update" ON storage.objects 
FOR UPDATE TO authenticated USING (bucket_id = 'task-files');

-- MILESTONE-FILES POLICIES
CREATE POLICY "milestone_files_insert" ON storage.objects 
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'milestone-files');

CREATE POLICY "milestone_files_select" ON storage.objects 
FOR SELECT TO public USING (bucket_id = 'milestone-files');

CREATE POLICY "milestone_files_delete" ON storage.objects 
FOR DELETE TO authenticated USING (bucket_id = 'milestone-files');

CREATE POLICY "milestone_files_update" ON storage.objects 
FOR UPDATE TO authenticated USING (bucket_id = 'milestone-files');

-- ============================================================================
-- VERIFICATION & SUCCESS MESSAGE
-- ============================================================================

DO $$
DECLARE
  bucket_count INTEGER;
  policy_count INTEGER;
BEGIN
  -- Count buckets
  SELECT COUNT(*) INTO bucket_count
  FROM storage.buckets
  WHERE id IN ('booking-files', 'task-files', 'milestone-files');
  
  -- Count policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'objects'
    AND (
      policyname LIKE '%booking_files%' OR
      policyname LIKE '%task_files%' OR
      policyname LIKE '%milestone_files%'
    );
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '✅ COMPLETE STORAGE SETUP FINISHED!';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📁 Storage Buckets Created: %', bucket_count;
  RAISE NOTICE '   - booking-files (50MB limit, public)';
  RAISE NOTICE '   - task-files (50MB limit, public)';
  RAISE NOTICE '   - milestone-files (50MB limit, public)';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Storage Policies Created: %', policy_count;
  RAISE NOTICE '   - INSERT policies (authenticated users can upload)';
  RAISE NOTICE '   - SELECT policies (public read access)';
  RAISE NOTICE '   - DELETE policies (authenticated users can delete)';
  RAISE NOTICE '   - UPDATE policies (authenticated users can update)';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Database Updates:';
  RAISE NOTICE '   - task_files table created (for task attachments)';
  RAISE NOTICE '   - task_comments.user_id made nullable (fixed NOT NULL error)';
  RAISE NOTICE '   - task_comments.comment_type column added';
  RAISE NOTICE '   - task_comments.created_by column added';
  RAISE NOTICE '   - task_comments.updated_at column added';
  RAISE NOTICE '   - Indexes created for performance';
  RAISE NOTICE '   - Auto-update triggers added';
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '🚀 ALL DONE! Refresh your browser and test file uploads!';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
  
  IF policy_count < 12 THEN
    RAISE WARNING '⚠️  WARNING: Expected 12 policies but found %. ';
    RAISE WARNING '   If you see "must be owner of table objects" error:';
    RAISE WARNING '   → Go to Supabase Dashboard → Storage → Policies';
    RAISE WARNING '   → Manually add policies via UI for each bucket';
    RAISE WARNING '   → See scripts/UI-POLICY-GUIDE.md for instructions';
  END IF;
END $$;


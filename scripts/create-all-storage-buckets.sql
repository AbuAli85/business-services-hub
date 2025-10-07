-- CREATE ALL REQUIRED STORAGE BUCKETS
-- Run this in Supabase SQL Editor

-- 1. Create booking-files bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'booking-files',
  'booking-files',
  true,
  52428800,  -- 50MB
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800;

-- 2. Create task-files bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-files',
  'task-files',
  true,
  52428800,  -- 50MB
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800;

-- 3. Create any other buckets you might need
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'milestone-files',
  'milestone-files',
  true,
  52428800,  -- 50MB
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800;

-- Verify all buckets were created
SELECT 
  id,
  name,
  public,
  file_size_limit,
  created_at
FROM storage.buckets
WHERE id IN ('booking-files', 'task-files', 'milestone-files')
ORDER BY id;

-- Success message
DO $$
DECLARE
  bucket_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO bucket_count
  FROM storage.buckets
  WHERE id IN ('booking-files', 'task-files', 'milestone-files');
  
  RAISE NOTICE '✅ Created % storage buckets!', bucket_count;
  RAISE NOTICE '📁 booking-files - For booking attachments';
  RAISE NOTICE '📁 task-files - For task/milestone attachments';
  RAISE NOTICE '📁 milestone-files - For milestone deliverables';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: Now add storage policies via Supabase Dashboard UI!';
  RAISE NOTICE '   Go to: Storage → Click each bucket → Policies → New Policy';
END $$;


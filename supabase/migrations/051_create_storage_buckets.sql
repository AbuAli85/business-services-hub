-- Create comprehensive storage buckets for the business services hub
-- This migration sets up all necessary storage buckets for different file types

-- 1. Service Images Bucket (for service cover images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'service-images',
  'service-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- 2. Avatar Images Bucket (for user profile pictures)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- 3. Message Files Bucket (for file attachments in messages)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-files',
  'message-files',
  true,
  10485760, -- 10MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) ON CONFLICT (id) DO NOTHING;

-- 4. Company Assets Bucket (already exists, but ensure it's here)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-assets',
  'company-assets',
  true,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml']
) ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for service-images bucket
DROP POLICY IF EXISTS "Users can upload service images" ON storage.objects;
CREATE POLICY "Users can upload service images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'service-images' 
    AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Anyone can view service images" ON storage.objects;
CREATE POLICY "Anyone can view service images" ON storage.objects
  FOR SELECT USING (bucket_id = 'service-images');

DROP POLICY IF EXISTS "Users can update their service images" ON storage.objects;
CREATE POLICY "Users can update their service images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'service-images' 
    AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Users can delete their service images" ON storage.objects;
CREATE POLICY "Users can delete their service images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'service-images' 
    AND auth.uid() IS NOT NULL
  );

-- Set up storage policies for avatars bucket
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
CREATE POLICY "Users can upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can update their avatars" ON storage.objects;
CREATE POLICY "Users can update their avatars" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' 
    AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Users can delete their avatars" ON storage.objects;
CREATE POLICY "Users can delete their avatars" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' 
    AND auth.uid() IS NOT NULL
  );

-- Set up storage policies for message-files bucket
DROP POLICY IF EXISTS "Users can upload message files" ON storage.objects;
CREATE POLICY "Users can upload message files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'message-files' 
    AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Users can view message files" ON storage.objects;
CREATE POLICY "Users can view message files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'message-files' 
    AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Users can update their message files" ON storage.objects;
CREATE POLICY "Users can update their message files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'message-files' 
    AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Users can delete their message files" ON storage.objects;
CREATE POLICY "Users can delete their message files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'message-files' 
    AND auth.uid() IS NOT NULL
  );

-- Ensure company-assets policies are set (in case they don't exist)
DROP POLICY IF EXISTS "Users can upload company assets" ON storage.objects;
CREATE POLICY "Users can upload company assets" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'company-assets' 
    AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Anyone can view company assets" ON storage.objects;
CREATE POLICY "Anyone can view company assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'company-assets');

DROP POLICY IF EXISTS "Users can update their company assets" ON storage.objects;
CREATE POLICY "Users can update their company assets" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'company-assets' 
    AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Users can delete their company assets" ON storage.objects;
CREATE POLICY "Users can delete their company assets" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'company-assets' 
    AND auth.uid() IS NOT NULL
  );

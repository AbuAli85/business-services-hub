-- Create company assets storage bucket
-- This migration sets up storage for company logos and other assets

-- Create the storage bucket for company assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-assets',
  'company-assets',
  true,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml']
) ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for company assets
-- Allow authenticated users to upload their own company assets
CREATE POLICY "Users can upload company assets" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'company-assets' 
    AND auth.role() = 'authenticated'
  );

-- Allow users to view company assets (public)
CREATE POLICY "Anyone can view company assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'company-assets');

-- Allow users to update their own company assets
CREATE POLICY "Users can update their company assets" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'company-assets' 
    AND auth.role() = 'authenticated'
  );

-- Allow users to delete their own company assets
CREATE POLICY "Users can delete their company assets" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'company-assets' 
    AND auth.role() = 'authenticated'
  );

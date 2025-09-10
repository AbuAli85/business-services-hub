-- Migration: Create logos storage bucket
-- Description: Set up storage bucket for company and user logos
-- Date: 2024-12-19

-- Create storage bucket for logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos',
  'logos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for logos bucket
CREATE POLICY "Public logos are viewable by everyone" ON storage.objects
FOR SELECT USING (bucket_id = 'logos');

CREATE POLICY "Users can upload their own logos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'logos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own logos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'logos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own logos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'logos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Add logo_url column to profiles table if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_logo_url ON public.profiles(logo_url);
CREATE INDEX IF NOT EXISTS idx_companies_logo_url ON public.companies(logo_url);

-- Add missing profile fields for onboarding
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

-- Add missing company fields for onboarding
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS portfolio_links TEXT,
ADD COLUMN IF NOT EXISTS services_offered TEXT;

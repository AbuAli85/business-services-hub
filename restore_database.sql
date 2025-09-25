-- Database Restoration Script
-- This script will recreate all the essential tables for your business services hub
-- Run this in the Supabase SQL Editor to restore your database

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'provider',
    profile_completed BOOLEAN DEFAULT FALSE,
    verification_status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add email column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'email'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN email TEXT;
        RAISE NOTICE 'Added email column to profiles table';
    ELSE
        RAISE NOTICE 'email column already exists in profiles table';
    END IF;
END $$;

-- Add other missing columns
DO $$
BEGIN
    -- Add company_name column
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'company_name'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN company_name TEXT;
        RAISE NOTICE 'Added company_name column to profiles table';
    END IF;
    
    -- Add cr_number column
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'cr_number'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN cr_number TEXT;
        RAISE NOTICE 'Added cr_number column to profiles table';
    END IF;
    
    -- Add vat_number column
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'vat_number'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN vat_number TEXT;
        RAISE NOTICE 'Added vat_number column to profiles table';
    END IF;
    
    -- Add portfolio_links column
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'portfolio_links'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN portfolio_links JSONB;
        RAISE NOTICE 'Added portfolio_links column to profiles table';
    END IF;
    
    -- Add services column
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'services'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN services JSONB;
        RAISE NOTICE 'Added services column to profiles table';
    END IF;
    
    -- Add phone column
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'phone'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN phone TEXT;
        RAISE NOTICE 'Added phone column to profiles table';
    END IF;
    
    -- Add address column
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'address'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN address TEXT;
        RAISE NOTICE 'Added address column to profiles table';
    END IF;
    
    -- Add city column
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'city'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN city TEXT;
        RAISE NOTICE 'Added city column to profiles table';
    END IF;
    
    -- Add state column
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'state'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN state TEXT;
        RAISE NOTICE 'Added state column to profiles table';
    END IF;
    
    -- Add country column
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'country'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN country TEXT;
        RAISE NOTICE 'Added country column to profiles table';
    END IF;
    
    -- Add postal_code column
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'postal_code'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN postal_code TEXT;
        RAISE NOTICE 'Added postal_code column to profiles table';
    END IF;
    
    -- Add website column
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'website'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN website TEXT;
        RAISE NOTICE 'Added website column to profiles table';
    END IF;
    
    -- Add bio column
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'bio'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN bio TEXT;
        RAISE NOTICE 'Added bio column to profiles table';
    END IF;
    
    -- Add avatar_url column
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
        RAISE NOTICE 'Added avatar_url column to profiles table';
    END IF;
    
    -- Add company_id column
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN company_id UUID;
        RAISE NOTICE 'Added company_id column to profiles table';
    END IF;
END $$;

-- 2. Create companies table
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    logo_url TEXT,
    description TEXT,
    website TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create services table
CREATE TABLE IF NOT EXISTS public.services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    base_price DECIMAL(10,2),
    currency TEXT DEFAULT 'USD',
    cover_image_url TEXT,
    status TEXT DEFAULT 'active',
    provider_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
    title TEXT,
    description TEXT,
    status TEXT DEFAULT 'pending',
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    total_amount DECIMAL(10,2),
    currency TEXT DEFAULT 'USD',
    requirements TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'pending',
    due_date TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    content TEXT,
    attachments TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add receiver_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'receiver_id'
    ) THEN
        ALTER TABLE public.messages ADD COLUMN receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added receiver_id column to messages table';
    ELSE
        RAISE NOTICE 'receiver_id column already exists in messages table';
    END IF;
END $$;

-- Add read_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'read_at'
    ) THEN
        ALTER TABLE public.messages ADD COLUMN read_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added read_at column to messages table';
    ELSE
        RAISE NOTICE 'read_at column already exists in messages table';
    END IF;
END $$;

-- 7. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 9. Create basic RLS policies (drop existing first)
-- Profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Services policies
DROP POLICY IF EXISTS "Anyone can view active services" ON public.services;
CREATE POLICY "Anyone can view active services" ON public.services
    FOR SELECT USING (status = 'active');

DROP POLICY IF EXISTS "Providers can manage their own services" ON public.services;
CREATE POLICY "Providers can manage their own services" ON public.services
    FOR ALL USING (auth.uid() = provider_id);

-- Bookings policies
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;
CREATE POLICY "Users can view their own bookings" ON public.bookings
    FOR SELECT USING (auth.uid() = client_id OR auth.uid() = provider_id);

DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
CREATE POLICY "Users can create bookings" ON public.bookings
    FOR INSERT WITH CHECK (auth.uid() = client_id);

-- Messages policies
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
CREATE POLICY "Users can view their own messages" ON public.messages
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages" ON public.messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Notifications policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

-- 10. Grant permissions
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.companies TO service_role;
GRANT ALL ON public.services TO service_role;
GRANT ALL ON public.bookings TO service_role;
GRANT ALL ON public.invoices TO service_role;
GRANT ALL ON public.messages TO service_role;
GRANT ALL ON public.notifications TO service_role;

GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.companies TO authenticated;
GRANT SELECT ON public.services TO authenticated;
GRANT SELECT ON public.bookings TO authenticated;
GRANT SELECT ON public.invoices TO authenticated;
GRANT SELECT ON public.messages TO authenticated;
GRANT SELECT ON public.notifications TO authenticated;

-- 11. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_services_provider_id ON public.services(provider_id);
CREATE INDEX IF NOT EXISTS idx_services_status ON public.services(status);
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON public.bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_provider_id ON public.bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

-- 12. Create functions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, role)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'provider')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 14. Create public_services view
DROP VIEW IF EXISTS public_services;
CREATE VIEW public_services AS
SELECT 
    s.id,
    s.title,
    s.description,
    s.category,
    s.base_price,
    s.currency,
    s.cover_image_url,
    s.created_at,
    s.status,
    s.provider_id,
    p.full_name as provider_name,
    c.name as company_name,
    c.logo_url as company_logo
FROM public.services s
JOIN public.profiles p ON s.provider_id = p.id
LEFT JOIN public.companies c ON p.company_id = c.id
WHERE s.status = 'active';

GRANT SELECT ON public_services TO authenticated;
GRANT SELECT ON public_services TO anon;

-- 15. Update existing profiles with email from auth.users where email is NULL
UPDATE public.profiles
SET email = auth_users.email
FROM auth.users AS auth_users
WHERE public.profiles.id = auth_users.id
AND public.profiles.email IS NULL;

-- 16. Set email column to NOT NULL
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'email'
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE public.profiles ALTER COLUMN email SET NOT NULL;
        RAISE NOTICE 'Set email column to NOT NULL in profiles table';
    ELSE
        RAISE NOTICE 'email column is already NOT NULL in profiles table';
    END IF;
END $$;

-- 17. Create unique constraint on email (drop existing first)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_email_unique;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email);

COMMIT;

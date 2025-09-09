-- Complete fix for milestone_comments and milestone_approvals tables
-- This script ensures both tables have all required columns and constraints

-- First, ensure the update_updated_at_column function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Fix milestone_comments table
DO $$ 
BEGIN
    -- Create table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'milestone_comments') THEN
        CREATE TABLE milestone_comments (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            milestone_id UUID NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
            booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            author_name TEXT NOT NULL,
            author_role TEXT NOT NULL CHECK (author_role IN ('client', 'provider', 'admin')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    ELSE
        -- Add missing columns if table exists but columns are missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'milestone_comments' AND column_name = 'author_name') THEN
            ALTER TABLE milestone_comments ADD COLUMN author_name TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'milestone_comments' AND column_name = 'author_role') THEN
            ALTER TABLE milestone_comments ADD COLUMN author_role TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'milestone_comments' AND column_name = 'booking_id') THEN
            ALTER TABLE milestone_comments ADD COLUMN booking_id UUID;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'milestone_comments' AND column_name = 'created_at') THEN
            ALTER TABLE milestone_comments ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'milestone_comments' AND column_name = 'updated_at') THEN
            ALTER TABLE milestone_comments ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
    END IF;
END $$;

-- Fix milestone_approvals table
DO $$ 
BEGIN
    -- Create table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'milestone_approvals') THEN
        CREATE TABLE milestone_approvals (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            milestone_id UUID NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
            booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
            status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
            feedback TEXT,
            approver_name TEXT NOT NULL,
            approver_role TEXT NOT NULL CHECK (approver_role IN ('client', 'provider', 'admin')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    ELSE
        -- Add missing columns if table exists but columns are missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'milestone_approvals' AND column_name = 'approver_name') THEN
            ALTER TABLE milestone_approvals ADD COLUMN approver_name TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'milestone_approvals' AND column_name = 'approver_role') THEN
            ALTER TABLE milestone_approvals ADD COLUMN approver_role TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'milestone_approvals' AND column_name = 'feedback') THEN
            ALTER TABLE milestone_approvals ADD COLUMN feedback TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'milestone_approvals' AND column_name = 'booking_id') THEN
            ALTER TABLE milestone_approvals ADD COLUMN booking_id UUID;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'milestone_approvals' AND column_name = 'created_at') THEN
            ALTER TABLE milestone_approvals ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'milestone_approvals' AND column_name = 'updated_at') THEN
            ALTER TABLE milestone_approvals ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
    END IF;
END $$;

-- Add foreign key constraints
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'milestone_comments' AND constraint_name = 'milestone_comments_booking_id_fkey') THEN
        ALTER TABLE milestone_comments ADD CONSTRAINT milestone_comments_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'milestone_approvals' AND constraint_name = 'milestone_approvals_booking_id_fkey') THEN
        ALTER TABLE milestone_approvals ADD CONSTRAINT milestone_approvals_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add check constraints
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'milestone_comments_author_role_check') THEN
        ALTER TABLE milestone_comments ADD CONSTRAINT milestone_comments_author_role_check CHECK (author_role IN ('client', 'provider', 'admin'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'milestone_approvals_status_check') THEN
        ALTER TABLE milestone_approvals ADD CONSTRAINT milestone_approvals_status_check CHECK (status IN ('pending', 'approved', 'rejected'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'milestone_approvals_approver_role_check') THEN
        ALTER TABLE milestone_approvals ADD CONSTRAINT milestone_approvals_approver_role_check CHECK (approver_role IN ('client', 'provider', 'admin'));
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_milestone_comments_milestone_id ON milestone_comments(milestone_id);
CREATE INDEX IF NOT EXISTS idx_milestone_comments_booking_id ON milestone_comments(booking_id);
CREATE INDEX IF NOT EXISTS idx_milestone_comments_created_at ON milestone_comments(created_at);

CREATE INDEX IF NOT EXISTS idx_milestone_approvals_milestone_id ON milestone_approvals(milestone_id);
CREATE INDEX IF NOT EXISTS idx_milestone_approvals_booking_id ON milestone_approvals(booking_id);
CREATE INDEX IF NOT EXISTS idx_milestone_approvals_status ON milestone_approvals(status);
CREATE INDEX IF NOT EXISTS idx_milestone_approvals_created_at ON milestone_approvals(created_at);

-- Enable Row Level Security
ALTER TABLE milestone_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_approvals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for milestone_comments
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'milestone_comments' AND policyname = 'Users can view comments for their bookings') THEN
        CREATE POLICY "Users can view comments for their bookings" ON milestone_comments
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM bookings 
              WHERE bookings.id = milestone_comments.booking_id 
              AND (bookings.client_id = auth.uid() OR bookings.provider_id = auth.uid())
            )
          );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'milestone_comments' AND policyname = 'Users can insert comments for their bookings') THEN
        CREATE POLICY "Users can insert comments for their bookings" ON milestone_comments
          FOR INSERT WITH CHECK (
            EXISTS (
              SELECT 1 FROM bookings 
              WHERE bookings.id = milestone_comments.booking_id 
              AND (bookings.client_id = auth.uid() OR bookings.provider_id = auth.uid())
            )
          );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'milestone_comments' AND policyname = 'Users can update their own comments') THEN
        CREATE POLICY "Users can update their own comments" ON milestone_comments
          FOR UPDATE USING (
            EXISTS (
              SELECT 1 FROM bookings 
              WHERE bookings.id = milestone_comments.booking_id 
              AND (bookings.client_id = auth.uid() OR bookings.provider_id = auth.uid())
            )
          );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'milestone_comments' AND policyname = 'Users can delete their own comments') THEN
        CREATE POLICY "Users can delete their own comments" ON milestone_comments
          FOR DELETE USING (
            EXISTS (
              SELECT 1 FROM bookings 
              WHERE bookings.id = milestone_comments.booking_id 
              AND (bookings.client_id = auth.uid() OR bookings.provider_id = auth.uid())
            )
          );
    END IF;
END $$;

-- Create RLS policies for milestone_approvals
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'milestone_approvals' AND policyname = 'Users can view approvals for their bookings') THEN
        CREATE POLICY "Users can view approvals for their bookings" ON milestone_approvals
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM bookings 
              WHERE bookings.id = milestone_approvals.booking_id 
              AND (bookings.client_id = auth.uid() OR bookings.provider_id = auth.uid())
            )
          );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'milestone_approvals' AND policyname = 'Users can insert approvals for their bookings') THEN
        CREATE POLICY "Users can insert approvals for their bookings" ON milestone_approvals
          FOR INSERT WITH CHECK (
            EXISTS (
              SELECT 1 FROM bookings 
              WHERE bookings.id = milestone_approvals.booking_id 
              AND (bookings.client_id = auth.uid() OR bookings.provider_id = auth.uid())
            )
          );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'milestone_approvals' AND policyname = 'Users can update their own approvals') THEN
        CREATE POLICY "Users can update their own approvals" ON milestone_approvals
          FOR UPDATE USING (
            EXISTS (
              SELECT 1 FROM bookings 
              WHERE bookings.id = milestone_approvals.booking_id 
              AND (bookings.client_id = auth.uid() OR bookings.provider_id = auth.uid())
            )
          );
    END IF;
END $$;

-- Add updated_at triggers
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_milestone_comments_updated_at') THEN
        CREATE TRIGGER update_milestone_comments_updated_at 
          BEFORE UPDATE ON milestone_comments 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_milestone_approvals_updated_at') THEN
        CREATE TRIGGER update_milestone_approvals_updated_at 
          BEFORE UPDATE ON milestone_approvals 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

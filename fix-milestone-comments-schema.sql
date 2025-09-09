-- Fix milestone_comments table schema
-- Add missing columns if they don't exist

-- Add author_name column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'milestone_comments' 
        AND column_name = 'author_name'
    ) THEN
        ALTER TABLE milestone_comments ADD COLUMN author_name TEXT;
    END IF;
END $$;

-- Add author_role column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'milestone_comments' 
        AND column_name = 'author_role'
    ) THEN
        ALTER TABLE milestone_comments ADD COLUMN author_role TEXT;
    END IF;
END $$;

-- Add booking_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'milestone_comments' 
        AND column_name = 'booking_id'
    ) THEN
        ALTER TABLE milestone_comments ADD COLUMN booking_id UUID;
    END IF;
END $$;

-- Add created_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'milestone_comments' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE milestone_comments ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Add updated_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'milestone_comments' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE milestone_comments ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Add foreign key constraint for booking_id if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'milestone_comments' 
        AND constraint_name = 'milestone_comments_booking_id_fkey'
    ) THEN
        ALTER TABLE milestone_comments 
        ADD CONSTRAINT milestone_comments_booking_id_fkey 
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add check constraint for author_role if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'milestone_comments_author_role_check'
    ) THEN
        ALTER TABLE milestone_comments 
        ADD CONSTRAINT milestone_comments_author_role_check 
        CHECK (author_role IN ('client', 'provider', 'admin'));
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_milestone_comments_milestone_id ON milestone_comments(milestone_id);
CREATE INDEX IF NOT EXISTS idx_milestone_comments_booking_id ON milestone_comments(booking_id);
CREATE INDEX IF NOT EXISTS idx_milestone_comments_created_at ON milestone_comments(created_at);

-- Enable Row Level Security if not already enabled
ALTER TABLE milestone_comments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'milestone_comments' 
        AND policyname = 'Users can view comments for their bookings'
    ) THEN
        CREATE POLICY "Users can view comments for their bookings" ON milestone_comments
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM bookings 
              WHERE bookings.id = milestone_comments.booking_id 
              AND (bookings.client_id = auth.uid() OR bookings.provider_id = auth.uid())
            )
          );
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'milestone_comments' 
        AND policyname = 'Users can insert comments for their bookings'
    ) THEN
        CREATE POLICY "Users can insert comments for their bookings" ON milestone_comments
          FOR INSERT WITH CHECK (
            EXISTS (
              SELECT 1 FROM bookings 
              WHERE bookings.id = milestone_comments.booking_id 
              AND (bookings.client_id = auth.uid() OR bookings.provider_id = auth.uid())
            )
          );
    END IF;
END $$;

-- Add updated_at trigger if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_milestone_comments_updated_at'
    ) THEN
        CREATE TRIGGER update_milestone_comments_updated_at 
          BEFORE UPDATE ON milestone_comments 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Fix milestone_approvals table schema
-- Add missing columns if they don't exist

-- Add approver_name column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'milestone_approvals' 
        AND column_name = 'approver_name'
    ) THEN
        ALTER TABLE milestone_approvals ADD COLUMN approver_name TEXT;
    END IF;
END $$;

-- Add approver_role column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'milestone_approvals' 
        AND column_name = 'approver_role'
    ) THEN
        ALTER TABLE milestone_approvals ADD COLUMN approver_role TEXT;
    END IF;
END $$;

-- Add feedback column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'milestone_approvals' 
        AND column_name = 'feedback'
    ) THEN
        ALTER TABLE milestone_approvals ADD COLUMN feedback TEXT;
    END IF;
END $$;

-- Add booking_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'milestone_approvals' 
        AND column_name = 'booking_id'
    ) THEN
        ALTER TABLE milestone_approvals ADD COLUMN booking_id UUID;
    END IF;
END $$;

-- Add created_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'milestone_approvals' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE milestone_approvals ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Add updated_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'milestone_approvals' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE milestone_approvals ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Add foreign key constraint for booking_id if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'milestone_approvals' 
        AND constraint_name = 'milestone_approvals_booking_id_fkey'
    ) THEN
        ALTER TABLE milestone_approvals 
        ADD CONSTRAINT milestone_approvals_booking_id_fkey 
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add check constraint for status if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'milestone_approvals_status_check'
    ) THEN
        ALTER TABLE milestone_approvals 
        ADD CONSTRAINT milestone_approvals_status_check 
        CHECK (status IN ('pending', 'approved', 'rejected'));
    END IF;
END $$;

-- Add check constraint for approver_role if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'milestone_approvals_approver_role_check'
    ) THEN
        ALTER TABLE milestone_approvals 
        ADD CONSTRAINT milestone_approvals_approver_role_check 
        CHECK (approver_role IN ('client', 'provider', 'admin'));
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_milestone_approvals_milestone_id ON milestone_approvals(milestone_id);
CREATE INDEX IF NOT EXISTS idx_milestone_approvals_booking_id ON milestone_approvals(booking_id);
CREATE INDEX IF NOT EXISTS idx_milestone_approvals_status ON milestone_approvals(status);
CREATE INDEX IF NOT EXISTS idx_milestone_approvals_created_at ON milestone_approvals(created_at);

-- Enable Row Level Security if not already enabled
ALTER TABLE milestone_approvals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'milestone_approvals' 
        AND policyname = 'Users can view approvals for their bookings'
    ) THEN
        CREATE POLICY "Users can view approvals for their bookings" ON milestone_approvals
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM bookings 
              WHERE bookings.id = milestone_approvals.booking_id 
              AND (bookings.client_id = auth.uid() OR bookings.provider_id = auth.uid())
            )
          );
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'milestone_approvals' 
        AND policyname = 'Users can insert approvals for their bookings'
    ) THEN
        CREATE POLICY "Users can insert approvals for their bookings" ON milestone_approvals
          FOR INSERT WITH CHECK (
            EXISTS (
              SELECT 1 FROM bookings 
              WHERE bookings.id = milestone_approvals.booking_id 
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
        WHERE tgname = 'update_milestone_approvals_updated_at'
    ) THEN
        CREATE TRIGGER update_milestone_approvals_updated_at 
          BEFORE UPDATE ON milestone_approvals 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

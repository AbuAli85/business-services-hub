-- Fix missing booking_id columns in milestone_comments and milestone_approvals tables
-- This script adds the missing columns if they don't exist

-- Add booking_id column to milestone_comments if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'milestone_comments' 
        AND column_name = 'booking_id'
    ) THEN
        ALTER TABLE milestone_comments ADD COLUMN booking_id UUID;
        
        -- Add foreign key constraint
        ALTER TABLE milestone_comments 
        ADD CONSTRAINT fk_milestone_comments_booking_id 
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;
        
        -- Create index
        CREATE INDEX IF NOT EXISTS idx_milestone_comments_booking_id ON milestone_comments(booking_id);
        
        RAISE NOTICE 'Added booking_id column to milestone_comments table';
    ELSE
        RAISE NOTICE 'booking_id column already exists in milestone_comments table';
    END IF;
END $$;

-- Add booking_id column to milestone_approvals if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'milestone_approvals' 
        AND column_name = 'booking_id'
    ) THEN
        ALTER TABLE milestone_approvals ADD COLUMN booking_id UUID;
        
        -- Add foreign key constraint
        ALTER TABLE milestone_approvals 
        ADD CONSTRAINT fk_milestone_approvals_booking_id 
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;
        
        -- Create index
        CREATE INDEX IF NOT EXISTS idx_milestone_approvals_booking_id ON milestone_approvals(booking_id);
        
        RAISE NOTICE 'Added booking_id column to milestone_approvals table';
    ELSE
        RAISE NOTICE 'booking_id column already exists in milestone_approvals table';
    END IF;
END $$;

-- Update existing records to have booking_id (if any exist)
-- This will set booking_id based on the milestone's booking_id
UPDATE milestone_comments 
SET booking_id = (
    SELECT m.booking_id 
    FROM milestones m 
    WHERE m.id = milestone_comments.milestone_id
)
WHERE booking_id IS NULL;

UPDATE milestone_approvals 
SET booking_id = (
    SELECT m.booking_id 
    FROM milestones m 
    WHERE m.id = milestone_approvals.milestone_id
)
WHERE booking_id IS NULL;

-- Make booking_id NOT NULL after populating existing records
ALTER TABLE milestone_comments ALTER COLUMN booking_id SET NOT NULL;
ALTER TABLE milestone_approvals ALTER COLUMN booking_id SET NOT NULL;

-- Update RLS policies to include booking_id checks
DROP POLICY IF EXISTS "Users can view comments for their bookings" ON milestone_comments;
DROP POLICY IF EXISTS "Users can insert comments for their bookings" ON milestone_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON milestone_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON milestone_comments;

DROP POLICY IF EXISTS "Users can view approvals for their bookings" ON milestone_approvals;
DROP POLICY IF EXISTS "Users can insert approvals for their bookings" ON milestone_approvals;
DROP POLICY IF EXISTS "Users can update their own approvals" ON milestone_approvals;

-- Recreate RLS policies for milestone_comments
CREATE POLICY "Users can view comments for their bookings" ON milestone_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = milestone_comments.booking_id 
      AND (bookings.client_id = auth.uid() OR bookings.provider_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert comments for their bookings" ON milestone_comments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = milestone_comments.booking_id 
      AND (bookings.client_id = auth.uid() OR bookings.provider_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own comments" ON milestone_comments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = milestone_comments.booking_id 
      AND (bookings.client_id = auth.uid() OR bookings.provider_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete their own comments" ON milestone_comments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = milestone_comments.booking_id 
      AND (bookings.client_id = auth.uid() OR bookings.provider_id = auth.uid())
    )
  );

-- Recreate RLS policies for milestone_approvals
CREATE POLICY "Users can view approvals for their bookings" ON milestone_approvals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = milestone_approvals.booking_id 
      AND (bookings.client_id = auth.uid() OR bookings.provider_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert approvals for their bookings" ON milestone_approvals
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = milestone_approvals.booking_id 
      AND (bookings.client_id = auth.uid() OR bookings.provider_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own approvals" ON milestone_approvals
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = milestone_approvals.booking_id 
      AND (bookings.client_id = auth.uid() OR bookings.provider_id = auth.uid())
    )
  );

-- Verify the fix
SELECT 
    'milestone_comments' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'milestone_comments' 
AND column_name = 'booking_id'

UNION ALL

SELECT 
    'milestone_approvals' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'milestone_approvals' 
AND column_name = 'booking_id';

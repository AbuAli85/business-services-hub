-- Fix Row Level Security policies for milestone_comments and milestone_approvals tables
-- This script ensures proper permissions for authenticated users

-- First, check if RLS is enabled
ALTER TABLE milestone_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_approvals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Users can view comments for their bookings" ON milestone_comments;
DROP POLICY IF EXISTS "Users can insert comments for their bookings" ON milestone_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON milestone_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON milestone_comments;

DROP POLICY IF EXISTS "Users can view approvals for their bookings" ON milestone_approvals;
DROP POLICY IF EXISTS "Users can insert approvals for their bookings" ON milestone_approvals;
DROP POLICY IF EXISTS "Users can update their own approvals" ON milestone_approvals;
DROP POLICY IF EXISTS "Users can delete their own approvals" ON milestone_approvals;

-- Create comprehensive RLS policies for milestone_comments
CREATE POLICY "Enable read access for users on their booking comments" ON milestone_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = milestone_comments.booking_id 
      AND (bookings.client_id = auth.uid() OR bookings.provider_id = auth.uid())
    )
  );

CREATE POLICY "Enable insert for users on their booking comments" ON milestone_comments
  FOR INSERT WITH CHECK (
    author_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = milestone_comments.booking_id 
      AND (bookings.client_id = auth.uid() OR bookings.provider_id = auth.uid())
    )
  );

CREATE POLICY "Enable update for users on their own comments" ON milestone_comments
  FOR UPDATE USING (
    author_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = milestone_comments.booking_id 
      AND (bookings.client_id = auth.uid() OR bookings.provider_id = auth.uid())
    )
  );

CREATE POLICY "Enable delete for users on their own comments" ON milestone_comments
  FOR DELETE USING (
    author_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = milestone_comments.booking_id 
      AND (bookings.client_id = auth.uid() OR bookings.provider_id = auth.uid())
    )
  );

-- Create comprehensive RLS policies for milestone_approvals
CREATE POLICY "Enable read access for users on their booking approvals" ON milestone_approvals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = milestone_approvals.booking_id 
      AND (bookings.client_id = auth.uid() OR bookings.provider_id = auth.uid())
    )
  );

CREATE POLICY "Enable insert for users on their booking approvals" ON milestone_approvals
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = milestone_approvals.booking_id 
      AND (bookings.client_id = auth.uid() OR bookings.provider_id = auth.uid())
    )
  );

CREATE POLICY "Enable update for users on their own approvals" ON milestone_approvals
  FOR UPDATE USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = milestone_approvals.booking_id 
      AND (bookings.client_id = auth.uid() OR bookings.provider_id = auth.uid())
    )
  );

CREATE POLICY "Enable delete for users on their own approvals" ON milestone_approvals
  FOR DELETE USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = milestone_approvals.booking_id 
      AND (bookings.client_id = auth.uid() OR bookings.provider_id = auth.uid())
    )
  );

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON milestone_comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON milestone_approvals TO authenticated;

-- Grant usage on sequences (if any)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename IN ('milestone_comments', 'milestone_approvals')
ORDER BY tablename, policyname;

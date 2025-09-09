-- Final fix for milestone_approvals RLS permissions
-- This script provides a comprehensive solution for the permission denied error

-- First, let's check if the user has the correct role
-- Create a function to check if user is client or provider of a booking
CREATE OR REPLACE FUNCTION is_user_related_to_booking(booking_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM bookings 
    WHERE id = booking_id 
    AND (client_id = auth.uid() OR provider_id = auth.uid())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable delete for users on their own approvals" ON milestone_approvals;
DROP POLICY IF EXISTS "Enable insert for users on their booking approvals" ON milestone_approvals;
DROP POLICY IF EXISTS "Enable read access for users on their booking approvals" ON milestone_approvals;
DROP POLICY IF EXISTS "Enable update for users on their own approvals" ON milestone_approvals;
DROP POLICY IF EXISTS "Users can insert milestone approvals" ON milestone_approvals;
DROP POLICY IF EXISTS "Users can read milestone approvals" ON milestone_approvals;

-- Create simplified and working RLS policies
CREATE POLICY "Users can view milestone approvals for their bookings" ON milestone_approvals
  FOR SELECT USING (
    is_user_related_to_booking(booking_id)
  );

CREATE POLICY "Users can insert milestone approvals for their bookings" ON milestone_approvals
  FOR INSERT WITH CHECK (
    is_user_related_to_booking(booking_id)
  );

CREATE POLICY "Users can update their own milestone approvals" ON milestone_approvals
  FOR UPDATE USING (
    user_id = auth.uid() AND is_user_related_to_booking(booking_id)
  );

CREATE POLICY "Users can delete their own milestone approvals" ON milestone_approvals
  FOR DELETE USING (
    user_id = auth.uid() AND is_user_related_to_booking(booking_id)
  );

-- Also fix milestone_comments RLS policies
DROP POLICY IF EXISTS "Access related comments" ON milestone_comments;
DROP POLICY IF EXISTS "Enable delete for users on their own comments" ON milestone_comments;
DROP POLICY IF EXISTS "Enable insert for users on their booking comments" ON milestone_comments;
DROP POLICY IF EXISTS "Enable read access for users on their booking comments" ON milestone_comments;
DROP POLICY IF EXISTS "Enable update for users on their own comments" ON milestone_comments;
DROP POLICY IF EXISTS "Users can create comments for their milestones" ON milestone_comments;
DROP POLICY IF EXISTS "Users can view comments for their milestones" ON milestone_comments;
DROP POLICY IF EXISTS "Users delete own comments" ON milestone_comments;
DROP POLICY IF EXISTS "Users insert comments" ON milestone_comments;
DROP POLICY IF EXISTS "Users read comments" ON milestone_comments;
DROP POLICY IF EXISTS "Users update own comments" ON milestone_comments;

-- Create simplified milestone_comments policies
CREATE POLICY "Users can view milestone comments for their bookings" ON milestone_comments
  FOR SELECT USING (
    is_user_related_to_booking(booking_id)
  );

CREATE POLICY "Users can insert milestone comments for their bookings" ON milestone_comments
  FOR INSERT WITH CHECK (
    is_user_related_to_booking(booking_id)
  );

CREATE POLICY "Users can update their own milestone comments" ON milestone_comments
  FOR UPDATE USING (
    author_id = auth.uid() AND is_user_related_to_booking(booking_id)
  );

CREATE POLICY "Users can delete their own milestone comments" ON milestone_comments
  FOR DELETE USING (
    author_id = auth.uid() AND is_user_related_to_booking(booking_id)
  );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON milestone_approvals TO authenticated;
GRANT ALL ON milestone_comments TO authenticated;
GRANT ALL ON milestones TO authenticated;
GRANT ALL ON bookings TO authenticated;
GRANT ALL ON profiles TO authenticated;

-- Ensure the function is accessible
GRANT EXECUTE ON FUNCTION is_user_related_to_booking(UUID) TO authenticated;

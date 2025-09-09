-- Simple fix for milestone_approvals RLS permissions
-- This is a more straightforward approach without custom functions

-- Drop all existing policies
DROP POLICY IF EXISTS "Enable delete for users on their own approvals" ON milestone_approvals;
DROP POLICY IF EXISTS "Enable insert for users on their booking approvals" ON milestone_approvals;
DROP POLICY IF EXISTS "Enable read access for users on their booking approvals" ON milestone_approvals;
DROP POLICY IF EXISTS "Enable update for users on their own approvals" ON milestone_approvals;
DROP POLICY IF EXISTS "Users can insert milestone approvals" ON milestone_approvals;
DROP POLICY IF EXISTS "Users can read milestone approvals" ON milestone_approvals;

-- Create very simple policies that should work
CREATE POLICY "Allow all operations for authenticated users" ON milestone_approvals
  FOR ALL USING (auth.role() = 'authenticated');

-- Also fix milestone_comments
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

CREATE POLICY "Allow all operations for authenticated users" ON milestone_comments
  FOR ALL USING (auth.role() = 'authenticated');

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON milestone_approvals TO authenticated;
GRANT ALL ON milestone_comments TO authenticated;
GRANT ALL ON milestones TO authenticated;
GRANT ALL ON bookings TO authenticated;
GRANT ALL ON profiles TO authenticated;

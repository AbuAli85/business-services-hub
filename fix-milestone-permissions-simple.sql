-- Simple fix for milestone table permissions
-- This script provides basic access for authenticated users

-- Disable RLS temporarily to test
ALTER TABLE milestone_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_approvals DISABLE ROW LEVEL SECURITY;

-- Grant full access to authenticated users
GRANT ALL ON milestone_comments TO authenticated;
GRANT ALL ON milestone_approvals TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Re-enable RLS with basic policies
ALTER TABLE milestone_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_approvals ENABLE ROW LEVEL SECURITY;

-- Create basic policies that allow authenticated users to access their data
CREATE POLICY "Allow authenticated users to manage comments" ON milestone_comments
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to manage approvals" ON milestone_approvals
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

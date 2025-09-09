-- Final fix for milestone_comments and milestone_approvals tables
-- This script addresses the author_id constraint and permission issues

-- First, ensure the update_updated_at_column function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing tables if they exist to start fresh
DROP TABLE IF EXISTS milestone_comments CASCADE;
DROP TABLE IF EXISTS milestone_approvals CASCADE;

-- Create milestone_comments table with correct schema
CREATE TABLE milestone_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    milestone_id UUID NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    author_name TEXT NOT NULL,
    author_role TEXT NOT NULL CHECK (author_role IN ('client', 'provider', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create milestone_approvals table with correct schema
CREATE TABLE milestone_approvals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    milestone_id UUID NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    feedback TEXT,
    approver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    approver_name TEXT NOT NULL,
    approver_role TEXT NOT NULL CHECK (approver_role IN ('client', 'provider', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_milestone_comments_milestone_id ON milestone_comments(milestone_id);
CREATE INDEX idx_milestone_comments_booking_id ON milestone_comments(booking_id);
CREATE INDEX idx_milestone_comments_author_id ON milestone_comments(author_id);
CREATE INDEX idx_milestone_comments_created_at ON milestone_comments(created_at);

CREATE INDEX idx_milestone_approvals_milestone_id ON milestone_approvals(milestone_id);
CREATE INDEX idx_milestone_approvals_booking_id ON milestone_approvals(booking_id);
CREATE INDEX idx_milestone_approvals_approver_id ON milestone_approvals(approver_id);
CREATE INDEX idx_milestone_approvals_status ON milestone_approvals(status);
CREATE INDEX idx_milestone_approvals_created_at ON milestone_approvals(created_at);

-- Enable Row Level Security
ALTER TABLE milestone_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_approvals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for milestone_comments
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
    author_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = milestone_comments.booking_id 
      AND (bookings.client_id = auth.uid() OR bookings.provider_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own comments" ON milestone_comments
  FOR UPDATE USING (
    author_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = milestone_comments.booking_id 
      AND (bookings.client_id = auth.uid() OR bookings.provider_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete their own comments" ON milestone_comments
  FOR DELETE USING (
    author_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = milestone_comments.booking_id 
      AND (bookings.client_id = auth.uid() OR bookings.provider_id = auth.uid())
    )
  );

-- Create RLS policies for milestone_approvals
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
    approver_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = milestone_approvals.booking_id 
      AND (bookings.client_id = auth.uid() OR bookings.provider_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own approvals" ON milestone_approvals
  FOR UPDATE USING (
    approver_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = milestone_approvals.booking_id 
      AND (bookings.client_id = auth.uid() OR bookings.provider_id = auth.uid())
    )
  );

-- Add updated_at triggers
CREATE TRIGGER update_milestone_comments_updated_at 
  BEFORE UPDATE ON milestone_comments 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_milestone_approvals_updated_at 
  BEFORE UPDATE ON milestone_approvals 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

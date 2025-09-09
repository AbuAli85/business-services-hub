-- Document Management System for Milestones and Tasks
-- This script creates tables for managing document uploads, requests, and tracking

-- 1. Document Categories Table
CREATE TABLE IF NOT EXISTS document_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Document Requests Table (Provider requests documents from client)
CREATE TABLE IF NOT EXISTS document_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES milestones(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_from UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES document_categories(id),
  is_required BOOLEAN DEFAULT true,
  due_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'uploaded', 'approved', 'rejected', 'overdue')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Documents Table (Actual uploaded files)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES milestones(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  request_id UUID REFERENCES document_requests(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  description TEXT,
  version INTEGER DEFAULT 1,
  is_latest BOOLEAN DEFAULT true,
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'approved', 'rejected', 'revision_requested')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Document Comments Table (Comments on documents)
CREATE TABLE IF NOT EXISTS document_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL,
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Document Templates Table (Predefined document templates)
CREATE TABLE IF NOT EXISTS document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES document_categories(id),
  template_content TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_document_requests_booking_id ON document_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_document_requests_milestone_id ON document_requests(milestone_id);
CREATE INDEX IF NOT EXISTS idx_document_requests_task_id ON document_requests(task_id);
CREATE INDEX IF NOT EXISTS idx_document_requests_requested_by ON document_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_document_requests_requested_from ON document_requests(requested_from);
CREATE INDEX IF NOT EXISTS idx_document_requests_status ON document_requests(status);

CREATE INDEX IF NOT EXISTS idx_documents_booking_id ON documents(booking_id);
CREATE INDEX IF NOT EXISTS idx_documents_milestone_id ON documents(milestone_id);
CREATE INDEX IF NOT EXISTS idx_documents_task_id ON documents(task_id);
CREATE INDEX IF NOT EXISTS idx_documents_request_id ON documents(request_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);

CREATE INDEX IF NOT EXISTS idx_document_comments_document_id ON document_comments(document_id);
CREATE INDEX IF NOT EXISTS idx_document_comments_booking_id ON document_comments(booking_id);
CREATE INDEX IF NOT EXISTS idx_document_comments_author_id ON document_comments(author_id);

-- Insert default document categories
INSERT INTO document_categories (name, description, is_required) VALUES
('Project Requirements', 'Initial project requirements and specifications', true),
('Design Files', 'Design mockups, wireframes, and visual assets', false),
('Technical Documentation', 'Technical specifications and implementation details', true),
('Contracts & Agreements', 'Legal documents, contracts, and agreements', true),
('Progress Reports', 'Regular progress updates and status reports', false),
('Final Deliverables', 'Final project deliverables and handover documents', true),
('Client Assets', 'Client-provided assets and resources', false),
('Approval Documents', 'Sign-off and approval documents', true),
('Other', 'Miscellaneous documents and files', false)
ON CONFLICT DO NOTHING;

-- Row Level Security (RLS) Policies
ALTER TABLE document_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

-- Document Requests RLS Policies
CREATE POLICY "Users can view document requests for their bookings" ON document_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = document_requests.booking_id 
      AND (bookings.client_id = auth.uid() OR bookings.provider_id = auth.uid())
    )
  );

CREATE POLICY "Users can create document requests for their bookings" ON document_requests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = document_requests.booking_id 
      AND (bookings.client_id = auth.uid() OR bookings.provider_id = auth.uid())
    )
  );

CREATE POLICY "Users can update document requests they created" ON document_requests
  FOR UPDATE USING (requested_by = auth.uid());

-- Documents RLS Policies
CREATE POLICY "Users can view documents for their bookings" ON documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = documents.booking_id 
      AND (bookings.client_id = auth.uid() OR bookings.provider_id = auth.uid())
    )
  );

CREATE POLICY "Users can upload documents for their bookings" ON documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = documents.booking_id 
      AND (bookings.client_id = auth.uid() OR bookings.provider_id = auth.uid())
    )
  );

CREATE POLICY "Users can update documents they uploaded" ON documents
  FOR UPDATE USING (uploaded_by = auth.uid());

-- Document Comments RLS Policies
CREATE POLICY "Users can view document comments for their bookings" ON document_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = document_comments.booking_id 
      AND (bookings.client_id = auth.uid() OR bookings.provider_id = auth.uid())
    )
  );

CREATE POLICY "Users can create document comments for their bookings" ON document_comments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = document_comments.booking_id 
      AND (bookings.client_id = auth.uid() OR bookings.provider_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own document comments" ON document_comments
  FOR UPDATE USING (author_id = auth.uid());

-- Document Categories RLS Policies (Public read access)
CREATE POLICY "Anyone can view document categories" ON document_categories
  FOR SELECT USING (true);

-- Document Templates RLS Policies
CREATE POLICY "Users can view active document templates" ON document_templates
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can create document templates" ON document_templates
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- Create functions for document management
CREATE OR REPLACE FUNCTION update_document_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_document_requests_updated_at
  BEFORE UPDATE ON document_requests
  FOR EACH ROW EXECUTE FUNCTION update_document_updated_at();

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_document_updated_at();

CREATE TRIGGER update_document_comments_updated_at
  BEFORE UPDATE ON document_comments
  FOR EACH ROW EXECUTE FUNCTION update_document_updated_at();

CREATE TRIGGER update_document_categories_updated_at
  BEFORE UPDATE ON document_categories
  FOR EACH ROW EXECUTE FUNCTION update_document_updated_at();

CREATE TRIGGER update_document_templates_updated_at
  BEFORE UPDATE ON document_templates
  FOR EACH ROW EXECUTE FUNCTION update_document_updated_at();

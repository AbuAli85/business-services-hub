-- Create document categories table with all columns
CREATE TABLE IF NOT EXISTS document_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3B82F6',
  icon VARCHAR(50) DEFAULT 'file',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create document requests table
CREATE TABLE IF NOT EXISTS document_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES milestones(id) ON DELETE SET NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_from UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES document_categories(id) ON DELETE SET NULL,
  is_required BOOLEAN DEFAULT false,
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'uploaded', 'approved', 'rejected', 'cancelled')),
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES milestones(id) ON DELETE SET NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  request_id UUID REFERENCES document_requests(id) ON DELETE SET NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create document comments table
CREATE TABLE IF NOT EXISTS document_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default categories (now that the table exists with all columns)
INSERT INTO document_categories (name, description, color, icon) VALUES
  ('Contract', 'Legal contracts and agreements', '#EF4444', 'file-text'),
  ('Invoice', 'Billing and payment documents', '#10B981', 'receipt'),
  ('Report', 'Project reports and analytics', '#3B82F6', 'bar-chart'),
  ('Design', 'Design files and mockups', '#8B5CF6', 'palette'),
  ('Code', 'Source code and technical files', '#F59E0B', 'code'),
  ('Other', 'Other miscellaneous documents', '#6B7280', 'file')
ON CONFLICT (name) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_comments ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies
CREATE POLICY "Anyone can view categories" ON document_categories FOR SELECT USING (true);
CREATE POLICY "Users can view their booking requests" ON document_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM bookings WHERE id = booking_id AND (client_id = auth.uid() OR provider_id = auth.uid()))
);
CREATE POLICY "Users can view their booking documents" ON documents FOR SELECT USING (
  EXISTS (SELECT 1 FROM bookings WHERE id = booking_id AND (client_id = auth.uid() OR provider_id = auth.uid()))
);
CREATE POLICY "Users can view their document comments" ON document_comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM documents d JOIN bookings b ON d.booking_id = b.id WHERE d.id = document_id AND (b.client_id = auth.uid() OR b.provider_id = auth.uid()))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_document_requests_booking_id ON document_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_document_requests_requested_by ON document_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_documents_booking_id ON documents(booking_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_document_comments_document_id ON document_comments(document_id);

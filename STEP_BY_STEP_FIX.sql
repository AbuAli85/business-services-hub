-- Step 1: Add missing columns to existing table
ALTER TABLE document_categories 
ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#3B82F6',
ADD COLUMN IF NOT EXISTS icon VARCHAR(50) DEFAULT 'file';

-- Step 2: Now insert the default categories with all columns
INSERT INTO document_categories (name, description, color, icon) VALUES
  ('Contract', 'Legal contracts and agreements', '#EF4444', 'file-text'),
  ('Invoice', 'Billing and payment documents', '#10B981', 'receipt'),
  ('Report', 'Project reports and analytics', '#3B82F6', 'bar-chart'),
  ('Design', 'Design files and mockups', '#8B5CF6', 'palette'),
  ('Code', 'Source code and technical files', '#F59E0B', 'code'),
  ('Other', 'Other miscellaneous documents', '#6B7280', 'file')
ON CONFLICT (name) DO NOTHING;

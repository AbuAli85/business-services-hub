-- Enhanced Milestone System with Professional Linking and Dependencies
-- This script adds professional features for milestone and task management

-- Add milestone dependencies table
CREATE TABLE IF NOT EXISTS milestone_dependencies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  milestone_id UUID NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  depends_on_milestone_id UUID NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  dependency_type TEXT NOT NULL CHECK (dependency_type IN ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish')),
  lag_days INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(milestone_id, depends_on_milestone_id)
);

-- Add task dependencies table
CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  dependency_type TEXT NOT NULL CHECK (dependency_type IN ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish')),
  lag_days INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(task_id, depends_on_task_id)
);

-- Add milestone templates table
CREATE TABLE IF NOT EXISTS milestone_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  service_type TEXT,
  estimated_duration_days INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add milestone template tasks table
CREATE TABLE IF NOT EXISTS milestone_template_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES milestone_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  estimated_hours INTEGER DEFAULT 0,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add project phases table
CREATE TABLE IF NOT EXISTS project_phases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold')),
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add phase milestones table
CREATE TABLE IF NOT EXISTS phase_milestones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phase_id UUID NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,
  milestone_id UUID NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(phase_id, milestone_id)
);

-- Add enhanced fields to existing tables
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS phase_id UUID REFERENCES project_phases(id);
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES milestone_templates(id);
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS actual_start_date DATE;
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS actual_end_date DATE;
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100);
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS critical_path BOOLEAN DEFAULT false;
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical'));

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS phase_id UUID REFERENCES project_phases(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_start_date DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_end_date DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS critical_path BOOLEAN DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_milestone_dependencies_milestone_id ON milestone_dependencies(milestone_id);
CREATE INDEX IF NOT EXISTS idx_milestone_dependencies_depends_on ON milestone_dependencies(depends_on_milestone_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_task_id ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on ON task_dependencies(depends_on_task_id);
CREATE INDEX IF NOT EXISTS idx_milestone_templates_service_type ON milestone_templates(service_type);
CREATE INDEX IF NOT EXISTS idx_project_phases_booking_id ON project_phases(booking_id);
CREATE INDEX IF NOT EXISTS idx_phase_milestones_phase_id ON phase_milestones(phase_id);
CREATE INDEX IF NOT EXISTS idx_milestones_phase_id ON milestones(phase_id);
CREATE INDEX IF NOT EXISTS idx_tasks_phase_id ON tasks(phase_id);

-- Enable Row Level Security
ALTER TABLE milestone_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_template_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase_milestones ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for milestone_dependencies
CREATE POLICY "Users can view milestone dependencies for their bookings" ON milestone_dependencies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM milestones m
      JOIN bookings b ON b.id = m.booking_id
      WHERE m.id = milestone_dependencies.milestone_id
      AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage milestone dependencies for their bookings" ON milestone_dependencies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM milestones m
      JOIN bookings b ON b.id = m.booking_id
      WHERE m.id = milestone_dependencies.milestone_id
      AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

-- Create RLS policies for task_dependencies
CREATE POLICY "Users can view task dependencies for their bookings" ON task_dependencies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN milestones m ON m.id = t.milestone_id
      JOIN bookings b ON b.id = m.booking_id
      WHERE t.id = task_dependencies.task_id
      AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage task dependencies for their bookings" ON task_dependencies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN milestones m ON m.id = t.milestone_id
      JOIN bookings b ON b.id = m.booking_id
      WHERE t.id = task_dependencies.task_id
      AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

-- Create RLS policies for milestone_templates
CREATE POLICY "Users can view milestone templates" ON milestone_templates
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can manage milestone templates" ON milestone_templates
  FOR ALL USING (created_by = auth.uid() OR auth.role() = 'admin');

-- Create RLS policies for project_phases
CREATE POLICY "Users can view project phases for their bookings" ON project_phases
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = project_phases.booking_id
      AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage project phases for their bookings" ON project_phases
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = project_phases.booking_id
      AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

-- Create RLS policies for phase_milestones
CREATE POLICY "Users can view phase milestones for their bookings" ON phase_milestones
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_phases pp
      JOIN bookings b ON b.id = pp.booking_id
      WHERE pp.id = phase_milestones.phase_id
      AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage phase milestones for their bookings" ON phase_milestones
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM project_phases pp
      JOIN bookings b ON b.id = pp.booking_id
      WHERE pp.id = phase_milestones.phase_id
      AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

-- Add updated_at triggers
CREATE TRIGGER update_milestone_dependencies_updated_at 
  BEFORE UPDATE ON milestone_dependencies 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_dependencies_updated_at 
  BEFORE UPDATE ON task_dependencies 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_milestone_templates_updated_at 
  BEFORE UPDATE ON milestone_templates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_phases_updated_at 
  BEFORE UPDATE ON project_phases 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample milestone templates
INSERT INTO milestone_templates (name, description, service_type, estimated_duration_days, is_active) VALUES
('Website Development', 'Complete website development project', 'web_development', 30, true),
('Digital Marketing Campaign', 'Full digital marketing campaign setup', 'digital_marketing', 45, true),
('Mobile App Development', 'Mobile application development project', 'mobile_development', 60, true),
('E-commerce Setup', 'E-commerce platform setup and configuration', 'ecommerce', 25, true);

-- Insert sample template tasks for Website Development
INSERT INTO milestone_template_tasks (template_id, title, description, estimated_hours, priority, order_index)
SELECT 
  mt.id,
  'Project Planning & Requirements',
  'Gather requirements and create project plan',
  8,
  'high',
  1
FROM milestone_templates mt WHERE mt.name = 'Website Development';

INSERT INTO milestone_template_tasks (template_id, title, description, estimated_hours, priority, order_index)
SELECT 
  mt.id,
  'Design & Wireframing',
  'Create wireframes and design mockups',
  16,
  'high',
  2
FROM milestone_templates mt WHERE mt.name = 'Website Development';

INSERT INTO milestone_template_tasks (template_id, title, description, estimated_hours, priority, order_index)
SELECT 
  mt.id,
  'Frontend Development',
  'Develop the frontend interface',
  40,
  'high',
  3
FROM milestone_templates mt WHERE mt.name = 'Website Development';

INSERT INTO milestone_template_tasks (template_id, title, description, estimated_hours, priority, order_index)
SELECT 
  mt.id,
  'Backend Development',
  'Develop the backend functionality',
  32,
  'high',
  4
FROM milestone_templates mt WHERE mt.name = 'Website Development';

INSERT INTO milestone_template_tasks (template_id, title, description, estimated_hours, priority, order_index)
SELECT 
  mt.id,
  'Testing & Quality Assurance',
  'Test all functionality and fix bugs',
  16,
  'medium',
  5
FROM milestone_templates mt WHERE mt.name = 'Website Development';

INSERT INTO milestone_template_tasks (template_id, title, description, estimated_hours, priority, order_index)
SELECT 
  mt.id,
  'Deployment & Launch',
  'Deploy to production and launch',
  8,
  'high',
  6
FROM milestone_templates mt WHERE mt.name = 'Website Development';

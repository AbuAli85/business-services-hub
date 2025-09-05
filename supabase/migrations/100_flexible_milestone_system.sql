-- Migration: Flexible Milestone System
-- This migration refactors the progress tracking system to support flexible milestones per service type

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Services Table
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for services table
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read services
CREATE POLICY "Allow read access to services" ON services
    FOR SELECT USING (true);

-- Allow authenticated users to insert/update services (for admin use)
CREATE POLICY "Allow insert access to services" ON services
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update access to services" ON services
    FOR UPDATE USING (true);

-- 2. Create Service Milestone Templates Table
CREATE TABLE IF NOT EXISTS service_milestone_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    default_weight NUMERIC DEFAULT 1,
    default_order INTEGER,
    is_required BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for service_milestone_templates table
ALTER TABLE service_milestone_templates ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read templates
CREATE POLICY "Allow read access to service_milestone_templates" ON service_milestone_templates
    FOR SELECT USING (true);

-- Allow authenticated users to insert/update templates (for admin use)
CREATE POLICY "Allow insert access to service_milestone_templates" ON service_milestone_templates
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update access to service_milestone_templates" ON service_milestone_templates
    FOR UPDATE USING (true);

-- 3. Update Bookings Table - Add service_id column
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES services(id);

-- 4. Update Milestones Table - Add editable column and ensure proper structure
ALTER TABLE milestones 
ADD COLUMN IF NOT EXISTS editable BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS weight NUMERIC DEFAULT 1,
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- 5. Update Tasks Table - Add editable column
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS editable BOOLEAN DEFAULT true;

-- 6. Create Function to Generate Milestones from Templates
CREATE OR REPLACE FUNCTION generate_milestones_from_templates(booking_uuid UUID)
RETURNS VOID AS $$
DECLARE
    booking_service_id UUID;
    template_record RECORD;
    milestone_count INTEGER := 0;
BEGIN
    -- Get the service_id for this booking
    SELECT service_id INTO booking_service_id
    FROM bookings
    WHERE id = booking_uuid;
    
    -- If no service_id, exit
    IF booking_service_id IS NULL THEN
        RAISE NOTICE 'No service_id found for booking %', booking_uuid;
        RETURN;
    END IF;
    
    -- Insert milestones from templates
    FOR template_record IN
        SELECT title, description, default_weight, default_order, is_required
        FROM service_milestone_templates
        WHERE service_id = booking_service_id
        ORDER BY default_order ASC, title ASC
    LOOP
        INSERT INTO milestones (
            booking_id,
            title,
            description,
            weight,
            order_index,
            status,
            progress_percentage,
            editable,
            created_at,
            updated_at
        ) VALUES (
            booking_uuid,
            template_record.title,
            template_record.description,
            template_record.default_weight,
            template_record.default_order,
            'pending',
            0,
            true,
            NOW(),
            NOW()
        );
        
        milestone_count := milestone_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Generated % milestones for booking %', milestone_count, booking_uuid;
END;
$$ LANGUAGE plpgsql;

-- 7. Update calculate_booking_progress function to use progress_percentage
CREATE OR REPLACE FUNCTION calculate_booking_progress(booking_id UUID)
RETURNS INTEGER AS $$
DECLARE
    total_progress INTEGER;
    milestone_count INTEGER;
    weighted_progress NUMERIC := 0;
    total_weight NUMERIC := 0;
    milestone_record RECORD;
BEGIN
    -- Calculate weighted progress across all milestones for this booking
    FOR milestone_record IN
        SELECT progress_percentage, weight
        FROM milestones
        WHERE booking_id = calculate_booking_progress.booking_id
    LOOP
        weighted_progress := weighted_progress + (milestone_record.progress_percentage * milestone_record.weight);
        total_weight := total_weight + milestone_record.weight;
        milestone_count := milestone_count + 1;
    END LOOP;
    
    -- Calculate average progress
    IF total_weight > 0 THEN
        total_progress := ROUND(weighted_progress / total_weight);
    ELSE
        total_progress := 0;
    END IF;
    
    -- Return 0 if no milestones exist
    IF milestone_count = 0 THEN
        total_progress := 0;
    END IF;
    
    -- Update the bookings table with the calculated progress
    UPDATE bookings 
    SET project_progress = total_progress,
        updated_at = NOW()
    WHERE id = calculate_booking_progress.booking_id;
    
    RETURN total_progress;
END;
$$ LANGUAGE plpgsql;

-- 8. Update update_milestone_progress function to use progress_percentage
CREATE OR REPLACE FUNCTION update_milestone_progress(milestone_uuid UUID)
RETURNS VOID AS $$
DECLARE
    total_steps INTEGER;
    completed_steps INTEGER;
    new_progress INTEGER;
    booking_uuid UUID;
BEGIN
    -- Get the booking_id for this milestone
    SELECT booking_id INTO booking_uuid
    FROM milestones
    WHERE id = milestone_uuid;
    
    -- Count total and completed tasks for this milestone
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'completed')
    INTO total_steps, completed_steps
    FROM tasks
    WHERE milestone_id = milestone_uuid;
    
    -- Calculate progress percentage
    IF total_steps > 0 THEN
        new_progress := ROUND((completed_steps * 100.0) / total_steps);
    ELSE
        new_progress := 0;
    END IF;
    
    -- Update the milestone progress
    UPDATE milestones
    SET progress_percentage = new_progress,
        updated_at = NOW()
    WHERE id = milestone_uuid;
    
    -- Recalculate and sync overall booking progress
    PERFORM calculate_booking_progress(booking_uuid);
END;
$$ LANGUAGE plpgsql;

-- 9. Create Trigger for Auto-Generating Milestones on Booking Creation
CREATE OR REPLACE FUNCTION trigger_generate_milestones()
RETURNS TRIGGER AS $$
BEGIN
    -- Only generate milestones if service_id is provided
    IF NEW.service_id IS NOT NULL THEN
        PERFORM generate_milestones_from_templates(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_generate_milestones ON bookings;

-- Create the trigger
CREATE TRIGGER trigger_auto_generate_milestones
    AFTER INSERT ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION trigger_generate_milestones();

-- 10. Create Trigger for Updating Milestone Progress When Tasks Change
CREATE OR REPLACE FUNCTION trigger_update_milestone_progress()
RETURNS TRIGGER AS $$
DECLARE
    milestone_id UUID;
BEGIN
    -- Get milestone_id from the task
    IF TG_OP = 'DELETE' THEN
        milestone_id := OLD.milestone_id;
    ELSE
        milestone_id := NEW.milestone_id;
    END IF;
    
    -- Update milestone progress
    PERFORM update_milestone_progress(milestone_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_update_milestone_progress_insert ON tasks;
DROP TRIGGER IF EXISTS trigger_update_milestone_progress_update ON tasks;
DROP TRIGGER IF EXISTS trigger_update_milestone_progress_delete ON tasks;

-- Create triggers for task changes
CREATE TRIGGER trigger_update_milestone_progress_insert
    AFTER INSERT ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_milestone_progress();

CREATE TRIGGER trigger_update_milestone_progress_update
    AFTER UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_milestone_progress();

CREATE TRIGGER trigger_update_milestone_progress_delete
    AFTER DELETE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_milestone_progress();

-- 11. Insert Sample Services
INSERT INTO services (name, description) VALUES
('Social Media Management', 'Complete social media management including content creation, posting, and engagement'),
('Web Development', 'Custom website development and maintenance'),
('SEO Services', 'Search engine optimization and digital marketing'),
('Content Marketing', 'Content creation and marketing strategy'),
('Digital Marketing Audit', 'Comprehensive digital marketing analysis and recommendations')
ON CONFLICT (name) DO NOTHING;

-- 12. Insert Sample Milestone Templates for Social Media Management
INSERT INTO service_milestone_templates (service_id, title, description, default_weight, default_order, is_required)
SELECT 
    s.id,
    template_data.title,
    template_data.description,
    template_data.default_weight,
    template_data.default_order,
    template_data.is_required
FROM services s
CROSS JOIN (VALUES
    ('Week 1: Strategy & Planning', 'Develop social media strategy and content calendar', 1.0, 1, true),
    ('Week 2: Content Creation', 'Create visual content and copy for all platforms', 1.0, 2, true),
    ('Week 3: Content Publishing', 'Schedule and publish content across all platforms', 1.0, 3, true),
    ('Week 4: Engagement & Monitoring', 'Monitor engagement and respond to comments', 1.0, 4, true),
    ('Monthly: Analytics & Reporting', 'Generate monthly performance reports', 1.0, 5, true)
) AS template_data(title, description, default_weight, default_order, is_required)
WHERE s.name = 'Social Media Management'
ON CONFLICT (service_id, title) DO NOTHING;

-- 13. Insert Sample Milestone Templates for Web Development
INSERT INTO service_milestone_templates (service_id, title, description, default_weight, default_order, is_required)
SELECT 
    s.id,
    template_data.title,
    template_data.description,
    template_data.default_weight,
    template_data.default_order,
    template_data.is_required
FROM services s
CROSS JOIN (VALUES
    ('Phase 1: Requirements & Planning', 'Gather requirements and create project plan', 1.0, 1, true),
    ('Phase 2: Design & Wireframing', 'Create wireframes and visual designs', 1.0, 2, true),
    ('Phase 3: Development', 'Build the website with all features', 1.0, 3, true),
    ('Phase 4: Testing & Quality Assurance', 'Test all functionality and fix bugs', 1.0, 4, true),
    ('Phase 5: Launch & Deployment', 'Deploy website and go live', 1.0, 5, true),
    ('Phase 6: Maintenance & Support', 'Ongoing maintenance and support', 0.5, 6, false)
) AS template_data(title, description, default_weight, default_order, is_required)
WHERE s.name = 'Web Development'
ON CONFLICT (service_id, title) DO NOTHING;

-- 14. Insert Sample Milestone Templates for SEO Services
INSERT INTO service_milestone_templates (service_id, title, description, default_weight, default_order, is_required)
SELECT 
    s.id,
    template_data.title,
    template_data.description,
    template_data.default_weight,
    template_data.default_order,
    template_data.is_required
FROM services s
CROSS JOIN (VALUES
    ('Week 1: SEO Audit', 'Conduct comprehensive SEO audit and analysis', 1.0, 1, true),
    ('Week 2: Keyword Research', 'Research and identify target keywords', 1.0, 2, true),
    ('Week 3: On-Page Optimization', 'Optimize on-page elements and content', 1.0, 3, true),
    ('Week 4: Technical SEO', 'Fix technical SEO issues and improve site speed', 1.0, 4, true),
    ('Month 2: Link Building', 'Build high-quality backlinks', 1.0, 5, true),
    ('Month 3: Monitoring & Reporting', 'Monitor rankings and generate reports', 1.0, 6, true)
) AS template_data(title, description, default_weight, default_order, is_required)
WHERE s.name = 'SEO Services'
ON CONFLICT (service_id, title) DO NOTHING;

-- 15. Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_milestones_booking_id ON milestones(booking_id);
CREATE INDEX IF NOT EXISTS idx_milestones_service_id ON milestones(booking_id) WHERE booking_id IN (SELECT id FROM bookings WHERE service_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_tasks_milestone_id ON tasks(milestone_id);
CREATE INDEX IF NOT EXISTS idx_service_milestone_templates_service_id ON service_milestone_templates(service_id);
CREATE INDEX IF NOT EXISTS idx_bookings_service_id ON bookings(service_id);

-- 16. Add Comments for Documentation
COMMENT ON TABLE services IS 'Available service types for bookings';
COMMENT ON TABLE service_milestone_templates IS 'Default milestone templates for each service type';
COMMENT ON COLUMN milestones.editable IS 'Whether this milestone can be edited by providers';
COMMENT ON COLUMN milestones.weight IS 'Weight of this milestone in progress calculation';
COMMENT ON COLUMN tasks.editable IS 'Whether this task can be edited by providers';
COMMENT ON FUNCTION generate_milestones_from_templates(UUID) IS 'Generates milestones for a booking based on service templates';
COMMENT ON FUNCTION calculate_booking_progress(UUID) IS 'Calculates weighted progress across all milestones for a booking';
COMMENT ON FUNCTION update_milestone_progress(UUID) IS 'Updates milestone progress based on task completion';
